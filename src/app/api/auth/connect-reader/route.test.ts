import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';
import { POST, DELETE, GET } from './route';

// Mock the supabase server client
const mockSupabaseUser = {
  id: 'user-123',
  email: 'test@example.com',
};

const mockGetUser = vi.fn();
const mockUpdate = vi.fn();
const mockSelect = vi.fn();
const mockEq = vi.fn();
const mockSingle = vi.fn();
const mockUpsert = vi.fn();
const mockDelete = vi.fn();
const mockFrom = vi.fn();

vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(() =>
    Promise.resolve({
      auth: {
        getUser: mockGetUser,
      },
      from: mockFrom,
    })
  ),
}));

// Mock the reader client
const mockValidateToken = vi.fn();

vi.mock('@/lib/reader', () => ({
  createReaderClient: vi.fn(() => ({
    validateToken: mockValidateToken,
  })),
  ReaderApiException: class ReaderApiException extends Error {
    constructor(
      message: string,
      public status: number
    ) {
      super(message);
    }
  },
}));

describe('POST /api/auth/connect-reader', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    // Default mock implementations
    mockGetUser.mockResolvedValue({
      data: { user: mockSupabaseUser },
      error: null,
    });

    mockValidateToken.mockResolvedValue(true);

    mockUpdate.mockReturnValue({
      eq: mockEq.mockReturnValue(Promise.resolve({ error: null })),
    });

    mockUpsert.mockResolvedValue({ error: null });

    mockFrom.mockImplementation((table: string) => {
      if (table === 'users') {
        return {
          update: mockUpdate,
          select: mockSelect,
        };
      }

      if (table === 'readwise_sync_state') {
        return {
          upsert: mockUpsert,
        };
      }

      return {};
    });
  });

  function createRequest(body: unknown): NextRequest {
    return new NextRequest('http://localhost:3000/api/auth/connect-reader', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
  }

  it('should return 400 if token is missing', async () => {
    const request = createRequest({});
    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.success).toBe(false);
    expect(data.error).toBe('Access token is required');
  });

  it('should return 400 if token is empty', async () => {
    const request = createRequest({ token: '' });
    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.success).toBe(false);
  });

  it('should return 400 if token is too short', async () => {
    const request = createRequest({ token: 'short' });
    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBe('Invalid token format');
  });

  it('should return 401 if user is not authenticated', async () => {
    mockGetUser.mockResolvedValue({
      data: { user: null },
      error: { message: 'Not authenticated' },
    });

    const request = createRequest({ token: 'valid-token-at-least-20-chars' });
    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(401);
    expect(data.error).toBe('Authentication required');
  });

  it('should return 400 if Reader token is invalid', async () => {
    const { ReaderApiException } = await import('@/lib/reader');
    mockValidateToken.mockRejectedValue(new ReaderApiException('Invalid token', 401));

    const request = createRequest({ token: 'invalid-token-at-least-20-chars' });
    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toContain('Invalid access token');
  });

  it('should return 429 if Reader API rate limits', async () => {
    const { ReaderApiException } = await import('@/lib/reader');
    mockValidateToken.mockRejectedValue(new ReaderApiException('Rate limited', 429));

    const request = createRequest({ token: 'valid-token-at-least-20-chars' });
    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(429);
    expect(data.error).toContain('Too many requests');
  });

  it('should store token and return success on valid token', async () => {
    const request = createRequest({ token: 'valid-reader-token-12345678' });
    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    expect(mockUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        reader_access_token: 'valid-reader-token-12345678',
      })
    );
    expect(mockUpsert).toHaveBeenCalledWith(
      expect.objectContaining({
        user_id: mockSupabaseUser.id,
        initial_backfill_done: false,
      }),
      expect.any(Object)
    );
  });

  it('should return 500 if database update fails', async () => {
    mockUpdate.mockReturnValue({
      eq: mockEq.mockReturnValue(Promise.resolve({ error: { message: 'DB error' } })),
    });

    const request = createRequest({ token: 'valid-reader-token-12345678' });
    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data.error).toContain('Failed to save token');
  });

  it('should return 500 if sync state initialization fails', async () => {
    mockUpsert.mockResolvedValue({ error: { message: 'Sync error' } });

    const request = createRequest({ token: 'valid-reader-token-12345678' });
    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data.error).toContain('Failed to initialize sync state');
  });

  it('should trim whitespace from token', async () => {
    const request = createRequest({ token: '  valid-reader-token-12345678  ' });
    const response = await POST(request);

    expect(response.status).toBe(200);
    expect(mockUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        reader_access_token: 'valid-reader-token-12345678',
      })
    );
  });
});

