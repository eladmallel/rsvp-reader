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

const mockDocument = {
  id: 'doc-123',
  title: 'Test Article',
  author: 'Test Author',
  source: 'test.com',
  site_name: 'Test Site',
  url: 'https://read.readwise.io/doc-123',
  source_url: 'https://test.com/article',
  category: 'article',
  location: 'later',
  tags: {
    dev: { name: 'dev', type: 'manual', created: 0 },
    typescript: { name: 'typescript', type: 'manual', created: 0 },
  },
  word_count: 1500,
  reading_progress: 0.5,
  summary: 'Test summary',
  image_url: 'https://test.com/image.jpg',
  published_date: '2026-01-10',
  created_at: '2026-01-15T10:00:00Z',
  updated_at: '2026-01-15T10:00:00Z',
  notes: null,
  parent_id: null,
};

const mockDocumentWithContent = {
  ...mockDocument,
  html_content: '<p>This is the article content.</p>',
};

// Mocks
const mockGetUser = vi.fn();
const mockSelect = vi.fn();
const mockEq = vi.fn();
const mockSingle = vi.fn();
const mockGetDocument = vi.fn();
const mockUpsert = vi.fn();

vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(() =>
    Promise.resolve({
      auth: {
        getUser: mockGetUser,
      },
      from: vi.fn((table: string) => {
        if (table === 'cached_articles') {
          return {
            select: vi.fn(() => ({
              eq: vi.fn(() => ({
                eq: vi.fn(() => ({
                  single: vi.fn().mockResolvedValue({ data: null, error: null }),
                })),
              })),
            })),
            upsert: mockUpsert.mockResolvedValue({ error: null }),
          };
        }
        return {
          select: mockSelect,
        };
      }),
    })
  ),
}));

vi.mock('@/lib/reader', () => ({
  createReaderClient: vi.fn(() => ({
    getDocument: mockGetDocument,
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

describe('GET /api/reader/documents/[id]', () => {
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

    mockGetDocument.mockResolvedValue(mockDocument);
  });

  function createRequest(
    documentId: string,
    params: Record<string, string> = {}
  ): [NextRequest, { params: Promise<{ id: string }> }] {
    const url = new URL(`http://localhost:3000/api/reader/documents/${documentId}`);
    Object.entries(params).forEach(([key, value]) => {
      url.searchParams.set(key, value);
    });
    return [new NextRequest(url), { params: Promise.resolve({ id: documentId }) }];
  }

  it('should return 401 if user is not authenticated', async () => {
    mockGetUser.mockResolvedValue({
      data: { user: null },
      error: { message: 'Not authenticated' },
    });

    const [request, context] = createRequest('doc-123');
    const response = await GET(request, context);
    const data = await response.json();

    expect(response.status).toBe(401);
    expect(data.error).toBe('Authentication required');
  });

  it('should return 400 if Reader is not connected', async () => {
    mockSingle.mockResolvedValue({
      data: { reader_access_token: null },
      error: null,
    });

    const [request, context] = createRequest('doc-123');
    const response = await GET(request, context);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toContain('not connected');
  });

  it('should return document on success', async () => {
    const [request, context] = createRequest('doc-123');
    const response = await GET(request, context);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.document.id).toBe('doc-123');
    expect(data.document.title).toBe('Test Article');
    expect(data.document.tags).toEqual(['dev', 'typescript']);
  });

  it('should not include content by default', async () => {
    const [request, context] = createRequest('doc-123');
    const response = await GET(request, context);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(mockGetDocument).toHaveBeenCalledWith('doc-123', false);
    expect(data.document.htmlContent).toBeUndefined();
  });

  it('should include content when requested', async () => {
    mockGetDocument.mockResolvedValue(mockDocumentWithContent);

    const [request, context] = createRequest('doc-123', { content: 'true' });
    const response = await GET(request, context);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(mockGetDocument).toHaveBeenCalledWith('doc-123', true);
    expect(data.document.htmlContent).toBe('<p>This is the article content.</p>');
  });

  it('should pass includeContent flag when content=true is requested', async () => {
    const [request, context] = createRequest('doc-123', { content: 'true' });
    const response = await GET(request, context);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(mockGetDocument).toHaveBeenCalledWith('doc-123', true);
    expect(data.document.htmlContent).toBeUndefined();
  });

  it('should handle null fields from the Reader API', async () => {
    mockGetDocument.mockResolvedValue({
      ...mockDocument,
      title: null,
      source_url: null,
      location: null,
      tags: null,
    });

    const [request, context] = createRequest('doc-123');
    const response = await GET(request, context);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.document.title).toBeNull();
    expect(data.document.sourceUrl).toBeNull();
    expect(data.document.location).toBeNull();
    expect(data.document.tags).toEqual([]);
  });

  it('should return 404 if document not found', async () => {
    const { ReaderApiException } = await import('@/lib/reader');
    mockGetDocument.mockRejectedValue(new ReaderApiException('Not found', 404));

    const [request, context] = createRequest('nonexistent');
    const response = await GET(request, context);
    const data = await response.json();

    expect(response.status).toBe(404);
    expect(data.error).toBe('Document not found');
  });

  it('should return 401 if Reader token is invalid', async () => {
    const { ReaderApiException } = await import('@/lib/reader');
    mockGetDocument.mockRejectedValue(new ReaderApiException('Invalid token', 401));

    const [request, context] = createRequest('doc-123');
    const response = await GET(request, context);
    const data = await response.json();

    expect(response.status).toBe(401);
    expect(data.error).toContain('invalid or expired');
  });

  it('should return 429 if rate limited', async () => {
    const { ReaderApiException } = await import('@/lib/reader');
    mockGetDocument.mockRejectedValue(new ReaderApiException('Rate limited', 429));

    const [request, context] = createRequest('doc-123');
    const response = await GET(request, context);
    const data = await response.json();

    expect(response.status).toBe(429);
    expect(data.error).toContain('Too many requests');
  });

  it('should transform document properties to camelCase', async () => {
    const [request, context] = createRequest('doc-123');
    const response = await GET(request, context);
    const data = await response.json();

    expect(data.document).toHaveProperty('siteName');
    expect(data.document).toHaveProperty('sourceUrl');
    expect(data.document).toHaveProperty('wordCount');
    expect(data.document).toHaveProperty('readingProgress');
    expect(data.document).toHaveProperty('imageUrl');
    expect(data.document).toHaveProperty('publishedDate');
    expect(data.document).toHaveProperty('createdAt');
  });
});
