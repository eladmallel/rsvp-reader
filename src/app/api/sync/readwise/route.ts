import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { createReaderClient, ReaderApiException } from '@/lib/reader';
import { htmlToPlainText } from '@/lib/reader/html';
import type { Database, Json } from '@/lib/supabase/types';

const MAX_REQUESTS_PER_MINUTE = 20;
const WINDOW_MS = 60 * 1000;
const PAGE_SIZE = 100;
const PAGE_CURSOR_PREFIX = 'page:';
const UPDATED_AFTER_PREFIX = 'updated:';

type SyncState = Database['public']['Tables']['readwise_sync_state']['Row'];
type SyncStateWithUser = SyncState & { users: { reader_access_token: string | null } | null };

class BudgetExceededError extends Error {
  constructor() {
    super('Request budget exceeded');
    this.name = 'BudgetExceededError';
  }
}

class RequestBudget {
  private count: number;

  constructor(
    initialCount: number,
    private limit: number
  ) {
    this.count = initialCount;
  }

  canRequest(): boolean {
    return this.count < this.limit;
  }

  remaining(): number {
    return Math.max(this.limit - this.count, 0);
  }

  used(): number {
    return this.count;
  }

  async track<T>(fn: () => Promise<T>): Promise<T> {
    if (!this.canRequest()) {
      throw new BudgetExceededError();
    }

    this.count += 1;
    return fn();
  }
}

interface CursorState {
  pageCursor?: string;
  updatedAfter?: string;
  isPageCursor: boolean;
}

interface SyncLocationResult {
  nextCursor: string | null;
  latestUpdatedAt: string | null;
  completed: boolean;
}

export async function GET(request: NextRequest): Promise<NextResponse> {
  const secret = process.env.SYNC_API_KEY;
  const token =
    request.nextUrl.searchParams.get('token') ?? request.headers.get('x-readwise-sync-secret');

  if (!secret) {
    return NextResponse.json({ error: 'SYNC_API_KEY is not configured' }, { status: 500 });
  }

  if (token !== secret) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const supabase = createAdminClient();
  const now = new Date();
  const nowIso = now.toISOString();

  const { data: states, error } = await supabase
    .from('readwise_sync_state')
    .select(
      'user_id, library_cursor, inbox_cursor, feed_cursor, next_allowed_at, last_sync_at, in_progress, initial_backfill_done, window_started_at, window_request_count, last_429_at, users (reader_access_token)'
    )
    .eq('in_progress', false)
    .or(`next_allowed_at.is.null,next_allowed_at.lte.${nowIso}`);

  if (error) {
    console.error('Failed to fetch sync state:', error);
    return NextResponse.json({ error: 'Failed to fetch sync state' }, { status: 500 });
  }

  const results: Array<{ userId: string; status: string }> = [];

  for (const state of (states ?? []) as SyncStateWithUser[]) {
    const userToken = state.users?.reader_access_token;

    if (!userToken) {
      continue;
    }

    const { data: lockedState, error: lockError } = await supabase
      .from('readwise_sync_state')
      .update({ in_progress: true })
      .eq('user_id', state.user_id)
      .eq('in_progress', false)
      .or(`next_allowed_at.is.null,next_allowed_at.lte.${nowIso}`)
      .select()
      .single();

    if (lockError || !lockedState) {
      continue;
    }

    try {
      const update = await syncUser({
        supabase,
        state: lockedState,
        userToken,
        now,
      });

      const { error: updateError } = await supabase
        .from('readwise_sync_state')
        .update({
          ...update,
          in_progress: false,
          last_sync_at: nowIso,
        })
        .eq('user_id', lockedState.user_id);

      if (updateError) {
        console.error('Failed to update sync state:', updateError);
        results.push({ userId: lockedState.user_id, status: 'update_failed' });
      } else {
        results.push({ userId: lockedState.user_id, status: 'ok' });
      }
    } catch (syncError) {
      console.error('Readwise sync failed:', syncError);

      const { error: resetError } = await supabase
        .from('readwise_sync_state')
        .update({
          in_progress: false,
          next_allowed_at: new Date(now.getTime() + WINDOW_MS).toISOString(),
        })
        .eq('user_id', lockedState.user_id);

      if (resetError) {
        console.error('Failed to reset sync state:', resetError);
      }

      results.push({ userId: lockedState.user_id, status: 'sync_failed' });
    }
  }

  return NextResponse.json({ ok: true, results });
}

