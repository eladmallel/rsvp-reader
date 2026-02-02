import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { NextRequest } from 'next/server';
import { GET } from './route';

const mockFrom = vi.fn();
const mockCreateAdminClient = vi.fn();
const mockListDocuments = vi.fn();

vi.mock('@/lib/supabase/admin', () => ({
  createAdminClient: () => mockCreateAdminClient(),
}));

vi.mock('@/lib/reader', () => ({
  createReaderClient: () => ({
    listDocuments: mockListDocuments,
    getDocument: vi.fn(),
  }),
  ReaderApiException: class ReaderApiException extends Error {
    status: number;
    retryAfterSeconds?: number;
    constructor(message: string, status: number, detail?: string, retryAfterSeconds?: number) {
      super(message);
      this.status = status;
      this.retryAfterSeconds = retryAfterSeconds;
    }
  },
}));

vi.mock('@/lib/reader/html', () => ({
  htmlToPlainText: (value: string) => value,
}));

describe('GET /api/sync/readwise', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    process.env = { ...originalEnv, SYNC_API_KEY: 'sync-secret' };
    mockListDocuments.mockReset();
    mockFrom.mockReset();
    mockCreateAdminClient.mockReset();
  });

  afterEach(() => {
    process.env = originalEnv;
    vi.clearAllMocks();
  });

  function createRequest() {
    const url = new URL('http://localhost:3000/api/sync/readwise');
    url.searchParams.set('token', 'sync-secret');
    return new NextRequest(url);
  }

  it('syncs inbox before library and feed on initial backfill', async () => {
    const state = {
      user_id: 'user-123',
      inbox_cursor: null,
      library_cursor: null,
      feed_cursor: null,
      next_allowed_at: null,
      last_sync_at: null,
      in_progress: false,
      initial_backfill_done: false,
      window_started_at: null,
      window_request_count: 0,
      last_429_at: null,
      lock_acquired_at: null,
      users: { reader_access_token: 'token-123' },
    };

    const lockedState = { ...state, in_progress: true };

    // New query structure: select().or() instead of select().eq().or()
    const mockSelect = vi.fn().mockReturnValue({
      or: vi.fn().mockResolvedValue({ data: [state], error: null }),
    });

    const lockChain = {
      eq: vi.fn().mockReturnThis(),
      or: vi.fn().mockReturnThis(),
      select: vi.fn().mockReturnValue({
        single: vi.fn().mockResolvedValue({ data: lockedState, error: null }),
      }),
    };

    const updateSpy = vi.fn();
    const finalChain = {
      eq: vi.fn().mockResolvedValue({ error: null }),
    };

    const mockUpdate = vi.fn().mockImplementation((payload: Record<string, unknown>) => {
      updateSpy(payload);
      if (payload.in_progress === true) {
        return lockChain;
      }
      return finalChain;
    });

    mockFrom.mockImplementation((table: string) => {
      if (table === 'readwise_sync_state') {
        return {
          select: mockSelect,
          update: mockUpdate,
        };
      }
      return {
        upsert: vi.fn().mockResolvedValue({ error: null }),
      };
    });

    mockCreateAdminClient.mockReturnValue({ from: mockFrom });

    mockListDocuments.mockResolvedValue({
      results: [],
      nextPageCursor: null,
    });

    const response = await GET(createRequest());
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.ok).toBe(true);

    const locations = mockListDocuments.mock.calls.map((call) => call[0].location);
    expect(locations).toEqual(['new', 'later', 'archive', 'shortlist', 'feed']);

    const finalUpdate = updateSpy.mock.calls.at(-1)?.[0] ?? {};
    expect(finalUpdate.initial_backfill_done).toBe(true);
  });

  it('limits sync locations when override is set', async () => {
    process.env.READWISE_SYNC_LOCATION_OVERRIDE = 'later';

    const state = {
      user_id: 'user-override',
      inbox_cursor: null,
      library_cursor: null,
      feed_cursor: null,
      archive_cursor: null,
      shortlist_cursor: null,
      next_allowed_at: null,
      last_sync_at: null,
      in_progress: false,
      initial_backfill_done: false,
      window_started_at: null,
      window_request_count: 0,
      last_429_at: null,
      lock_acquired_at: null,
      users: { reader_access_token: 'token-override' },
    };

    const lockedState = { ...state, in_progress: true };

    // New query structure: select().or() instead of select().eq().or()
    const mockSelect = vi.fn().mockReturnValue({
      or: vi.fn().mockResolvedValue({ data: [state], error: null }),
    });

    const lockChain = {
      eq: vi.fn().mockReturnThis(),
      or: vi.fn().mockReturnThis(),
      select: vi.fn().mockReturnValue({
        single: vi.fn().mockResolvedValue({ data: lockedState, error: null }),
      }),
    };

    const updateSpy = vi.fn();
    const finalChain = {
      eq: vi.fn().mockResolvedValue({ error: null }),
    };

    const mockUpdate = vi.fn().mockImplementation((payload: Record<string, unknown>) => {
      updateSpy(payload);
      if (payload.in_progress === true) {
        return lockChain;
      }
      return finalChain;
    });

    mockFrom.mockImplementation((table: string) => {
      if (table === 'readwise_sync_state') {
        return {
          select: mockSelect,
          update: mockUpdate,
        };
      }
      return {
        upsert: vi.fn().mockResolvedValue({ error: null }),
      };
    });

    mockCreateAdminClient.mockReturnValue({ from: mockFrom });

    mockListDocuments.mockResolvedValue({
      results: [],
      nextPageCursor: null,
    });

    const response = await GET(createRequest());
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.ok).toBe(true);

    const locations = mockListDocuments.mock.calls.map((call) => call[0].location);
    expect(locations).toEqual(['later']);

    const finalUpdate = updateSpy.mock.calls.at(-1)?.[0] ?? {};
    expect(finalUpdate.initial_backfill_done).toBe(true);
  });

  it('uses updatedAfter cursor for incremental sync', async () => {
    const cursor = '2026-01-18T00:00:00.000Z';
    const state = {
      user_id: 'user-456',
      inbox_cursor: cursor,
      library_cursor: cursor,
      feed_cursor: cursor,
      archive_cursor: cursor,
      shortlist_cursor: cursor,
      next_allowed_at: null,
      last_sync_at: null,
      in_progress: false,
      initial_backfill_done: true,
      window_started_at: null,
      window_request_count: 0,
      last_429_at: null,
      lock_acquired_at: null,
      users: { reader_access_token: 'token-456' },
    };

    const lockedState = { ...state, in_progress: true };

    // New query structure: select().or() instead of select().eq().or()
    const mockSelect = vi.fn().mockReturnValue({
      or: vi.fn().mockResolvedValue({ data: [state], error: null }),
    });

    const lockChain = {
      eq: vi.fn().mockReturnThis(),
      or: vi.fn().mockReturnThis(),
      select: vi.fn().mockReturnValue({
        single: vi.fn().mockResolvedValue({ data: lockedState, error: null }),
      }),
    };

    const mockUpdate = vi.fn().mockImplementation((payload: Record<string, unknown>) => {
      if (payload.in_progress === true) {
        return lockChain;
      }
      return { eq: vi.fn().mockResolvedValue({ error: null }) };
    });

    mockFrom.mockImplementation((table: string) => {
      if (table === 'readwise_sync_state') {
        return {
          select: mockSelect,
          update: mockUpdate,
        };
      }
      return {
        upsert: vi.fn().mockResolvedValue({ error: null }),
      };
    });

    mockCreateAdminClient.mockReturnValue({ from: mockFrom });

    mockListDocuments.mockResolvedValue({
      results: [],
      nextPageCursor: null,
    });

    const response = await GET(createRequest());
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.ok).toBe(true);

    for (const call of mockListDocuments.mock.calls) {
      expect(call[0].updatedAfter).toBe(cursor);
    }
  });

  it('uses default page size of 100 when READWISE_SYNC_PAGE_SIZE_OVERRIDE is not set', async () => {
    delete process.env.READWISE_SYNC_PAGE_SIZE_OVERRIDE;

    const state = {
      user_id: 'user-default-page',
      inbox_cursor: null,
      library_cursor: null,
      feed_cursor: null,
      archive_cursor: null,
      shortlist_cursor: null,
      next_allowed_at: null,
      last_sync_at: null,
      in_progress: false,
      initial_backfill_done: false,
      window_started_at: null,
      window_request_count: 0,
      last_429_at: null,
      lock_acquired_at: null,
      users: { reader_access_token: 'token-default' },
    };

    const lockedState = { ...state, in_progress: true };

    // New query structure: select().or() instead of select().eq().or()
    const mockSelect = vi.fn().mockReturnValue({
      or: vi.fn().mockResolvedValue({ data: [state], error: null }),
    });

    const lockChain = {
      eq: vi.fn().mockReturnThis(),
      or: vi.fn().mockReturnThis(),
      select: vi.fn().mockReturnValue({
        single: vi.fn().mockResolvedValue({ data: lockedState, error: null }),
      }),
    };

    const mockUpdate = vi.fn().mockImplementation((payload: Record<string, unknown>) => {
      if (payload.in_progress === true) {
        return lockChain;
      }
      return { eq: vi.fn().mockResolvedValue({ error: null }) };
    });

    mockFrom.mockImplementation((table: string) => {
      if (table === 'readwise_sync_state') {
        return {
          select: mockSelect,
          update: mockUpdate,
        };
      }
      return {
        upsert: vi.fn().mockResolvedValue({ error: null }),
      };
    });

    mockCreateAdminClient.mockReturnValue({ from: mockFrom });

    mockListDocuments.mockResolvedValue({
      results: [],
      nextPageCursor: null,
    });

    const response = await GET(createRequest());

    expect(response.status).toBe(200);

    for (const call of mockListDocuments.mock.calls) {
      expect(call[0].pageSize).toBe(100);
    }
  });

  it('uses custom page size when READWISE_SYNC_PAGE_SIZE_OVERRIDE is set', async () => {
    process.env.READWISE_SYNC_PAGE_SIZE_OVERRIDE = '10';

    const state = {
      user_id: 'user-custom-page',
      inbox_cursor: null,
      library_cursor: null,
      feed_cursor: null,
      archive_cursor: null,
      shortlist_cursor: null,
      next_allowed_at: null,
      last_sync_at: null,
      in_progress: false,
      initial_backfill_done: false,
      window_started_at: null,
      window_request_count: 0,
      last_429_at: null,
      lock_acquired_at: null,
      users: { reader_access_token: 'token-custom' },
    };

    const lockedState = { ...state, in_progress: true };

    // New query structure: select().or() instead of select().eq().or()
    const mockSelect = vi.fn().mockReturnValue({
      or: vi.fn().mockResolvedValue({ data: [state], error: null }),
    });

    const lockChain = {
      eq: vi.fn().mockReturnThis(),
      or: vi.fn().mockReturnThis(),
      select: vi.fn().mockReturnValue({
        single: vi.fn().mockResolvedValue({ data: lockedState, error: null }),
      }),
    };

    const mockUpdate = vi.fn().mockImplementation((payload: Record<string, unknown>) => {
      if (payload.in_progress === true) {
        return lockChain;
      }
      return { eq: vi.fn().mockResolvedValue({ error: null }) };
    });

    mockFrom.mockImplementation((table: string) => {
      if (table === 'readwise_sync_state') {
        return {
          select: mockSelect,
          update: mockUpdate,
        };
      }
      return {
        upsert: vi.fn().mockResolvedValue({ error: null }),
      };
    });

    mockCreateAdminClient.mockReturnValue({ from: mockFrom });

    mockListDocuments.mockResolvedValue({
      results: [],
      nextPageCursor: null,
    });

    const response = await GET(createRequest());

    expect(response.status).toBe(200);

    for (const call of mockListDocuments.mock.calls) {
      expect(call[0].pageSize).toBe(10);
    }
  });
});
