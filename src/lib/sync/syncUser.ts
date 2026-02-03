/**
 * Shared Readwise sync logic for both manual and automated syncs
 */

import { createAdminClient } from '@/lib/supabase/admin';
import { createReaderClient, ReaderApiException } from '@/lib/reader';
import { htmlToPlainText } from '@/lib/reader/html';
import type { Database, Json } from '@/lib/supabase/types';

export const DEFAULT_MAX_REQUESTS_PER_MINUTE = 20;
export const WINDOW_MS = 60 * 1000;
const DEFAULT_PAGE_SIZE = 100;

export function getMaxRequestsPerMinute(): number {
  const override = process.env.READWISE_SYNC_MAX_REQUESTS_OVERRIDE;
  if (override) {
    const parsed = parseInt(override, 10);
    if (!isNaN(parsed) && parsed > 0) {
      return parsed;
    }
  }
  return DEFAULT_MAX_REQUESTS_PER_MINUTE;
}

export function getPageSize(): number {
  const override = process.env.READWISE_SYNC_PAGE_SIZE_OVERRIDE;
  if (override) {
    const parsed = parseInt(override, 10);
    if (!isNaN(parsed) && parsed > 0) {
      return parsed;
    }
  }
  return DEFAULT_PAGE_SIZE;
}
const PAGE_CURSOR_PREFIX = 'page:';
const UPDATED_AFTER_PREFIX = 'updated:';
const SYNC_LOCATIONS = ['new', 'later', 'feed', 'archive', 'shortlist'] as const;

type SyncLocation = (typeof SYNC_LOCATIONS)[number];

type SyncState = Database['public']['Tables']['readwise_sync_state']['Row'];

export class BudgetExceededError extends Error {
  constructor() {
    super('Request budget exceeded');
    this.name = 'BudgetExceededError';
  }
}