async function syncUser({
  supabase,
  state,
  userToken,
  now,
}: {
  supabase: ReturnType<typeof createAdminClient>;
  state: SyncState;
  userToken: string;
  now: Date;
}): Promise<Database['public']['Tables']['readwise_sync_state']['Update']> {
  const readerClient = createReaderClient(userToken);
  const window = normalizeWindow(state.window_started_at, state.window_request_count, now);
  const budget = new RequestBudget(window.windowRequestCount, MAX_REQUESTS_PER_MINUTE);

  if (!budget.canRequest()) {
    return {
      next_allowed_at: window.windowStartedAt
        ? new Date(window.windowStartedAt.getTime() + WINDOW_MS).toISOString()
        : new Date(now.getTime() + WINDOW_MS).toISOString(),
      window_started_at: window.windowStartedAt?.toISOString() ?? null,
      window_request_count: budget.used(),
    };
  }

  const inboxDone = isTimestamp(state.inbox_cursor);
  const libraryDone = isTimestamp(state.library_cursor);
  const feedDone = isTimestamp(state.feed_cursor);
  const updates: Database['public']['Tables']['readwise_sync_state']['Update'] = {
    inbox_cursor: state.inbox_cursor,
    library_cursor: state.library_cursor,
    feed_cursor: state.feed_cursor,
    initial_backfill_done: state.initial_backfill_done,
    window_started_at: window.windowStartedAt?.toISOString() ?? null,
    window_request_count: budget.used(),
  };

  let nextAllowedAt: string | null = state.next_allowed_at ?? null;
  let last429At: string | null = state.last_429_at ?? null;

  try {
    if (!state.initial_backfill_done) {
      let inboxComplete = inboxDone;
      let libraryComplete = libraryDone;
      let feedComplete = feedDone;

      if (!inboxComplete) {
        const inboxResult = await syncLocation({
          supabase,
          readerClient,
          budget,
          userId: state.user_id,
          location: 'new',
          mode: 'initial',
          cursorValue: state.inbox_cursor,
        });
        updates.inbox_cursor = inboxResult.nextCursor;
        updates.window_request_count = budget.used();
        inboxComplete = inboxResult.completed;
      }

      if (inboxComplete && budget.remaining() > 0 && !libraryComplete) {
        const libraryResult = await syncLocation({
          supabase,
          readerClient,
          budget,
          userId: state.user_id,
          location: 'later',
          mode: 'initial',
          cursorValue: state.library_cursor,
        });
        updates.library_cursor = libraryResult.nextCursor;
        updates.window_request_count = budget.used();
        libraryComplete = libraryResult.completed;
      }

      if (inboxComplete && libraryComplete && budget.remaining() > 0 && !feedComplete) {
        const feedResult = await syncLocation({
          supabase,
          readerClient,
          budget,
          userId: state.user_id,
          location: 'feed',
          mode: 'initial',
          cursorValue: state.feed_cursor,
        });
        updates.feed_cursor = feedResult.nextCursor;
        updates.window_request_count = budget.used();
        feedComplete = feedResult.completed;
      }

      if (inboxComplete && libraryComplete && feedComplete) {
        updates.initial_backfill_done = true;
      }
    } else {
      const locations: Array<{
        location: 'new' | 'later' | 'feed';
        cursorValue: string | null;
        setCursor: (value: string | null) => void;
      }> = [
        {
          location: 'new',
          cursorValue: state.inbox_cursor,
          setCursor: (value) => {
            updates.inbox_cursor = value;
          },
        },
        {
          location: 'later',
          cursorValue: state.library_cursor,
          setCursor: (value) => {
            updates.library_cursor = value;
          },
        },
        {
          location: 'feed',
          cursorValue: state.feed_cursor,
          setCursor: (value) => {
            updates.feed_cursor = value;
          },
        },
      ];

      for (const entry of locations) {
        if (!budget.canRequest()) {
          break;
        }

        const result = await syncLocation({
          supabase,
          readerClient,
          budget,
          userId: state.user_id,
          location: entry.location,
          mode: 'incremental',
          cursorValue: entry.cursorValue,
        });
        entry.setCursor(result.nextCursor);
        updates.window_request_count = budget.used();
      }
    }
  } catch (error) {
    if (error instanceof ReaderApiException && error.status === 429) {
      last429At = now.toISOString();
      nextAllowedAt = error.retryAfterSeconds
        ? new Date(now.getTime() + error.retryAfterSeconds * 1000).toISOString()
        : window.windowStartedAt
          ? new Date(window.windowStartedAt.getTime() + WINDOW_MS).toISOString()
          : new Date(now.getTime() + WINDOW_MS).toISOString();
      updates.window_request_count = budget.used();
    } else if (error instanceof BudgetExceededError) {
      nextAllowedAt = window.windowStartedAt
        ? new Date(window.windowStartedAt.getTime() + WINDOW_MS).toISOString()
        : new Date(now.getTime() + WINDOW_MS).toISOString();
    } else {
      nextAllowedAt = new Date(now.getTime() + WINDOW_MS).toISOString();
      throw error;
    }
  }

  if (budget.used() >= MAX_REQUESTS_PER_MINUTE) {
    nextAllowedAt = window.windowStartedAt
      ? new Date(window.windowStartedAt.getTime() + WINDOW_MS).toISOString()
      : new Date(now.getTime() + WINDOW_MS).toISOString();
  }

  return {
    ...updates,
    next_allowed_at: nextAllowedAt,
    last_429_at: last429At,
    window_started_at: window.windowStartedAt?.toISOString() ?? null,
    window_request_count: budget.used(),
  };
}

