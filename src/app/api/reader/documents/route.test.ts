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

const mockCachedDocuments = [
  {
    id: 'cache-1',
    user_id: 'user-123',
    reader_document_id: 'doc-1',
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
    reader_created_at: '2026-01-15T10:00:00Z',
    reader_last_moved_at: '2026-01-16T08:00:00Z',
    reader_saved_at: '2026-01-15T09:00:00Z',
    reader_updated_at: '2026-01-15T10:00:00Z',
    cached_at: '2026-01-15T10:00:00Z',
  },
];

// Mocks
const mockGetUser = vi.fn();
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

describe('GET /api/reader/documents', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    mockGetUser.mockResolvedValue({
      data: { user: mockSupabaseUser },
      error: null,
    });

    // Default mock for 'users' table query
    const mockUsersQuery = {
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({
            data: mockUserData,
            error: null,
          }),
        }),
      }),
    };

    // Default mock for 'cached_documents' table query
    const mockDocsQuery = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      in: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
      range: vi.fn().mockReturnThis(),
      filter: vi.fn().mockReturnThis(),
    };
    // Set the final resolved value
    mockDocsQuery.range = vi.fn().mockResolvedValue({
      data: mockCachedDocuments,
      error: null,
      count: 1,
    });

    mockFrom.mockImplementation((table: string) => {
      if (table === 'users') {
        return mockUsersQuery;
      }
      if (table === 'cached_documents') {
        return mockDocsQuery;
      }
      return mockUsersQuery;
    });
  });

  function createRequest(params: Record<string, string> = {}): NextRequest {
    const url = new URL('http://localhost:3000/api/reader/documents');
    Object.entries(params).forEach(([key, value]) => {
      url.searchParams.set(key, value);
    });
    return new NextRequest(new Request(url.toString()));
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
    const mockUsersQuery = {
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({
            data: { reader_access_token: null },
            error: null,
          }),
        }),
      }),
    };

    mockFrom.mockImplementation((table: string) => {
      if (table === 'users') {
        return mockUsersQuery;
      }
      return mockUsersQuery;
    });

    const request = createRequest();
    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toContain('not connected');
  });

  it('should return documents from cache on success', async () => {
    const request = createRequest();
    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.documents).toHaveLength(1);
    expect(data.documents[0].id).toBe('doc-1');
    expect(data.documents[0].title).toBe('Test Article');
    expect(data.documents[0].tags).toEqual(['dev', 'typescript']);
  });

  it('should treat location=library as new/later/shortlist', async () => {
    const mockDocsQuery = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      in: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
      range: vi.fn().mockResolvedValue({
        data: mockCachedDocuments,
        error: null,
        count: 1,
      }),
      filter: vi.fn().mockReturnThis(),
    };

    const mockUsersQuery = {
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({
            data: mockUserData,
            error: null,
          }),
        }),
      }),
    };

    mockFrom.mockImplementation((table: string) => {
      if (table === 'users') {
        return mockUsersQuery;
      }
      if (table === 'cached_documents') {
        return mockDocsQuery;
      }
      return mockUsersQuery;
    });

    const request = createRequest({ location: 'library' });
    const response = await GET(request);
    await response.json();

    expect(mockDocsQuery.in).toHaveBeenCalledWith('location', ['new', 'later', 'shortlist']);
  });

  it('should prefer last moved timestamp for sorting fields', async () => {
    const request = createRequest();
    const response = await GET(request);
    const data = await response.json();

    expect(data.documents[0].createdAt).toBe('2026-01-16T08:00:00Z');
  });

  it('should handle null fields from the cached documents', async () => {
    const mockDocsQuery = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      in: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
      range: vi.fn().mockResolvedValue({
        data: [
          {
            id: 'cache-2',
            user_id: 'user-123',
            reader_document_id: '01kf4kq1j7ftt8f321fa477k74',
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
            reader_created_at: '2026-01-16T23:54:40.078482+00:00',
            reader_last_moved_at: null,
            reader_saved_at: null,
            reader_updated_at: '2026-01-16T23:54:42.132460+00:00',
            cached_at: '2026-01-16T23:54:42.132460+00:00',
          },
        ],
        error: null,
        count: 1,
      }),
      filter: vi.fn().mockReturnThis(),
    };

    const mockUsersQuery = {
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({
            data: mockUserData,
            error: null,
          }),
        }),
      }),
    };

    mockFrom.mockImplementation((table: string) => {
      if (table === 'users') {
        return mockUsersQuery;
      }
      if (table === 'cached_documents') {
        return mockDocsQuery;
      }
      return mockUsersQuery;
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
  // Note: Filter behavior (location, category, tag) is tested in E2E tests
  // against a real database, as mocking Supabase's chained query builder is fragile.

  it('should return pagination cursor when more results available', async () => {
    const mockDocsQuery = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      in: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
      range: vi.fn().mockResolvedValue({
        data: mockCachedDocuments,
        error: null,
        count: 50, // More than page size
      }),
      filter: vi.fn().mockReturnThis(),
    };

    const mockUsersQuery = {
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({
            data: mockUserData,
            error: null,
          }),
        }),
      }),
    };

    mockFrom.mockImplementation((table: string) => {
      if (table === 'users') {
        return mockUsersQuery;
      }
      if (table === 'cached_documents') {
        return mockDocsQuery;
      }
      return mockUsersQuery;
    });

    const request = createRequest({ pageSize: '20' });
    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.nextCursor).toBe('20'); // Next offset
    expect(data.count).toBe(50);
  });

  it('should not return pagination cursor when no more results', async () => {
    const mockDocsQuery = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      in: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
      range: vi.fn().mockResolvedValue({
        data: mockCachedDocuments,
        error: null,
        count: 1, // Exactly the number returned
      }),
      filter: vi.fn().mockReturnThis(),
    };

    const mockUsersQuery = {
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({
            data: mockUserData,
            error: null,
          }),
        }),
      }),
    };

    mockFrom.mockImplementation((table: string) => {
      if (table === 'users') {
        return mockUsersQuery;
      }
      if (table === 'cached_documents') {
        return mockDocsQuery;
      }
      return mockUsersQuery;
    });

    const request = createRequest();
    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.nextCursor).toBeNull();
  });

  it('should transform document tags from object to array', async () => {
    const request = createRequest();
    const response = await GET(request);
    const data = await response.json();

    expect(data.documents[0].tags).toBeInstanceOf(Array);
    expect(data.documents[0].tags).toContain('dev');
    expect(data.documents[0].tags).toContain('typescript');
  });

  it('should handle database query errors', async () => {
    const mockDocsQuery = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      in: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
      range: vi.fn().mockResolvedValue({
        data: null,
        error: { message: 'Database error' },
        count: null,
      }),
      filter: vi.fn().mockReturnThis(),
    };

    const mockUsersQuery = {
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({
            data: mockUserData,
            error: null,
          }),
        }),
      }),
    };

    mockFrom.mockImplementation((table: string) => {
      if (table === 'users') {
        return mockUsersQuery;
      }
      if (table === 'cached_documents') {
        return mockDocsQuery;
      }
      return mockUsersQuery;
    });

    const request = createRequest();
    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data.error).toBe('Failed to fetch documents');
  });
});