export class RequestBudget {
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

function getAllowedSyncLocations(): { locations: SyncLocation[]; overridden: boolean } {
  const raw = process.env.READWISE_SYNC_LOCATION_OVERRIDE;

  if (!raw) {
    return { locations: [...SYNC_LOCATIONS], overridden: false };
  }

  const allowed = raw
    .split(',')
    .map((value) => value.trim())
    .filter(Boolean);

  const filtered = allowed.filter((value): value is SyncLocation =>
    SYNC_LOCATIONS.includes(value as SyncLocation)
  );

  return {
    locations: filtered.length > 0 ? filtered : [...SYNC_LOCATIONS],
    overridden: true,
  };
}

export async function syncUser({
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
  console.log('[syncUser] Starting sync for user:', state.user_id);
  console.log('[syncUser] Initial backfill done:', state.initial_backfill_done);
  console.log(
    '[syncUser] Cursors - inbox:',
    state.inbox_cursor,
    'library:',
    state.library_cursor,
    'feed:',
    state.feed_cursor,
    'archive:',
    state.archive_cursor,
    'shortlist:',
    state.shortlist_cursor
  );

  const readerClient = createReaderClient(userToken);
  const window = normalizeWindow(state.window_started_at, state.window_request_count, now);
  const maxRequests = getMaxRequestsPerMinute();
  const budget = new RequestBudget(window.windowRequestCount, maxRequests);
  const { locations: allowedLocations, overridden } = getAllowedSyncLocations();
  const isLocationAllowed = (location: SyncLocation) => allowedLocations.includes(location);

  if (overridden) {
    console.log('[syncUser] Limiting sync locations to:', allowedLocations.join(', '));
  }

  console.log(
    `[syncUser] Budget - max: ${maxRequests}, used: ${budget.used()}, remaining: ${budget.remaining()}`
  );

  if (!budget.canRequest()) {
    console.log('[syncUser] No budget remaining, returning early');
    return {
      next_allowed_at: window.windowStartedAt
        ? new Date(window.windowStartedAt.getTime() + WINDOW_MS).toISOString()
        : new Date(now.getTime() + WINDOW_MS).toISOString(),
      window_started_at: window.windowStartedAt?.toISOString() ?? null,
      window_request_count: budget.used(),
    };
  }

  // Detect and fix corrupted cursors: during initial backfill, a timestamp cursor
  // without a page prefix means the location was incorrectly marked as complete
  // (this was a bug where budget exhaustion saved raw timestamps instead of page cursors)
  const fixedCursors = fixCorruptedCursors({
    initialBackfillDone: state.initial_backfill_done ?? false,
    inboxCursor: state.inbox_cursor,
    libraryCursor: state.library_cursor,
    feedCursor: state.feed_cursor,
    archiveCursor: state.archive_cursor,
    shortlistCursor: state.shortlist_cursor,
  });

  const inboxDone = isTimestamp(fixedCursors.inboxCursor);
  const libraryDone = isTimestamp(fixedCursors.libraryCursor);
  const feedDone = isTimestamp(fixedCursors.feedCursor);
  const archiveDone = isTimestamp(fixedCursors.archiveCursor);
  const shortlistDone = isTimestamp(fixedCursors.shortlistCursor);
  const updates: Database['public']['Tables']['readwise_sync_state']['Update'] = {
    inbox_cursor: fixedCursors.inboxCursor,
    library_cursor: fixedCursors.libraryCursor,
    feed_cursor: fixedCursors.feedCursor,
    archive_cursor: fixedCursors.archiveCursor,
    shortlist_cursor: fixedCursors.shortlistCursor,
    initial_backfill_done: state.initial_backfill_done,
    window_started_at: window.windowStartedAt?.toISOString() ?? null,
    window_request_count: budget.used(),
  };

  let nextAllowedAt: string | null = state.next_allowed_at ?? null;
  let last429At: string | null = state.last_429_at ?? null;

  try {
    if (!state.initial_backfill_done) {
      const inboxEnabled = isLocationAllowed('new');
      const libraryEnabled = isLocationAllowed('later');
      const feedEnabled = isLocationAllowed('feed');
      const archiveEnabled = isLocationAllowed('archive');
      const shortlistEnabled = isLocationAllowed('shortlist');

      let inboxComplete = inboxDone || !inboxEnabled;
      let libraryComplete = libraryDone || !libraryEnabled;
      let feedComplete = feedDone || !feedEnabled;
      let archiveComplete = archiveDone || !archiveEnabled;
      let shortlistComplete = shortlistDone || !shortlistEnabled;

      if (!inboxComplete && inboxEnabled) {
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

      if (inboxComplete && budget.remaining() > 0 && !libraryComplete && libraryEnabled) {
        const libraryResult = await syncLocation({
          supabase,
          readerClient,
          budget,
          userId: state.user_id,
          location: 'later',
          mode: 'initial',
          cursorValue: state.library_cursor,
        });
        console.log(
          `[syncUser] Library sync result - nextCursor: ${libraryResult.nextCursor?.substring(0, 40)}..., completed: ${libraryResult.completed}`
        );
        updates.library_cursor = libraryResult.nextCursor;
        updates.window_request_count = budget.used();
        libraryComplete = libraryResult.completed;
      }

      if (
        inboxComplete &&
        libraryComplete &&
        budget.remaining() > 0 &&
        !archiveComplete &&
        archiveEnabled
      ) {
        const archiveResult = await syncLocation({
          supabase,
          readerClient,
          budget,
          userId: state.user_id,
          location: 'archive',
          mode: 'initial',
          cursorValue: state.archive_cursor,
        });
        updates.archive_cursor = archiveResult.nextCursor;
        updates.window_request_count = budget.used();
        archiveComplete = archiveResult.completed;
      }

      if (
        inboxComplete &&
        libraryComplete &&
        archiveComplete &&
        budget.remaining() > 0 &&
        !shortlistComplete &&
        shortlistEnabled
      ) {
        const shortlistResult = await syncLocation({
          supabase,
          readerClient,
          budget,
          userId: state.user_id,
          location: 'shortlist',
          mode: 'initial',
          cursorValue: state.shortlist_cursor,
        });
        updates.shortlist_cursor = shortlistResult.nextCursor;
        updates.window_request_count = budget.used();
        shortlistComplete = shortlistResult.completed;
      }

      if (
        inboxComplete &&
        libraryComplete &&
        archiveComplete &&
        shortlistComplete &&
        budget.remaining() > 0 &&
        !feedComplete &&
        feedEnabled
      ) {
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

      if (
        inboxComplete &&
        libraryComplete &&
        archiveComplete &&
        shortlistComplete &&
        feedComplete
      ) {
        updates.initial_backfill_done = true;
      }
    } else {
      const allLocations: Array<{
        location: SyncLocation;
        cursorValue: string | null;
        setCursor: (value: string | null) => void;
      }> = [
        {
          location: 'new',
          cursorValue: state.inbox_cursor,
          setCursor: (value: string | null) => {
            updates.inbox_cursor = value;
          },
        },
        {
          location: 'later',
          cursorValue: state.library_cursor,
          setCursor: (value: string | null) => {
            updates.library_cursor = value;
          },
        },
        {
          location: 'archive',
          cursorValue: state.archive_cursor,
          setCursor: (value: string | null) => {
            updates.archive_cursor = value;
          },
        },
        {
          location: 'shortlist',
          cursorValue: state.shortlist_cursor,
          setCursor: (value: string | null) => {
            updates.shortlist_cursor = value;
          },
        },
        {
          location: 'feed',
          cursorValue: state.feed_cursor,
          setCursor: (value: string | null) => {
            updates.feed_cursor = value;
          },
        },
      ];

      const locations = allLocations.filter((entry) => isLocationAllowed(entry.location));

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

  // Always set next_allowed_at based on when the rate limit window expires
  // This ensures consistent behavior and prevents early syncs with partial budget
  const windowExpiresAt = window.windowStartedAt
    ? new Date(window.windowStartedAt.getTime() + WINDOW_MS).toISOString()
    : new Date(now.getTime() + WINDOW_MS).toISOString();

  // Only wait for window expiry if budget was used
  if (budget.used() > 0 && !nextAllowedAt) {
    nextAllowedAt = windowExpiresAt;
  }

  console.log('[syncUser] Returning updates:', {
    library_cursor: updates.library_cursor?.substring(0, 40),
    archive_cursor: updates.archive_cursor?.substring(0, 40),
    feed_cursor: updates.feed_cursor?.substring(0, 40),
    initial_backfill_done: updates.initial_backfill_done,
  });

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
  location: SyncLocation;
  mode: 'initial' | 'incremental';
  cursorValue: string | null;
}): Promise<SyncLocationResult> {
  console.log(
    `[syncLocation] Syncing location: ${location}, mode: ${mode}, cursor: ${cursorValue}`
  );
  console.log(`[syncLocation] ${location}: Parsing cursor...`);

  const cursorState = parseCursor(cursorValue);
  console.log(`[syncLocation] ${location}: Starting fetch loop, pageSize: ${getPageSize()}`);
  const updatedAfter =
    mode === 'incremental'
      ? (cursorState.updatedAfter ??
        (!cursorState.isPageCursor ? (cursorValue ?? undefined) : undefined))
      : undefined;
  let pageCursor = cursorState.pageCursor;
  let latestUpdatedAt: string | null = null;
  let completed = false;
  let totalDocs = 0;
  const pageSize = getPageSize();

  while (true) {
    if (!budget.canRequest()) {
      console.log(`[syncLocation] ${location}: Budget exhausted, processed ${totalDocs} docs`);
      break;
    }

    console.log(
      `[syncLocation] ${location}: Fetching page (budget remaining: ${budget.remaining()})`
    );
    const response = await budget.track(() =>
      readerClient.listDocuments({
        location,
        pageCursor: pageCursor ?? undefined,
        pageSize,
        updatedAfter,
        withHtmlContent: true,
      })
    );

    console.log(`[syncLocation] ${location}: Got ${response.results.length} documents`);
    let deferredForBudget = false;

    // Collect docs for batch upsert
    const articleBatch: Array<{
      user_id: string;
      reader_document_id: string;
      html_content: string | null;
      plain_text: string | null;
      word_count: number | null;
      reader_updated_at: string;
      cached_at: string;
    }> = [];

    const documentBatch: Array<{
      user_id: string;
      reader_document_id: string;
      title: string | null;
      author: string | null;
      source: string | null;
      site_name: string | null;
      url: string;
      source_url: string | null;
      category: string;
      location: string | null;
      tags: Json;
      word_count: number | null;
      reading_progress: number;
      summary: string | null;
      image_url: string | null;
      published_date: string | null;
      reader_created_at: string;
      reader_last_moved_at: string | null;
      reader_saved_at: string | null;
      reader_updated_at: string;
      first_opened_at: string | null;
      last_opened_at: string | null;
      cached_at: string;
    }> = [];

    const cachedAt = new Date().toISOString();

    for (const doc of response.results) {
      totalDocs++;
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

      // Add to batch instead of immediate upsert
      articleBatch.push({
        user_id: userId,
        reader_document_id: doc.id,
        html_content: html,
        plain_text: plainText,
        word_count: doc.word_count,
        reader_updated_at: doc.updated_at,
        cached_at: cachedAt,
      });

      documentBatch.push({
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
        first_opened_at: doc.first_opened_at,
        last_opened_at: doc.last_opened_at,
        cached_at: cachedAt,
      });

      latestUpdatedAt = maxIso(latestUpdatedAt, doc.updated_at);
    }

    // Batch upsert articles (only the ones we processed before budget exhaustion)
    if (articleBatch.length > 0) {
      const articlePayloadSize = JSON.stringify(articleBatch).length;
      console.log(
        `[syncLocation] ${location}: Batch upserting ${articleBatch.length} articles (~${Math.round(articlePayloadSize / 1024)}KB)`
      );
      const { error: cacheError } = await supabase.from('cached_articles').upsert(articleBatch, {
        onConflict: 'user_id,reader_document_id',
      });

      if (cacheError) {
        console.error(`[syncLocation] ${location}: Articles batch failed:`, cacheError);
        throw new Error(`Failed to batch cache articles: ${cacheError.message}`);
      }
      console.log(`[syncLocation] ${location}: Articles batch complete`);
    }

    // Batch upsert document metadata
    if (documentBatch.length > 0) {
      const docPayloadSize = JSON.stringify(documentBatch).length;
      console.log(
        `[syncLocation] ${location}: Batch upserting ${documentBatch.length} documents (~${Math.round(docPayloadSize / 1024)}KB)`
      );
      const { error: metaError } = await supabase.from('cached_documents').upsert(documentBatch, {
        onConflict: 'user_id,reader_document_id',
      });

      if (metaError) {
        console.error(`[syncLocation] ${location}: Documents batch failed:`, metaError);
        throw new Error(`Failed to batch cache documents: ${metaError.message}`);
      }
      console.log(`[syncLocation] ${location}: Documents batch complete`);
    }

    if (deferredForBudget) {
      // Return a cursor to resume from where we stopped.
      // IMPORTANT: Always use page cursor format to avoid being mistaken for "completed"
      // (raw timestamps are interpreted as "location sync complete" by isTimestamp())
      //
      // Priority for page cursor:
      // 1. response.nextPageCursor - if we fetched but didn't process all docs
      // 2. pageCursor - from previous iteration
      // 3. Empty string - forces page cursor format even without a page
      //
      // For updatedAfter, use latestUpdatedAt if we processed docs, otherwise original
      const nextPage = response.nextPageCursor || pageCursor || '';
      const resumeCursor = formatPageCursor(nextPage, latestUpdatedAt || updatedAfter);
      console.log(
        `[syncLocation] ${location}: Deferred due to budget, resumeCursor: ${resumeCursor?.substring(0, 40)}`
      );
      return {
        nextCursor: resumeCursor,
        latestUpdatedAt,
        completed: false,
      };
    }

    if (!response.nextPageCursor) {
      console.log(`[syncLocation] ${location}: No more pages, completed`);
      completed = true;
      break;
    }

    pageCursor = response.nextPageCursor;
  }

  console.log(
    `[syncLocation] ${location}: Finished - total docs: ${totalDocs}, completed: ${completed}`
  );

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

/**
 * Detect and fix corrupted cursors from a previous bug where budget exhaustion
 * saved raw timestamps instead of page cursor format.
 *
 * During initial backfill, if a cursor is a raw timestamp (not a page cursor),
 * it means the location was incorrectly marked as complete. We detect this by
 * checking if ANY location still has work to do (initial_backfill_done is false)
 * but has a timestamp cursor.
 *
 * The fix is to reset such cursors to null, forcing a re-sync from scratch.
 * This is slightly wasteful but ensures correctness.
 */
function fixCorruptedCursors({
  initialBackfillDone,
  inboxCursor,
  libraryCursor,
  feedCursor,
  archiveCursor,
  shortlistCursor,
}: {
  initialBackfillDone: boolean;
  inboxCursor: string | null;
  libraryCursor: string | null;
  feedCursor: string | null;
  archiveCursor: string | null;
  shortlistCursor: string | null;
}): {
  inboxCursor: string | null;
  libraryCursor: string | null;
  feedCursor: string | null;
  archiveCursor: string | null;
  shortlistCursor: string | null;
} {
  // If backfill is done, cursors are valid (incremental sync mode)
  if (initialBackfillDone) {
    return { inboxCursor, libraryCursor, feedCursor, archiveCursor, shortlistCursor };
  }

  // During initial backfill, check for corrupted cursors
  // A corrupted cursor is a timestamp that isn't a page cursor
  // (This happens when budget exhaustion saved raw timestamps)
  const isCorruptedCursor = (cursor: string | null): boolean => {
    if (!cursor) return false;
    if (cursor.startsWith(PAGE_CURSOR_PREFIX)) return false;
    // If it's a valid timestamp, it's corrupted (should be a page cursor during backfill)
    return !Number.isNaN(Date.parse(cursor));
  };

  // Check if any cursors are corrupted
  const cursorsToFix = {
    inbox: isCorruptedCursor(inboxCursor),
    library: isCorruptedCursor(libraryCursor),
    feed: isCorruptedCursor(feedCursor),
    archive: isCorruptedCursor(archiveCursor),
    shortlist: isCorruptedCursor(shortlistCursor),
  };

  const hasCorruption = Object.values(cursorsToFix).some(Boolean);

  if (hasCorruption) {
    const corrupted = Object.entries(cursorsToFix)
      .filter(([, v]) => v)
      .map(([k]) => k);
    console.warn(
      `[syncUser] Detected corrupted cursors during initial backfill: ${corrupted.join(', ')}. ` +
        `Resetting to restart sync for affected locations.`
    );
  }

  return {
    inboxCursor: cursorsToFix.inbox ? null : inboxCursor,
    libraryCursor: cursorsToFix.library ? null : libraryCursor,
    feedCursor: cursorsToFix.feed ? null : feedCursor,
    archiveCursor: cursorsToFix.archive ? null : archiveCursor,
    shortlistCursor: cursorsToFix.shortlist ? null : shortlistCursor,
  };
}