function normalizeWindow(
  windowStartedAt: string | null,
  windowRequestCount: number | null,
  now: Date
) {
  if (!windowStartedAt) {
    return {
      windowStartedAt: now,
      windowRequestCount: 0,
    };
  }

  const startedAt = new Date(windowStartedAt);

  if (now.getTime() - startedAt.getTime() >= WINDOW_MS) {
    return {
      windowStartedAt: now,
      windowRequestCount: 0,
    };
  }

  return {
    windowStartedAt: startedAt,
    windowRequestCount: windowRequestCount ?? 0,
  };
}

async function syncLocation({
  supabase,
  readerClient,
  budget,
  userId,
  location,
  mode,
  cursorValue,
}: {
  supabase: ReturnType<typeof createAdminClient>;
  readerClient: ReturnType<typeof createReaderClient>;
  budget: RequestBudget;
  userId: string;
  location: 'new' | 'later' | 'feed';
  mode: 'initial' | 'incremental';
  cursorValue: string | null;
}): Promise<SyncLocationResult> {
  const cursorState = parseCursor(cursorValue);
  const updatedAfter =
    mode === 'incremental'
      ? (cursorState.updatedAfter ??
        (!cursorState.isPageCursor ? (cursorValue ?? undefined) : undefined))
      : undefined;
  let pageCursor = cursorState.pageCursor;
  let latestUpdatedAt: string | null = null;
  let completed = false;

  while (true) {
    if (!budget.canRequest()) {
      break;
    }

    const response = await budget.track(() =>
      readerClient.listDocuments({
        location,
        pageCursor: pageCursor ?? undefined,
        pageSize: PAGE_SIZE,
        updatedAfter,
        withHtmlContent: true,
      })
    );

    let deferredForBudget = false;

    for (const doc of response.results) {
      let html =
        'html_content' in doc && typeof doc.html_content === 'string' ? doc.html_content : null;

      if (!html) {
        if (!budget.canRequest()) {
          deferredForBudget = true;
          break;
        }

        const withContent = await budget.track(() => readerClient.getDocument(doc.id, true));
        html =
          'html_content' in withContent && typeof withContent.html_content === 'string'
            ? withContent.html_content
            : null;
      }

      const plainText = html ? htmlToPlainText(html) : null;

      // Cache article content
      const { error: cacheError } = await supabase.from('cached_articles').upsert(
        {
          user_id: userId,
          reader_document_id: doc.id,
          html_content: html,
          plain_text: plainText,
          word_count: doc.word_count,
          reader_updated_at: doc.updated_at,
          cached_at: new Date().toISOString(),
        },
        {
          onConflict: 'user_id,reader_document_id',
        }
      );

      if (cacheError) {
        throw new Error(`Failed to cache article content ${doc.id}`);
      }

      // Cache document metadata for library view
      const { error: metaError } = await supabase.from('cached_documents').upsert(
        {
          user_id: userId,
          reader_document_id: doc.id,
          title: doc.title,
          author: doc.author,
          source: doc.source,
          site_name: doc.site_name,
          url: doc.url,
          source_url: doc.source_url,
          category: doc.category,
          location: doc.location,
          tags: (doc.tags ?? {}) as unknown as Json,
          word_count: doc.word_count,
          reading_progress: doc.reading_progress,
          summary: doc.summary,
          image_url: doc.image_url,
          published_date: doc.published_date,
          reader_created_at: doc.created_at,
          reader_last_moved_at: doc.last_moved_at,
          reader_saved_at: doc.saved_at,
          reader_updated_at: doc.updated_at,
          cached_at: new Date().toISOString(),
        },
        {
          onConflict: 'user_id,reader_document_id',
        }
      );

      if (metaError) {
        throw new Error(`Failed to cache document metadata ${doc.id}`);
      }

      latestUpdatedAt = maxIso(latestUpdatedAt, doc.updated_at);
    }

    if (deferredForBudget) {
      return {
        nextCursor: cursorValue,
        latestUpdatedAt,
        completed: false,
      };
    }

    if (!response.nextPageCursor) {
      completed = true;
      break;
    }

    pageCursor = response.nextPageCursor;
  }

  if (completed) {
    const fallbackCursor = latestUpdatedAt ?? updatedAfter ?? new Date().toISOString();
    return {
      nextCursor: fallbackCursor,
      latestUpdatedAt,
      completed: true,
    };
  }

  if (pageCursor) {
    return {
      nextCursor: formatPageCursor(pageCursor, updatedAfter),
      latestUpdatedAt,
      completed: false,
    };
  }

  return {
    nextCursor: cursorValue,
    latestUpdatedAt,
    completed: false,
  };
}

