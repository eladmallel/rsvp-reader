import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import type { Json } from '@/lib/supabase/types';

interface DocumentFromCache {
  id: string;
  title: string | null;
  author: string | null;
  source: string | null;
  siteName: string | null;
  url: string;
  sourceUrl: string | null;
  category: string;
  location: string | null;
  tags: string[];
  wordCount: number | null;
  readingProgress: number;
  summary: string | null;
  imageUrl: string | null;
  publishedDate: string | null;
  createdAt: string;
}

interface DocumentsResponse {
  documents?: DocumentFromCache[];
  nextCursor?: string | null;
  count?: number;
  error?: string;
}

// Helper to extract tag names from the JSONB tags structure
function extractTagNames(tags: Json | null): string[] {
  if (!tags || typeof tags !== 'object' || Array.isArray(tags)) {
    return [];
  }
  return Object.keys(tags);
}

/**
 * GET /api/reader/documents
 *
 * Fetches documents from the user's cached Readwise Reader library.
 * Reads from the database cache instead of calling Readwise API directly.
 * Supports filtering by location, category, and tag.
 *
 * Query parameters:
 * - location: 'new' | 'later' | 'shortlist' | 'archive' | 'feed' | 'library'
 * - category: 'article' | 'email' | 'rss' | 'pdf' | 'epub' | 'tweet' | 'video'
 * - tag: string - filter by tag name
 * - cursor: string - pagination cursor (offset-based)
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

    // Check if user has connected Reader (has a token)
    const { data: userData, error: fetchError } = await supabase
      .from('users')
      .select('reader_access_token, reader_access_token_encrypted')
      .eq('id', user.id)
      .single();

    const hasToken = !!userData?.reader_access_token_encrypted || !!userData?.reader_access_token;

    if (fetchError || !hasToken) {
      return NextResponse.json(
        { error: 'Readwise Reader not connected. Please connect your account first.' },
        { status: 400 }
      );
    }

    // Parse query parameters
    const searchParams = request.nextUrl.searchParams;
    const location = searchParams.get('location');
    const category = searchParams.get('category');
    const tag = searchParams.get('tag');
    const cursor = searchParams.get('cursor');
    const pageSizeParam = searchParams.get('pageSize');
    const pageSize = pageSizeParam ? Math.min(parseInt(pageSizeParam, 10), 100) : 20;

    // Calculate offset from cursor (cursor is the offset number as string)
    const offset = cursor ? parseInt(cursor, 10) : 0;

    // Build query for cached_documents
    let query = supabase
      .from('cached_documents')
      .select('*', { count: 'exact' })
      .eq('user_id', user.id);

    // Apply filters
    if (location) {
      if (location === 'library') {
        query = query.in('location', ['new', 'later', 'shortlist']);
      } else {
        query = query.eq('location', location);
      }
    }
    if (category) {
      query = query.eq('category', category);
    }
    if (tag) {
      // Use JSONB containment operator to filter by tag
      // tags is stored as { "tagname": { "name": "tagname", ... } }
      query = query.filter('tags', 'cs', `{"${tag}": {}}`);
    }

    query = query
      .order('reader_last_moved_at', { ascending: false })
      .order('reader_updated_at', { ascending: false })
      .order('reader_created_at', { ascending: false })
      .range(offset, offset + pageSize - 1);

    const { data: documents, error: queryError, count } = await query;

    if (queryError) {
      console.error('Error fetching cached documents:', queryError);
      return NextResponse.json({ error: 'Failed to fetch documents' }, { status: 500 });
    }

    // Transform documents to API format
    const transformedDocuments: DocumentFromCache[] = (documents || []).map((doc) => ({
      id: doc.reader_document_id,
      title: doc.title,
      author: doc.author,
      source: doc.source,
      siteName: doc.site_name,
      url: doc.url,
      sourceUrl: doc.source_url,
      category: doc.category,
      location: doc.location,
      tags: extractTagNames(doc.tags),
      wordCount: doc.word_count,
      readingProgress: doc.reading_progress ?? 0,
      summary: doc.summary,
      imageUrl: doc.image_url,
      publishedDate: doc.published_date,
      createdAt:
        doc.reader_last_moved_at ||
        doc.reader_updated_at ||
        doc.reader_created_at ||
        doc.cached_at ||
        new Date().toISOString(),
    }));

    // Calculate next cursor
    const nextOffset = offset + pageSize;
    const hasMore = count !== null && nextOffset < count;
    const nextCursor = hasMore ? nextOffset.toString() : null;

    return NextResponse.json({
      documents: transformedDocuments,
      nextCursor,
      count: count ?? documents?.length ?? 0,
    });
  } catch (error) {
    console.error('Error fetching documents:', error);
    return NextResponse.json({ error: 'An unexpected error occurred' }, { status: 500 });
  }
}
