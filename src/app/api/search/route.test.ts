import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';
import { GET } from './route';

// Mock data
const mockSupabaseUser = {
  id: 'user-123',
  email: 'test@example.com',
};

const mockCachedDocuments = [
  {
    id: 'cache-1',
    user_id: 'user-123',
    reader_document_id: 'doc-1',
    title: 'AI Agents Guide',
    author: 'John Doe',
    source: 'test.com',
    site_name: 'Test Site',
    url: 'https://read.readwise.io/doc-1',
    source_url: 'https://test.com/article',
    category: 'article',
    location: 'later',
    tags: {
      dev: { name: 'dev', type: 'manual', created: 0 },
      ai: { name: 'ai', type: 'manual', created: 0 },
    },
    word_count: 1500,
    reading_progress: 0,
    summary: 'A comprehensive guide to building AI agents with LangChain',
    image_url: 'https://test.com/image.jpg',
    published_date: '2026-01-10',
    reader_created_at: '2026-01-15T10:00:00Z',
    reader_last_moved_at: '2026-01-16T08:00:00Z',
    reader_saved_at: '2026-01-15T09:00:00Z',
    reader_updated_at: '2026-01-15T10:00:00Z',
    cached_at: '2026-01-15T10:00:00Z',
  },
  {
    id: 'cache-2',
    user_id: 'user-123',
    reader_document_id: 'doc-2',
    title: 'Machine Learning Basics',
    author: 'Jane Smith',
    source: 'medium.com',
    site_name: 'Medium',
    url: 'https://read.readwise.io/doc-2',
    source_url: 'https://medium.com/article',
    category: 'article',
    location: 'new',
    tags: { ml: { name: 'ml', type: 'manual', created: 0 } },
    word_count: 2000,
    reading_progress: 0,
    summary: 'Introduction to machine learning concepts and agents',
    image_url: null,
    published_date: '2026-01-08',
    reader_created_at: '2026-01-14T10:00:00Z',
    reader_last_moved_at: null,
    reader_saved_at: '2026-01-14T09:00:00Z',
    reader_updated_at: '2026-01-14T10:00:00Z',
    cached_at: '2026-01-14T10:00:00Z',
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

describe('GET /api/search', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    mockGetUser.mockResolvedValue({
      data: { user: mockSupabaseUser },
      error: null,
    });

    // Default mock for 'cached_documents' table query
    const mockDocsQuery = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      in: vi.fn().mockReturnThis(),
      or: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
      limit: vi.fn().mockResolvedValue({
        data: mockCachedDocuments,
        error: null,
      }),
    };

    mockFrom.mockImplementation(() => mockDocsQuery);
  });

  function createRequest(params: Record<string, string> = {}): NextRequest {
    const url = new URL('http://localhost:3000/api/search');
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

    const request = createRequest({ q: 'agents' });
    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(401);
    expect(data.error).toBe('Authentication required');
  });

  it('should return 400 if search query is missing', async () => {
    const request = createRequest();
    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBe('Search query is required');
  });

  it('should return 400 if search query is empty', async () => {
    const request = createRequest({ q: '   ' });
    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBe('Search query is required');
  });

  it('should return search results on success', async () => {
    const request = createRequest({ q: 'agents' });
    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.results).toHaveLength(2);
    expect(data.count).toBe(2);
  });

  it('should highlight search terms in title', async () => {
    const request = createRequest({ q: 'AI' });
    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.results[0].titleHighlight).toContain('<mark>AI</mark>');
  });

  it('should highlight search terms in snippet', async () => {
    const request = createRequest({ q: 'agents' });
    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.results[0].snippetHighlight).toContain('<mark>agents</mark>');
  });

  it('should extract tags correctly', async () => {
    const request = createRequest({ q: 'agents' });
    const response = await GET(request);
    const data = await response.json();

    expect(data.results[0].tags).toBeInstanceOf(Array);
    expect(data.results[0].tags).toContain('dev');
    expect(data.results[0].tags).toContain('ai');
  });

  it('should calculate reading time from word count', async () => {
    const request = createRequest({ q: 'agents' });
    const response = await GET(request);
    const data = await response.json();

    // 1500 words at 200 WPM = 7.5, rounded up = 8 min
    expect(data.results[0].readTime).toBe('8 min');
    // 2000 words at 200 WPM = 10 min
    expect(data.results[1].readTime).toBe('10 min');
  });

  it('should apply library filter correctly', async () => {
    const mockDocsQuery = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      in: vi.fn().mockReturnThis(),
      or: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
      limit: vi.fn().mockResolvedValue({
        data: mockCachedDocuments,
        error: null,
      }),
    };

    mockFrom.mockImplementation(() => mockDocsQuery);

    const request = createRequest({ q: 'agents', filter: 'library' });
    const response = await GET(request);
    await response.json();

    expect(mockDocsQuery.in).toHaveBeenCalledWith('location', ['new', 'later', 'shortlist']);
  });

  it('should apply feed filter correctly', async () => {
    const mockDocsQuery = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      in: vi.fn().mockReturnThis(),
      or: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
      limit: vi.fn().mockResolvedValue({
        data: mockCachedDocuments,
        error: null,
      }),
    };

    mockFrom.mockImplementation(() => mockDocsQuery);

    const request = createRequest({ q: 'agents', filter: 'feed' });
    const response = await GET(request);
    await response.json();

    // eq called twice: once for user_id, once for location=feed
    expect(mockDocsQuery.eq).toHaveBeenCalledWith('location', 'feed');
  });

  it('should handle database query errors', async () => {
    const mockDocsQuery = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      in: vi.fn().mockReturnThis(),
      or: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
      limit: vi.fn().mockResolvedValue({
        data: null,
        error: { message: 'Database error' },
      }),
    };

    mockFrom.mockImplementation(() => mockDocsQuery);

    const request = createRequest({ q: 'agents' });
    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data.error).toBe('Search failed');
  });

  it('should handle empty results', async () => {
    const mockDocsQuery = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      in: vi.fn().mockReturnThis(),
      or: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
      limit: vi.fn().mockResolvedValue({
        data: [],
        error: null,
      }),
    };

    mockFrom.mockImplementation(() => mockDocsQuery);

    const request = createRequest({ q: 'nonexistent' });
    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.results).toHaveLength(0);
    expect(data.count).toBe(0);
  });

  it('should handle null fields gracefully', async () => {
    const mockDocsQuery = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      in: vi.fn().mockReturnThis(),
      or: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
      limit: vi.fn().mockResolvedValue({
        data: [
          {
            id: 'cache-3',
            user_id: 'user-123',
            reader_document_id: 'doc-3',
            title: null,
            author: null,
            source: null,
            site_name: null,
            url: 'https://read.readwise.io/doc-3',
            source_url: null,
            category: 'article',
            location: null,
            tags: null,
            word_count: null,
            reading_progress: 0,
            summary: null,
            image_url: null,
            published_date: null,
            reader_created_at: '2026-01-14T10:00:00Z',
            reader_last_moved_at: null,
            reader_saved_at: null,
            reader_updated_at: null,
            cached_at: '2026-01-14T10:00:00Z',
          },
        ],
        error: null,
      }),
    };

    mockFrom.mockImplementation(() => mockDocsQuery);

    const request = createRequest({ q: 'test' });
    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.results[0].title).toBe('Untitled');
    expect(data.results[0].author).toBe('Unknown author');
    expect(data.results[0].sourceName).toBe('Unknown');
    expect(data.results[0].readTime).toBe('1 min');
    expect(data.results[0].tags).toEqual([]);
  });

  it('should respect limit parameter', async () => {
    const mockDocsQuery = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      in: vi.fn().mockReturnThis(),
      or: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
      limit: vi.fn().mockResolvedValue({
        data: mockCachedDocuments,
        error: null,
      }),
    };

    mockFrom.mockImplementation(() => mockDocsQuery);

    const request = createRequest({ q: 'agents', limit: '10' });
    await GET(request);

    expect(mockDocsQuery.limit).toHaveBeenCalledWith(10);
  });

  it('should cap limit at 50', async () => {
    const mockDocsQuery = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      in: vi.fn().mockReturnThis(),
      or: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
      limit: vi.fn().mockResolvedValue({
        data: mockCachedDocuments,
        error: null,
      }),
    };

    mockFrom.mockImplementation(() => mockDocsQuery);

    const request = createRequest({ q: 'agents', limit: '100' });
    await GET(request);

    expect(mockDocsQuery.limit).toHaveBeenCalledWith(50);
  });
});