function parseCursor(cursorValue: string | null): CursorState {
  if (!cursorValue) {
    return { isPageCursor: false };
  }

  if (!cursorValue.startsWith(PAGE_CURSOR_PREFIX)) {
    return { updatedAfter: cursorValue, isPageCursor: false };
  }

  const parts = cursorValue.split('|');
  const pageCursor = parts[0].slice(PAGE_CURSOR_PREFIX.length);
  let updatedAfter: string | undefined;

  for (const part of parts.slice(1)) {
    if (part.startsWith(UPDATED_AFTER_PREFIX)) {
      updatedAfter = part.slice(UPDATED_AFTER_PREFIX.length);
    }
  }

  return {
    pageCursor,
    updatedAfter,
    isPageCursor: true,
  };
}

function formatPageCursor(pageCursor: string, updatedAfter?: string) {
  if (!updatedAfter) {
    return `${PAGE_CURSOR_PREFIX}${pageCursor}`;
  }

  return `${PAGE_CURSOR_PREFIX}${pageCursor}|${UPDATED_AFTER_PREFIX}${updatedAfter}`;
}

function isTimestamp(value: string | null): boolean {
  if (!value || value.startsWith(PAGE_CURSOR_PREFIX)) {
    return false;
  }

  return !Number.isNaN(Date.parse(value));
}

function maxIso(a: string | null, b: string | null): string | null {
  if (!a) {
    return b;
  }

  if (!b) {
    return a;
  }

  return new Date(a) > new Date(b) ? a : b;
}
