import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import type { Json } from '@/lib/supabase/types';

interface SearchResult {
  id: string;
  title: string;
  titleHighlight: string;
  snippet: string;
  snippetHighlight: string;
  source: string;
  sourceName: string;
  author: string;
  readTime: string;
  tags: string[];
  thumbnail?: string;
  location: string;
  createdAt: string;
}

interface SearchResponse {
  results?: SearchResult[];
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

// Helper to highlight text with <mark> tags
function highlightText(text: string, query: string): string {
  if (!text || !query) return text || '';

  // Escape special regex characters in query
  const escapedQuery = query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const regex = new RegExp(`(${escapedQuery})`, 'gi');
  return text.replace(regex, '<mark>$1</mark>');
}

// Helper to create snippet around search term
function createSnippet(text: string | null, query: string, maxLength: number = 150): string {
  if (!text) return '';

  const lowerText = text.toLowerCase();
  const lowerQuery = query.toLowerCase();
  const index = lowerText.indexOf(lowerQuery);

  if (index === -1) {
    // Query not found, return beginning of text
    return text.length > maxLength ? text.slice(0, maxLength) + '...' : text;
  }

  // Calculate start position to center query in snippet
  const contextBefore = Math.floor((maxLength - query.length) / 2);
  let start = Math.max(0, index - contextBefore);
  const end = Math.min(text.length, start + maxLength);

  // Adjust start if end is at the boundary
  if (end - start < maxLength && start > 0) {
    start = Math.max(0, end - maxLength);
  }

  let snippet = text.slice(start, end);

  // Add ellipsis if needed
  if (start > 0) snippet = '...' + snippet;
  if (end < text.length) snippet = snippet + '...';

  return snippet;
}

// Helper to calculate reading time
function calculateReadTime(wordCount: number | null): string {
  if (!wordCount) return '1 min';
  const minutes = Math.ceil(wordCount / 200); // 200 WPM average
  return `${minutes} min`;
}

/**
 * GET /api/search
 *
 * Searches across the user's cached documents.
 * Searches in title, author, summary, and content.
 *
 * Query parameters:
 * - q: string - search query (required)
 * - filter: 'all' | 'library' | 'feed' | 'highlights' - filter by location
 * - limit: number - max results (default 20, max 50)
 */
export async function GET(request: NextRequest): Promise<NextResponse<SearchResponse>> {
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

    // Parse query parameters
    const searchParams = request.nextUrl.searchParams;
    const query = searchParams.get('q');
    const filter = searchParams.get('filter') || 'all';
    const limitParam = searchParams.get('limit');
    const limit = limitParam ? Math.min(parseInt(limitParam, 10), 50) : 20;

    if (!query || query.trim().length === 0) {
      return NextResponse.json({ error: 'Search query is required' }, { status: 400 });
    }

    const searchQuery = query.trim();

    // Build search query using Postgres full-text search
    // Search across title, author, summary, and site_name
    let dbQuery = supabase
      .from('cached_documents')
      .select('*')
      .eq('user_id', user.id)
      .or(
        `title.ilike.%${searchQuery}%,author.ilike.%${searchQuery}%,summary.ilike.%${searchQuery}%,site_name.ilike.%${searchQuery}%`
      );

    // Apply location filter
    if (filter === 'library') {
      dbQuery = dbQuery.in('location', ['new', 'later', 'shortlist']);
    } else if (filter === 'feed') {
      dbQuery = dbQuery.eq('location', 'feed');
    }
    // Note: 'highlights' filter would require a separate highlights table
    // For now, we only support 'all', 'library', and 'feed'

    dbQuery = dbQuery
      .order('reader_last_moved_at', { ascending: false })
      .order('reader_updated_at', { ascending: false })
      .limit(limit);

    const { data: documents, error: queryError } = await dbQuery;

    if (queryError) {
      console.error('Error searching documents:', queryError);
      return NextResponse.json({ error: 'Search failed' }, { status: 500 });
    }

    // Transform and highlight results
    const results: SearchResult[] = (documents || []).map((doc) => {
      const snippet = createSnippet(doc.summary || doc.title, searchQuery);

      return {
        id: doc.reader_document_id,
        title: doc.title || 'Untitled',
        titleHighlight: highlightText(doc.title || 'Untitled', searchQuery),
        snippet,
        snippetHighlight: highlightText(snippet, searchQuery),
        source: doc.url,
        sourceName: doc.site_name || 'Unknown',
        author: doc.author || 'Unknown author',
        readTime: calculateReadTime(doc.word_count),
        tags: extractTagNames(doc.tags),
        thumbnail: doc.image_url || undefined,
        location: doc.location || 'new',
        createdAt:
          doc.reader_last_moved_at ||
          doc.reader_updated_at ||
          doc.reader_created_at ||
          doc.cached_at,
      };
    });

    return NextResponse.json({
      results,
      count: results.length,
    });
  } catch (error) {
    console.error('Error in search:', error);
    return NextResponse.json({ error: 'An unexpected error occurred' }, { status: 500 });
  }
}
