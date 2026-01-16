import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createReaderClient, ReaderApiException } from '@/lib/reader';

interface TagsResponse {
  tags?: Array<{
    name: string;
    count: number;
  }>;
  error?: string;
}

/**
 * GET /api/reader/tags
 *
 * Fetches all tags used in the user's Readwise Reader library.
 * Tags are aggregated from all documents.
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

    // Create Reader client and fetch tags
    const readerClient = createReaderClient(userData.reader_access_token);

    try {
      const tags = await readerClient.getTags();

      return NextResponse.json({
        tags,
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
        return NextResponse.json({ error: 'Failed to fetch tags from Readwise.' }, { status: 502 });
      }
      throw error;
    }
  } catch (error) {
    console.error('Error fetching tags:', error);
    return NextResponse.json({ error: 'An unexpected error occurred' }, { status: 500 });
  }
}
