import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { createReaderClient, ReaderClient } from './api';
import { ReaderApiException, ReaderDocument, ListDocumentsResponse } from './types';

// Mock fetch globally
const mockFetch = vi.fn();
global.fetch = mockFetch;

describe('Reader API Client', () => {
  let client: ReaderClient;
  const TEST_TOKEN = 'test-access-token-12345';

  beforeEach(() => {
    client = createReaderClient(TEST_TOKEN);
    mockFetch.mockReset();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  // Helper to create a mock document
  function createMockDocument(overrides: Partial<ReaderDocument> = {}): ReaderDocument {
    return {
      id: 'doc-123',
      url: 'https://read.readwise.io/read/doc-123',
      source_url: 'https://example.com/article',
      title: 'Test Article',
      author: 'Test Author',
      source: 'example.com',
      category: 'article',
      location: 'later',
      tags: {
        dev: { name: 'dev', type: 'manual', created: 0 },
        typescript: { name: 'typescript', type: 'manual', created: 0 },
      },
      site_name: 'Example Site',
      word_count: 1500,
      reading_progress: 0,
      summary: 'This is a test article summary.',
      image_url: 'https://example.com/image.jpg',
      published_date: '2026-01-10T12:00:00Z',
      created_at: '2026-01-15T10:00:00Z',
      updated_at: '2026-01-15T10:00:00Z',
      last_moved_at: '2026-01-15T10:00:00Z',
      saved_at: '2026-01-15T09:30:00Z',
      first_opened_at: null,
      last_opened_at: null,
      notes: null,
      parent_id: null,
      ...overrides,
    };
  }

  type TagInfo = NonNullable<ReaderDocument['tags']>[string];

  function createTagMap(tagNames: string[]): Record<string, TagInfo> {
    return Object.fromEntries(
      tagNames.map((name) => [name, { name, type: 'manual', created: 0 }])
    ) as Record<string, TagInfo>;
  }

  // Helper to create a successful mock response
  function mockSuccessResponse<T>(data: T): void {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      headers: new Headers(),
      json: () => Promise.resolve(data),
    });
  }

  // Helper to create an error mock response
  function mockErrorResponse(status: number, detail?: string): void {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status,
      headers: new Headers(),
      json: () => Promise.resolve({ detail }),
    });
  }

  describe('validateToken', () => {
    it('should return true for valid token', async () => {
      const mockResponse: ListDocumentsResponse = {
        count: 10,
        nextPageCursor: null,
        results: [createMockDocument()],
      };
      mockSuccessResponse(mockResponse);

      const result = await client.validateToken();

      expect(result).toBe(true);
      expect(mockFetch).toHaveBeenCalledTimes(1);
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('readwise.io/api/v3/list/'),
        expect.objectContaining({
          method: 'GET',
          headers: expect.objectContaining({
            Authorization: `Token ${TEST_TOKEN}`,
          }),
        })
      );
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('limit=1'),
        expect.any(Object)
      );
    });

    it('should throw error for invalid token', async () => {
      mockErrorResponse(401, 'Invalid token');

      try {
        await client.validateToken();
        expect.fail('Should have thrown');
      } catch (error) {
        expect(error).toBeInstanceOf(ReaderApiException);
        expect((error as ReaderApiException).status).toBe(401);
      }
    });

    it('should include Token prefix in Authorization header', async () => {
      mockSuccessResponse({ count: 0, nextPageCursor: null, results: [] });

      await client.validateToken();

      expect(mockFetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          headers: expect.objectContaining({
            Authorization: 'Token test-access-token-12345',
          }),
        })
      );
    });
  });

  describe('listDocuments', () => {
    it('should fetch documents without filters', async () => {
      const mockDocs = [createMockDocument(), createMockDocument({ id: 'doc-456' })];
      const mockResponse: ListDocumentsResponse = {
        count: 2,
        nextPageCursor: null,
        results: mockDocs,
      };
      mockSuccessResponse(mockResponse);

      const result = await client.listDocuments();

      expect(result.count).toBe(2);
      expect(result.results).toHaveLength(2);
      expect(result.nextPageCursor).toBeNull();
    });

    it('should filter by location', async () => {
      mockSuccessResponse({ count: 1, nextPageCursor: null, results: [createMockDocument()] });

      await client.listDocuments({ location: 'later' });

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('location=later'),
        expect.any(Object)
      );
    });

    it('should filter by category', async () => {
      mockSuccessResponse({ count: 1, nextPageCursor: null, results: [createMockDocument()] });

      await client.listDocuments({ category: 'article' });

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('category=article'),
        expect.any(Object)
      );
    });

    it('should filter by tag', async () => {
      mockSuccessResponse({ count: 1, nextPageCursor: null, results: [createMockDocument()] });

      await client.listDocuments({ tag: 'dev' });

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('tag=dev'),
        expect.any(Object)
      );
    });

    it('should support pagination cursor', async () => {
      mockSuccessResponse({ count: 1, nextPageCursor: null, results: [createMockDocument()] });

      await client.listDocuments({ pageCursor: 'cursor-abc123' });

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('pageCursor=cursor-abc123'),
        expect.any(Object)
      );
    });

    it('should support page size', async () => {
      mockSuccessResponse({ count: 1, nextPageCursor: null, results: [createMockDocument()] });

      await client.listDocuments({ pageSize: 50 });

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('limit=50'),
        expect.any(Object)
      );
    });

    it('should request HTML content when withHtmlContent is true', async () => {
      mockSuccessResponse({ count: 1, nextPageCursor: null, results: [createMockDocument()] });

      await client.listDocuments({ withHtmlContent: true });

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('withHtmlContent=true'),
        expect.any(Object)
      );
    });

    it('should combine multiple filters', async () => {
      mockSuccessResponse({ count: 1, nextPageCursor: null, results: [createMockDocument()] });

      await client.listDocuments({
        location: 'later',
        category: 'article',
        tag: 'dev',
      });

      const callUrl = mockFetch.mock.calls[0][0] as string;
      expect(callUrl).toContain('location=later');
      expect(callUrl).toContain('category=article');
      expect(callUrl).toContain('tag=dev');
    });

    it('should return pagination cursor when more pages exist', async () => {
      const mockResponse: ListDocumentsResponse = {
        count: 150,
        nextPageCursor: 'next-page-cursor',
        results: [createMockDocument()],
      };
      mockSuccessResponse(mockResponse);

      const result = await client.listDocuments({ pageSize: 100 });

      expect(result.nextPageCursor).toBe('next-page-cursor');
    });
  });

  describe('getDocument', () => {
    it('should fetch a single document by ID', async () => {
      const mockDoc = createMockDocument({ id: 'specific-doc-id' });
      mockSuccessResponse({ count: 1, nextPageCursor: null, results: [mockDoc] });

      const result = await client.getDocument('specific-doc-id');

      expect(result.id).toBe('specific-doc-id');
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('id=specific-doc-id'),
        expect.any(Object)
      );
    });

    it('should request HTML content when includeContent is true', async () => {
      const mockDoc = createMockDocument();
      mockSuccessResponse({ count: 1, nextPageCursor: null, results: [mockDoc] });

      await client.getDocument('doc-123', true);

      const callUrl = mockFetch.mock.calls[0][0] as string;
      expect(callUrl).toContain('withHtmlContent=true');
    });

    it('should not request HTML content by default', async () => {
      const mockDoc = createMockDocument();
      mockSuccessResponse({ count: 1, nextPageCursor: null, results: [mockDoc] });

      await client.getDocument('doc-123');

      const callUrl = mockFetch.mock.calls[0][0] as string;
      expect(callUrl).not.toContain('withHtmlContent');
    });

    it('should throw 404 error when document not found', async () => {
      mockSuccessResponse({ count: 0, nextPageCursor: null, results: [] });

      try {
        await client.getDocument('nonexistent-id');
        expect.fail('Should have thrown');
      } catch (error) {
        expect(error).toBeInstanceOf(ReaderApiException);
        expect((error as ReaderApiException).status).toBe(404);
      }
    });
  });

  describe('getTags', () => {
    it('should aggregate tags from all documents', async () => {
      const doc1 = createMockDocument({ tags: createTagMap(['dev', 'typescript']) });
      const doc2 = createMockDocument({ tags: createTagMap(['dev', 'react']) });
      const doc3 = createMockDocument({ tags: createTagMap(['typescript']) });

      mockSuccessResponse({
        count: 3,
        nextPageCursor: null,
        results: [doc1, doc2, doc3],
      });

      const tags = await client.getTags();

      expect(tags).toContainEqual({ name: 'dev', count: 2 });
      expect(tags).toContainEqual({ name: 'typescript', count: 2 });
      expect(tags).toContainEqual({ name: 'react', count: 1 });
    });

    it('should sort tags by count descending', async () => {
      const doc1 = createMockDocument({ tags: createTagMap(['rare']) });
      const doc2 = createMockDocument({ tags: createTagMap(['common']) });
      const doc3 = createMockDocument({ tags: createTagMap(['common']) });
      const doc4 = createMockDocument({ tags: createTagMap(['common']) });

      mockSuccessResponse({
        count: 4,
        nextPageCursor: null,
        results: [doc1, doc2, doc3, doc4],
      });

      const tags = await client.getTags();

      expect(tags[0].name).toBe('common');
      expect(tags[0].count).toBe(3);
      expect(tags[1].name).toBe('rare');
      expect(tags[1].count).toBe(1);
    });

    it('should handle documents without tags', async () => {
      const doc1 = createMockDocument({ tags: createTagMap([]) });
      const doc2 = createMockDocument({ tags: createTagMap(['dev']) });

      mockSuccessResponse({
        count: 2,
        nextPageCursor: null,
        results: [doc1, doc2],
      });

      const tags = await client.getTags();

      expect(tags).toHaveLength(1);
      expect(tags[0]).toEqual({ name: 'dev', count: 1 });
    });

    it('should handle documents with null tags', async () => {
      const doc1 = createMockDocument({ tags: null });
      const doc2 = createMockDocument({ tags: createTagMap(['dev']) });

      mockSuccessResponse({
        count: 2,
        nextPageCursor: null,
        results: [doc1, doc2],
      });

      const tags = await client.getTags();

      expect(tags).toHaveLength(1);
      expect(tags[0]).toEqual({ name: 'dev', count: 1 });
    });

    it('should handle pagination when fetching tags', async () => {
      // First page
      mockSuccessResponse({
        count: 200,
        nextPageCursor: 'page-2-cursor',
        results: [createMockDocument({ tags: createTagMap(['tag1']) })],
      });

      // Second page
      mockSuccessResponse({
        count: 200,
        nextPageCursor: null,
        results: [createMockDocument({ tags: createTagMap(['tag2']) })],
      });

      const tags = await client.getTags();

      expect(mockFetch).toHaveBeenCalledTimes(2);
      expect(tags).toContainEqual({ name: 'tag1', count: 1 });
      expect(tags).toContainEqual({ name: 'tag2', count: 1 });
    });
  });

  describe('getAllDocuments', () => {
    it('should fetch all documents handling pagination', async () => {
      // First page
      mockSuccessResponse({
        count: 150,
        nextPageCursor: 'cursor-page-2',
        results: [createMockDocument({ id: 'doc-1' }), createMockDocument({ id: 'doc-2' })],
      });

      // Second page
      mockSuccessResponse({
        count: 150,
        nextPageCursor: null,
        results: [createMockDocument({ id: 'doc-3' })],
      });

      const allDocs = await client.getAllDocuments();

      expect(allDocs).toHaveLength(3);
      expect(allDocs.map((d) => d.id)).toEqual(['doc-1', 'doc-2', 'doc-3']);
      expect(mockFetch).toHaveBeenCalledTimes(2);
    });

    it('should pass filter params through pagination', async () => {
      mockSuccessResponse({
        count: 1,
        nextPageCursor: null,
        results: [createMockDocument()],
      });

      await client.getAllDocuments({ location: 'later', tag: 'dev' });

      const callUrl = mockFetch.mock.calls[0][0] as string;
      expect(callUrl).toContain('location=later');
      expect(callUrl).toContain('tag=dev');
    });

    it('should return empty array when no documents', async () => {
      mockSuccessResponse({
        count: 0,
        nextPageCursor: null,
        results: [],
      });

      const allDocs = await client.getAllDocuments();

      expect(allDocs).toEqual([]);
    });
  });

  describe('error handling', () => {
    it('should throw ReaderApiException with status code', async () => {
      mockErrorResponse(500, 'Internal server error');

      try {
        await client.listDocuments();
        expect.fail('Should have thrown');
      } catch (error) {
        expect(error).toBeInstanceOf(ReaderApiException);
        expect((error as ReaderApiException).status).toBe(500);
        expect((error as ReaderApiException).message).toBe('Internal server error');
      }
    });

    it('should handle 403 forbidden error', async () => {
      mockErrorResponse(403, 'Access denied');

      await expect(client.listDocuments()).rejects.toMatchObject({
        status: 403,
        message: 'Access denied',
      });
    });

    it('should handle malformed JSON response', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
        headers: new Headers(),
        json: () => Promise.reject(new Error('Invalid JSON')),
      });

      await expect(client.listDocuments()).rejects.toMatchObject({
        status: 500,
      });
    });

    it('should handle network errors', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Network error'));

      await expect(client.listDocuments()).rejects.toThrow('Network error');
    });
  });

  describe('rate limiting', () => {
    it('should throw error when rate limit exceeded', async () => {
      // Make 20 successful requests
      for (let i = 0; i < 20; i++) {
        mockSuccessResponse({ count: 0, nextPageCursor: null, results: [] });
      }

      // Make 20 requests (should all succeed)
      for (let i = 0; i < 20; i++) {
        await client.validateToken();
      }

      // 21st request should fail with rate limit
      await expect(client.validateToken()).rejects.toMatchObject({
        status: 429,
      });
    });
  });
});
