/**
 * Readwise Reader API Types
 * Based on the Readwise Reader API v3
 * https://readwise.io/reader_api
 */

export type DocumentCategory =
  | 'article'
  | 'email'
  | 'rss'
  | 'pdf'
  | 'epub'
  | 'tweet'
  | 'video'
  | 'highlight';

export type DocumentLocation = 'new' | 'later' | 'shortlist' | 'archive' | 'feed';

export interface ReaderDocument {
  /** Unique identifier */
  id: string;
  /** URL for the document in Reader */
  url: string;
  /** Original source URL */
  source_url: string;
  /** Document title */
  title: string;
  /** Author name(s) */
  author: string | null;
  /** Source website name */
  source: string | null;
  /** Document category/type */
  category: DocumentCategory;
  /** Where the document is located (inbox state) */
  location: DocumentLocation;
  /** Tags as a record of tag name to tag value */
  tags: Record<string, string>;
  /** Site name / publication */
  site_name: string | null;
  /** Word count of the document */
  word_count: number | null;
  /** User's reading progress (0-1) */
  reading_progress: number;
  /** AI-generated summary */
  summary: string | null;
  /** Cover/preview image URL */
  image_url: string | null;
  /** Original publish date */
  published_date: string | null;
  /** When the document was created in Reader */
  created_at: string;
  /** When the document was last updated */
  updated_at: string;
  /** Notes added by user */
  notes: string | null;
  /** Parent document ID (for highlights) */
  parent_id: string | null;
}

export interface ReaderDocumentWithContent extends ReaderDocument {
  /** Full HTML content of the document */
  html_content: string | null;
}

export interface ReaderTag {
  /** Tag name */
  name: string;
  /** Number of documents with this tag */
  count: number;
}

export interface ListDocumentsParams {
  /** Filter by location (inbox state) */
  location?: DocumentLocation;
  /** Filter by category */
  category?: DocumentCategory;
  /** Filter by tag name */
  tag?: string;
  /** Pagination cursor */
  pageCursor?: string;
  /** Number of results per page (max 100) */
  pageSize?: number;
  /** Last update time filter (ISO timestamp or Unix epoch) */
  updatedAfter?: string;
}

export interface ListDocumentsResponse {
  /** Total count of matching documents */
  count: number;
  /** Cursor for next page, null if no more pages */
  nextPageCursor: string | null;
  /** Array of documents */
  results: ReaderDocument[];
}

export interface ReaderApiError {
  /** Error message */
  detail: string;
  /** HTTP status code */
  status?: number;
}

export class ReaderApiException extends Error {
  constructor(
    message: string,
    public status: number,
    public detail?: string
  ) {
    super(message);
    this.name = 'ReaderApiException';
  }
}
