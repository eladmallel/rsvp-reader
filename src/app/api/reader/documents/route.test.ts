import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';
import { GET } from './route';

// Mock data
const mockSupabaseUser = {
  id: 'user-123',
  email: 'test@example.com',
};

const mockUserData = {
  reader_access_token: 'valid-reader-token-12345',
};

const mockDocuments = [
  {
    id: 'doc-1',
    title: 'Test Article',
    author: 'Test Author',
    source: 'test.com',
    site_name: 'Test Site',
    url: 'https://read.readwise.io/doc-1',
    source_url: 'https://test.com/article',
    category: 'article',
    location: 'later',
    tags: {
      dev: { name: 'dev', type: 'manual', created: 0 },
      typescript: { name: 'typescript', type: 'manual', created: 0 },
    },
    word_count: 1500,
    reading_progress: 0,
    summary: 'Test summary',
    image_url: 'https://test.com/image.jpg',
    published_date: '2026-01-10',
    created_at: '2026-01-15T10:00:00Z',
    updated_at: '2026-01-15T10:00:00Z',
    notes: null,
    parent_id: null,
  },
];

// Mocks
const mockGetUser = vi.fn();
const mockSelect = vi.fn();
const mockEq = vi.fn();
const mockSingle = vi.fn();
const mockListDocuments = vi.fn();

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
    listDocuments: mockListDocuments,
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

describe('GET /api/reader/documents', () => {
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

    mockListDocuments.mockResolvedValue({
      count: 1,
      nextPageCursor: null,
      results: mockDocuments,
    });
  });

  function createRequest(params: Record<string, string> = {}): NextRequest {
    const url = new URL('http://localhost:3000/api/reader/documents');
    Object.entries(params).forEach(([key, value]) => {
      url.searchParams.set(key, value);
    });
    return new NextRequest(url);
  }

  it('should return 401 if user is not authenticated', async () => {
    mockGetUser.mockResolvedValue({
      data: { user: null },
      error: { message: 'Not authenticated' },
    });

    const request = createRequest();
    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(401);
    expect(data.error).toBe('Authentication required');
  });

  it('should return 400 if Reader is not connected', async () => {
    mockSingle.mockResolvedValue({
      data: { reader_access_token: null },
      error: null,
    });

    const request = createRequest();
    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toContain('not connected');
  });

  it('should return documents on success', async () => {
    const request = createRequest();
    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.documents).toHaveLength(1);
    expect(data.documents[0].id).toBe('doc-1');
    expect(data.documents[0].title).toBe('Test Article');
    expect(data.documents[0].tags).toEqual(['dev', 'typescript']);
  });

  it('should handle null fields from the Reader API', async () => {
    mockListDocuments.mockResolvedValue({
      count: 1,
      nextPageCursor: null,
      results: [
        {
          id: '01kf4kq1j7ftt8f321fa477k74',
          title: null,
          author: null,
          source: null,
          site_name: null,
          url: 'https://read.readwise.io/read/01kf4kq1j7ftt8f321fa477k74',
          source_url: null,
          category: 'rss',
          location: null,
          tags: null,
          word_count: null,
          reading_progress: 0,
          summary: null,
          image_url: null,
          published_date: null,
          created_at: '2026-01-16T23:54:40.078482+00:00',
          updated_at: '2026-01-16T23:54:42.132460+00:00',
          notes: '',
          parent_id: null,
        },
      ],
    });

    const request = createRequest();
    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.documents[0].title).toBeNull();
    expect(data.documents[0].sourceUrl).toBeNull();
    expect(data.documents[0].location).toBeNull();
    expect(data.documents[0].tags).toEqual([]);
  });

  it('should pass location filter to Reader API', async () => {
    const request = createRequest({ location: 'later' });
    await GET(request);

    expect(mockListDocuments).toHaveBeenCalledWith(expect.objectContaining({ location: 'later' }));
  });

  it('should pass category filter to Reader API', async () => {
    const request = createRequest({ category: 'article' });
    await GET(request);

    expect(mockListDocuments).toHaveBeenCalledWith(
      expect.objectContaining({ category: 'article' })
    );
  });

  it('should pass tag filter to Reader API', async () => {
    const request = createRequest({ tag: 'dev' });
    await GET(request);

    expect(mockListDocuments).toHaveBeenCalledWith(expect.objectContaining({ tag: 'dev' }));
  });

  it('should pass pagination cursor to Reader API', async () => {
    const request = createRequest({ cursor: 'cursor-123' });
    await GET(request);

    expect(mockListDocuments).toHaveBeenCalledWith(
      expect.objectContaining({ pageCursor: 'cursor-123' })
    );
  });

  it('should limit page size to 100', async () => {
    const request = createRequest({ pageSize: '200' });
    await GET(request);

    expect(mockListDocuments).toHaveBeenCalledWith(expect.objectContaining({ pageSize: 100 }));
  });

  it('should return 401 if Reader token is invalid', async () => {
    const { ReaderApiException } = await import('@/lib/reader');
    mockListDocuments.mockRejectedValue(new ReaderApiException('Invalid token', 401));

    const request = createRequest();
    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(401);
    expect(data.error).toContain('invalid or expired');
  });

  it('should return 429 if rate limited', async () => {
    const { ReaderApiException } = await import('@/lib/reader');
    mockListDocuments.mockRejectedValue(new ReaderApiException('Rate limited', 429));

    const request = createRequest();
    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(429);
    expect(data.error).toContain('Too many requests');
  });

  it('should return pagination cursor when available', async () => {
    mockListDocuments.mockResolvedValue({
      count: 100,
      nextPageCursor: 'next-cursor-abc',
      results: mockDocuments,
    });

    const request = createRequest();
    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.nextCursor).toBe('next-cursor-abc');
    expect(data.count).toBe(100);
  });

  it('should transform document tags from object to array', async () => {
    const request = createRequest();
    const response = await GET(request);
    const data = await response.json();

    expect(data.documents[0].tags).toBeInstanceOf(Array);
    expect(data.documents[0].tags).toContain('dev');
    expect(data.documents[0].tags).toContain('typescript');
  });
});
