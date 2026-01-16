import { describe, it, expect, vi, beforeEach } from 'vitest';
import { GET } from './route';

// Mock data
const mockSupabaseUser = {
  id: 'user-123',
  email: 'test@example.com',
};

const mockUserData = {
  reader_access_token: 'valid-reader-token-12345',
};

const mockTags = [
  { name: 'dev', count: 5 },
  { name: 'typescript', count: 3 },
  { name: 'react', count: 2 },
];

// Mocks
const mockGetUser = vi.fn();
const mockSelect = vi.fn();
const mockEq = vi.fn();
const mockSingle = vi.fn();
const mockGetTags = vi.fn();

vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(() =>
    Promise.resolve({
      auth: {
        getUser: mockGetUser,
      },
      from: vi.fn(() => ({
        select: mockSelect,
      })),
    })
  ),
}));

vi.mock('@/lib/reader', () => ({
  createReaderClient: vi.fn(() => ({
    getTags: mockGetTags,
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

describe('GET /api/reader/tags', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    mockGetUser.mockResolvedValue({
      data: { user: mockSupabaseUser },
      error: null,
    });

    mockSelect.mockReturnValue({
      eq: mockEq.mockReturnValue({
        single: mockSingle.mockResolvedValue({
          data: mockUserData,
          error: null,
        }),
      }),
    });

    mockGetTags.mockResolvedValue(mockTags);
  });

  it('should return 401 if user is not authenticated', async () => {
    mockGetUser.mockResolvedValue({
      data: { user: null },
      error: { message: 'Not authenticated' },
    });

    const response = await GET();
    const data = await response.json();

    expect(response.status).toBe(401);
    expect(data.error).toBe('Authentication required');
  });

  it('should return 400 if Reader is not connected', async () => {
    mockSingle.mockResolvedValue({
      data: { reader_access_token: null },
      error: null,
    });

    const response = await GET();
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toContain('not connected');
  });

  it('should return tags on success', async () => {
    const response = await GET();
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.tags).toHaveLength(3);
    expect(data.tags[0]).toEqual({ name: 'dev', count: 5 });
  });

  it('should return 401 if Reader token is invalid', async () => {
    const { ReaderApiException } = await import('@/lib/reader');
    mockGetTags.mockRejectedValue(new ReaderApiException('Invalid token', 401));

    const response = await GET();
    const data = await response.json();

    expect(response.status).toBe(401);
    expect(data.error).toContain('invalid or expired');
  });

  it('should return 429 if rate limited', async () => {
    const { ReaderApiException } = await import('@/lib/reader');
    mockGetTags.mockRejectedValue(new ReaderApiException('Rate limited', 429));

    const response = await GET();
    const data = await response.json();

    expect(response.status).toBe(429);
    expect(data.error).toContain('Too many requests');
  });

  it('should return empty array when no tags exist', async () => {
    mockGetTags.mockResolvedValue([]);

    const response = await GET();
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.tags).toEqual([]);
  });
});
