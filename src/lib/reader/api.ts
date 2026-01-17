/**
 * Readwise Reader API Wrapper
 *
 * Client for interacting with the Readwise Reader API v3.
 * All methods require an access token for authentication.
 */

import {
  ReaderDocument,
  ReaderDocumentWithContent,
  ReaderTag,
  ListDocumentsParams,
  ListDocumentsResponse,
  ReaderApiException,
} from './types';

const READER_API_BASE_URL = 'https://readwise.io/api/v3';

/** Rate limit: 20 requests per minute for read operations */
const RATE_LIMIT_REQUESTS = 20;
const RATE_LIMIT_WINDOW_MS = 60 * 1000;

interface FetchOptions {
  method?: 'GET' | 'POST' | 'PATCH' | 'DELETE';
  body?: Record<string, unknown>;
  params?: Record<string, string | number | boolean | undefined>;
}

/**
 * Creates a Reader API client with the given access token.
 */
export function createReaderClient(accessToken: string) {
  let requestTimestamps: number[] = [];

  /**
   * Check and enforce rate limiting
   */
  function checkRateLimit(): void {
    const now = Date.now();
    // Remove timestamps outside the window
    requestTimestamps = requestTimestamps.filter((ts) => now - ts < RATE_LIMIT_WINDOW_MS);

    if (requestTimestamps.length >= RATE_LIMIT_REQUESTS) {
      const oldestTimestamp = requestTimestamps[0];
      const waitTime = RATE_LIMIT_WINDOW_MS - (now - oldestTimestamp);
      throw new ReaderApiException(
        `Rate limit exceeded. Try again in ${Math.ceil(waitTime / 1000)} seconds.`,
        429
      );
    }
  }

  /**
   * Make an authenticated request to the Reader API
   */
  async function fetchApi<T>(endpoint: string, options: FetchOptions = {}): Promise<T> {
    checkRateLimit();

    const { method = 'GET', body, params } = options;

    // Build URL with query params
    const url = new URL(`${READER_API_BASE_URL}${endpoint}`);
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined) {
          url.searchParams.append(key, String(value));
        }
      });
    }

    const headers: HeadersInit = {
      Authorization: `Token ${accessToken}`,
      'Content-Type': 'application/json',
    };

    const fetchOptions: RequestInit = {
      method,
      headers,
    };

    if (body) {
      fetchOptions.body = JSON.stringify(body);
    }

    // Track request for rate limiting
    requestTimestamps.push(Date.now());

    const response = await fetch(url.toString(), fetchOptions);

    if (!response.ok) {
      const retryAfterHeader = response.headers.get('retry-after');
      const retryAfterSeconds = retryAfterHeader ? parseInt(retryAfterHeader, 10) : undefined;
      let detail: string | undefined;
      try {
        const errorBody = await response.json();
        detail = errorBody.detail || errorBody.message;
      } catch {
        // Ignore JSON parse errors
      }

      throw new ReaderApiException(
        detail || `Request failed with status ${response.status}`,
        response.status,
        detail,
        Number.isNaN(retryAfterSeconds) ? undefined : retryAfterSeconds
      );
    }

    return response.json() as Promise<T>;
  }

  return {
    /**
     * Validate the access token by making a simple API call.
     * Returns true if the token is valid, throws an error otherwise.
     */
    async validateToken(): Promise<boolean> {
      // Make a minimal request to check if the token is valid
      await fetchApi<ListDocumentsResponse>('/list/', {
        params: { limit: 1 },
      });
      return true;
    },

    /**
     * List documents from the user's Reader library.
     *
     * @param params - Optional filtering and pagination parameters
     * @returns Paginated list of documents
     */
    async listDocuments(params: ListDocumentsParams = {}): Promise<ListDocumentsResponse> {
      const apiParams: Record<string, string | number | boolean | undefined> = {};

      if (params.location) {
        apiParams.location = params.location;
      }
      if (params.category) {
        apiParams.category = params.category;
      }
      if (params.tag) {
        // Tags are filtered by adding the tag name to the tags parameter
        apiParams.tag = params.tag;
      }
      if (params.pageCursor) {
        apiParams.pageCursor = params.pageCursor;
      }
      if (params.pageSize) {
        apiParams.limit = params.pageSize;
      }
      if (params.updatedAfter) {
        apiParams.updatedAfter = params.updatedAfter;
      }
      if (params.withHtmlContent !== undefined) {
        apiParams.withHtmlContent = params.withHtmlContent;
      }

      return fetchApi<ListDocumentsResponse>('/list/', { params: apiParams });
    },

    /**
     * Get a single document by ID, optionally with HTML content.
     *
     * @param documentId - The document ID
     * @param includeContent - Whether to include the HTML content (default: false)
     * @returns The document with or without content
     */
    async getDocument(
      documentId: string,
      includeContent = false
    ): Promise<ReaderDocument | ReaderDocumentWithContent> {
      const params: Record<string, string | number | undefined> = {
        id: documentId,
      };

      if (includeContent) {
        params.withHtmlContent = 'true';
      }

      const response = await fetchApi<ListDocumentsResponse>('/list/', { params });

      if (response.results.length === 0) {
        throw new ReaderApiException(`Document not found: ${documentId}`, 404);
      }

      return response.results[0] as ReaderDocument | ReaderDocumentWithContent;
    },

    /**
     * Get all tags used in the user's library.
     *
     * Note: The Reader API doesn't have a dedicated tags endpoint,
     * so we aggregate tags from documents.
     *
     * @returns Array of tags with document counts
     */
    async getTags(): Promise<ReaderTag[]> {
      const tagCounts = new Map<string, number>();
      let cursor: string | undefined;

      // Fetch all documents to aggregate tags
      // This is expensive but Reader API doesn't have a tags endpoint
      do {
        const response = await fetchApi<ListDocumentsResponse>('/list/', {
          params: {
            limit: 100,
            pageCursor: cursor,
          },
        });

        for (const doc of response.results) {
          if (doc.tags) {
            for (const tagName of Object.keys(doc.tags)) {
              tagCounts.set(tagName, (tagCounts.get(tagName) || 0) + 1);
            }
          }
        }

        cursor = response.nextPageCursor ?? undefined;
      } while (cursor);

      // Convert to array and sort by count (descending)
      return Array.from(tagCounts.entries())
        .map(([name, count]) => ({ name, count }))
        .sort((a, b) => b.count - a.count);
    },

    /**
     * Get all documents, handling pagination automatically.
     *
     * @param params - Optional filtering parameters (pagination params are ignored)
     * @returns Array of all matching documents
     */
    async getAllDocuments(
      params: Omit<ListDocumentsParams, 'pageCursor' | 'pageSize'> = {}
    ): Promise<ReaderDocument[]> {
      const allDocuments: ReaderDocument[] = [];
      let cursor: string | undefined;

      do {
        const response = await this.listDocuments({
          ...params,
          pageCursor: cursor,
          pageSize: 100,
        });

        allDocuments.push(...response.results);
        cursor = response.nextPageCursor ?? undefined;
      } while (cursor);

      return allDocuments;
    },
  };
}

export type ReaderClient = ReturnType<typeof createReaderClient>;
