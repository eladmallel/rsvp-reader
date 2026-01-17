import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import type { Json } from '@/lib/supabase/types';

interface TagsResponse {
  tags?: Array<{
    name: string;
    count: number;
  }>;
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
 * GET /api/reader/tags
 *
 * Fetches all tags from the user's cached Readwise Reader library.
 * Aggregates tags from cached_documents instead of calling Readwise API.
 */
export async function GET(): Promise<NextResponse<TagsResponse>> {
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
      .select('reader_access_token')
      .eq('id', user.id)
      .single();

    if (fetchError || !userData?.reader_access_token) {
      return NextResponse.json(
        { error: 'Readwise Reader not connected. Please connect your account first.' },
        { status: 400 }
      );
    }

    // Fetch all documents' tags for this user
    const { data: documents, error: queryError } = await supabase
      .from('cached_documents')
      .select('tags')
      .eq('user_id', user.id);

    if (queryError) {
      console.error('Error fetching cached documents for tags:', queryError);
      return NextResponse.json({ error: 'Failed to fetch tags' }, { status: 500 });
    }

    // Aggregate tags and count occurrences
    const tagCounts = new Map<string, number>();

    for (const doc of documents || []) {
      const tagNames = extractTagNames(doc.tags);
      for (const tagName of tagNames) {
        tagCounts.set(tagName, (tagCounts.get(tagName) || 0) + 1);
      }
    }

    // Convert to array and sort by count descending
    const tags = Array.from(tagCounts.entries())
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name));

    return NextResponse.json({ tags });
  } catch (error) {
    console.error('Error fetching tags:', error);
    return NextResponse.json({ error: 'An unexpected error occurred' }, { status: 500 });
  }
}