describe('DELETE /api/auth/connect-reader', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    mockGetUser.mockResolvedValue({
      data: { user: mockSupabaseUser },
      error: null,
    });

    mockUpdate.mockReturnValue({
      eq: mockEq.mockReturnValue(Promise.resolve({ error: null })),
    });

    mockDelete.mockReturnValue({
      eq: mockEq.mockReturnValue(Promise.resolve({ error: null })),
    });

    mockFrom.mockImplementation((table: string) => {
      if (table === 'users') {
        return {
          update: mockUpdate,
        };
      }

      if (table === 'readwise_sync_state') {
        return {
          delete: mockDelete,
        };
      }

      return {};
    });
  });

  it('should return 401 if user is not authenticated', async () => {
    mockGetUser.mockResolvedValue({
      data: { user: null },
      error: { message: 'Not authenticated' },
    });

    const response = await DELETE();
    const data = await response.json();

    expect(response.status).toBe(401);
    expect(data.error).toBe('Authentication required');
  });

  it('should remove token and return success', async () => {
    const response = await DELETE();
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    expect(mockUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        reader_access_token: null,
      })
    );
    expect(mockDelete).toHaveBeenCalled();
  });

  it('should return 500 if database update fails', async () => {
    mockUpdate.mockReturnValue({
      eq: mockEq.mockReturnValue(Promise.resolve({ error: { message: 'DB error' } })),
    });

    const response = await DELETE();
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data.error).toContain('Failed to disconnect');
  });

  it('should return 500 if sync state cleanup fails', async () => {
    mockDelete.mockReturnValue({
      eq: mockEq.mockReturnValue(Promise.resolve({ error: { message: 'DB error' } })),
    });

    const response = await DELETE();
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data.error).toContain('Failed to disconnect');
  });
});

describe('GET /api/auth/connect-reader', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    mockGetUser.mockResolvedValue({
      data: { user: mockSupabaseUser },
      error: null,
    });

    mockSelect.mockReturnValue({
      eq: mockEq.mockReturnValue({
        single: mockSingle,
      }),
    });

    mockFrom.mockImplementation((table: string) => {
      if (table === 'users') {
        return {
          select: mockSelect,
        };
      }

      return {};
    });
  });

  it('should return 401 if user is not authenticated', async () => {
    mockGetUser.mockResolvedValue({
      data: { user: null },
      error: { message: 'Not authenticated' },
    });

    const response = await GET();
    const data = await response.json();

    expect(response.status).toBe(401);
    expect(data.connected).toBe(false);
  });

  it('should return connected: true if user has token', async () => {
    mockSingle.mockResolvedValue({
      data: { reader_access_token: 'some-token' },
      error: null,
    });

    const response = await GET();
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.connected).toBe(true);
  });

  it('should return connected: false if user has no token', async () => {
    mockSingle.mockResolvedValue({
      data: { reader_access_token: null },
      error: null,
    });

    const response = await GET();
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.connected).toBe(false);
  });

  it('should return 500 if database query fails', async () => {
    mockSingle.mockResolvedValue({
      data: null,
      error: { message: 'DB error' },
    });

    const response = await GET();
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data.connected).toBe(false);
  });
});
