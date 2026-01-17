/**
 * Readwise Reader API Integration Tests
 *
 * These tests hit the real Readwise API to verify our client works correctly.
 * They require a valid READWISE_ACCESS_TOKEN environment variable.
 *
 * To run locally:
 *   source .env.local && READWISE_ACCESS_TOKEN=$READWISE_ACCESS_TOKEN npm run test -- api.integration
 *
 * In CI, the token should be set as a GitHub Actions secret.
 *
 * NOTE: These tests are designed to minimize API calls to avoid rate limiting
 * (Readwise allows 20 requests per minute).
 */

import { describe, it, expect, beforeAll } from 'vitest';
import { createReaderClient, ReaderClient } from './api';
import { ReaderDocument, ListDocumentsResponse } from './types';

const READWISE_TOKEN = process.env.READWISE_ACCESS_TOKEN;

// Skip all tests if no token is available
const describeIntegration = READWISE_TOKEN ? describe : describe.skip;

describeIntegration('Readwise Reader API Integration Tests', () => {
  let client: ReaderClient;

  // Cache responses to minimize API calls
  let cachedListResponse: ListDocumentsResponse | null = null;
  let cachedDocument: ReaderDocument | null = null;

  beforeAll(() => {
    if (!READWISE_TOKEN) {
      throw new Error('READWISE_ACCESS_TOKEN environment variable is required');
    }
    client = createReaderClient(READWISE_TOKEN);
  });

  /**
   * Test 1: Validate token works
   * This is the simplest API call - it verifies the token is valid.
   */
  it('should validate token and confirm API access', async () => {
    const isValid = await client.validateToken();
    expect(isValid).toBe(true);
  });

  /**
   * Test 2: List documents and verify response structure
   * We cache the response to use in subsequent tests.
   */
  it('should list documents with correct response structure', async () => {
    cachedListResponse = await client.listDocuments({ pageSize: 10 });

    // Verify response structure
    expect(cachedListResponse).toHaveProperty('count');
    expect(cachedListResponse).toHaveProperty('results');
    expect(cachedListResponse).toHaveProperty('nextPageCursor');
    expect(Array.isArray(cachedListResponse.results)).toBe(true);
    expect(typeof cachedListResponse.count).toBe('number');
    expect(cachedListResponse.count).toBeGreaterThanOrEqual(0);
  });

  /**
   * Test 3: Verify document fields from cached response
   * No API call needed - uses cached data.
   */
  it('should return documents with expected fields', () => {
    expect(cachedListResponse).not.toBeNull();

    if (cachedListResponse!.results.length > 0) {
      const doc = cachedListResponse!.results[0];
      cachedDocument = doc; // Cache for later tests

      // Verify required fields exist
      expect(doc).toHaveProperty('id');
      expect(doc).toHaveProperty('url');
      expect(doc).toHaveProperty('title');
      expect(doc).toHaveProperty('category');
      expect(doc).toHaveProperty('location');
      expect(doc).toHaveProperty('created_at');
      expect(doc).toHaveProperty('updated_at');

      // Verify types
      expect(typeof doc.id).toBe('string');
      expect(typeof doc.title).toBe('string');
      expect(doc.id.length).toBeGreaterThan(0);

      // String fields
      expect(typeof doc.url).toBe('string');
      expect(typeof doc.category).toBe('string');
      expect(typeof doc.location).toBe('string');
      expect(typeof doc.created_at).toBe('string');
      expect(typeof doc.updated_at).toBe('string');

      // Nullable fields
      if (doc.author !== null) {
        expect(typeof doc.author).toBe('string');
      }
      if (doc.source !== null) {
        expect(typeof doc.source).toBe('string');
      }

      // Number fields
      expect(typeof doc.reading_progress).toBe('number');
      if (doc.word_count !== null) {
        expect(typeof doc.word_count).toBe('number');
      }

      // Tags should be an object
      expect(typeof doc.tags).toBe('object');
    }
  });

  /**
   * Test 4: Verify timestamps from cached response
   * No API call needed - uses cached data.
   */
  it('should have valid ISO timestamps', () => {
    expect(cachedListResponse).not.toBeNull();

    for (const doc of cachedListResponse!.results) {
      const createdAt = new Date(doc.created_at);
      const updatedAt = new Date(doc.updated_at);

      expect(createdAt.toString()).not.toBe('Invalid Date');
      expect(updatedAt.toString()).not.toBe('Invalid Date');

      if (doc.published_date !== null) {
        const publishedDate = new Date(doc.published_date);
        expect(publishedDate.toString()).not.toBe('Invalid Date');
      }
    }
  });

  /**
   * Test 5: Filter by location
   * Single API call to test filtering.
   */
  it('should filter documents by location', async () => {
    const response = await client.listDocuments({
      location: 'later',
      pageSize: 5,
    });

    // All returned documents should have 'later' location
    for (const doc of response.results) {
      expect(doc.location).toBe('later');
    }
  });

  /**
   * Test 6: Filter by category
   * Single API call to test category filtering.
   */
  it('should filter documents by category', async () => {
    const response = await client.listDocuments({
      category: 'article',
      pageSize: 5,
    });

    // All returned documents should be articles
    for (const doc of response.results) {
      expect(doc.category).toBe('article');
    }
  });

  /**
   * Test 7: Get single document by ID
   * Uses cached document ID to minimize guesswork.
   */
  it('should fetch a single document by ID', async () => {
    if (!cachedDocument) {
      console.warn('No documents in library - skipping single document test');
      return;
    }

    const doc = await client.getDocument(cachedDocument.id);

    expect(doc.id).toBe(cachedDocument.id);
    expect(doc).toHaveProperty('title');
    expect(doc).toHaveProperty('category');
    expect(doc).toHaveProperty('location');
  });

  /**
   * Test 8: Get document with HTML content
   * Tests the withHtmlContent parameter.
   */
  it('should fetch document with content parameter', async () => {
    if (!cachedDocument) {
      console.warn('No documents in library - skipping content test');
      return;
    }

    const doc = await client.getDocument(cachedDocument.id, true);

    expect(doc.id).toBe(cachedDocument.id);
    expect(doc).toHaveProperty('title');

    // Note: html_content may or may not be present depending on document type
    // The important thing is the request succeeds with includeContent=true
    if ('html_content' in doc && doc.html_content !== null) {
      expect(typeof doc.html_content).toBe('string');
    }
  });

  /**
   * Test 9: Error handling for invalid document ID
   * Tests that invalid IDs are handled gracefully.
   */
  it('should handle invalid document ID with error', async () => {
    try {
      await client.getDocument('nonexistent-document-id-12345');
      expect.fail('Should have thrown an error');
    } catch (error) {
      // The API may return 400 (bad request) or 429 (rate limit)
      // or our wrapper may return 404. All are acceptable error responses.
      const status = (error as { status: number }).status;
      expect(status).toBeGreaterThanOrEqual(400);
    }
  });
});
