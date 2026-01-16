import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import {
  createReaderClient,
  ReaderApiException,
  DocumentLocation,
  DocumentCategory,
} from '@/lib/reader';

interface DocumentsResponse {
  documents?: Array<{
    id: string;
    title: string;
    author: string | null;
    source: string | null;
    siteName: string | null;
    url: string;
    sourceUrl: string;
    category: string;
    location: string;
    tags: string[];
    wordCount: number | null;
    readingProgress: number;
    summary: string | null;
    imageUrl: string | null;
    publishedDate: string | null;
    createdAt: string;
  }>;
  nextCursor?: string | null;
  count?: number;
  error?: string;
}

/**
 * GET /api/reader/documents
 *
 * Fetches documents from the user's Readwise Reader library.
 * Supports filtering by location, category, and tag.
 *
 * Query parameters:
 * - location: 'new' | 'later' | 'shortlist' | 'archive' | 'feed'
 * - category: 'article' | 'email' | 'rss' | 'pdf' | 'epub' | 'tweet' | 'video'
 * - tag: string - filter by tag name
 * - cursor: string - pagination cursor
 * - pageSize: number - results per page (max 100)
 */
export async function GET(request: NextRequest): Promise<NextResponse<DocumentsResponse>> {
  try {
    // Get authenticated user
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    // Get user's Reader token
    const { data: userData, error: fetchError } = await supabase
      .from('users')
      .select('reader_access_token')
      .eq('id', user.id)
      .single();

    if (fetchError || !userData?.reader_access_token) {
      return NextResponse.json(
        { error: 'Readwise Reader not connected. Please connect your account first.' },
        { status: 400 }
      );
    }

    // Parse query parameters
    const searchParams = request.nextUrl.searchParams;
    const location = searchParams.get('location') as DocumentLocation | null;
    const category = searchParams.get('category') as DocumentCategory | null;
    const tag = searchParams.get('tag');
    const cursor = searchParams.get('cursor');
    const pageSizeParam = searchParams.get('pageSize');
    const pageSize = pageSizeParam ? Math.min(parseInt(pageSizeParam, 10), 100) : 20;

    // Create Reader client and fetch documents
    const readerClient = createReaderClient(userData.reader_access_token);

    try {
      const response = await readerClient.listDocuments({
        location: location || undefined,
        category: category || undefined,
        tag: tag || undefined,
        pageCursor: cursor || undefined,
        pageSize,
      });

      // Transform documents to our API format
      const documents = response.results.map((doc) => ({
        id: doc.id,
        title: doc.title,
        author: doc.author,
        source: doc.source,
        siteName: doc.site_name,
        url: doc.url,
        sourceUrl: doc.source_url,
        category: doc.category,
        location: doc.location,
        tags: Object.keys(doc.tags || {}),
        wordCount: doc.word_count,
        readingProgress: doc.reading_progress,
        summary: doc.summary,
        imageUrl: doc.image_url,
        publishedDate: doc.published_date,
        createdAt: doc.created_at,
      }));

      return NextResponse.json({
        documents,
        nextCursor: response.nextPageCursor,
        count: response.count,
      });
    } catch (error) {
      if (error instanceof ReaderApiException) {
        if (error.status === 401 || error.status === 403) {
          return NextResponse.json(
            { error: 'Reader access token is invalid or expired. Please reconnect your account.' },
            { status: 401 }
          );
        }
        if (error.status === 429) {
          return NextResponse.json(
            { error: 'Too many requests to Readwise. Please try again later.' },
            { status: 429 }
          );
        }
        return NextResponse.json(
          { error: 'Failed to fetch documents from Readwise.' },
          { status: 502 }
        );
      }
      throw error;
    }
  } catch (error) {
    console.error('Error fetching documents:', error);
    return NextResponse.json({ error: 'An unexpected error occurred' }, { status: 500 });
  }
}
