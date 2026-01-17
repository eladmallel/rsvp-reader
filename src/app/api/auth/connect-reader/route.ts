import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createReaderClient, ReaderApiException } from '@/lib/reader';
import type { Database } from '@/lib/supabase/types';

interface ConnectReaderRequest {
  token: string;
}

interface ConnectReaderResponse {
  success: boolean;
  error?: string;
}

/**
 * POST /api/auth/connect-reader
 *
 * Validates and stores a Readwise Reader access token for the authenticated user.
 * The token is validated by making a test API call to the Reader API.
 */
export async function POST(request: NextRequest): Promise<NextResponse<ConnectReaderResponse>> {
  try {
    // Parse request body
    const body = (await request.json()) as Partial<ConnectReaderRequest>;

    // Validate request body
    if (!body.token || typeof body.token !== 'string') {
      return NextResponse.json(
        { success: false, error: 'Access token is required' },
        { status: 400 }
      );
    }

    const token = body.token.trim();

    // Basic token format validation
    if (token.length < 20) {
      return NextResponse.json({ success: false, error: 'Invalid token format' }, { status: 400 });
    }

    // Get authenticated user
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { success: false, error: 'Authentication required' },
        { status: 401 }
      );
    }

    // Validate token with Reader API
    const readerClient = createReaderClient(token);

    try {
      await readerClient.validateToken();
    } catch (error) {
      if (error instanceof ReaderApiException) {
        if (error.status === 401 || error.status === 403) {
          return NextResponse.json(
            {
              success: false,
              error: 'Invalid access token. Please check your token and try again.',
            },
            { status: 400 }
          );
        }
        if (error.status === 429) {
          return NextResponse.json(
            { success: false, error: 'Too many requests. Please try again later.' },
            { status: 429 }
          );
        }
        // Other Reader API errors
        return NextResponse.json(
          { success: false, error: 'Failed to validate token with Readwise. Please try again.' },
          { status: 502 }
        );
      }
      throw error;
    }

    // Store token in user's profile
    // Note: In production, this should be encrypted before storage
    const { error: updateError } = await supabase
      .from('users')
      .update({
        reader_access_token: token,
        updated_at: new Date().toISOString(),
      } as Database['public']['Tables']['users']['Update'])
      .eq('id', user.id);

    if (updateError) {
      console.error('Failed to store Reader token:', updateError);
      return NextResponse.json(
        { success: false, error: 'Failed to save token. Please try again.' },
        { status: 500 }
      );
    }

    const { error: syncStateError } = await supabase.from('readwise_sync_state').upsert(
      {
        user_id: user.id,
        inbox_cursor: null,
        library_cursor: null,
        feed_cursor: null,
        next_allowed_at: new Date().toISOString(),
        last_sync_at: null,
        in_progress: false,
        initial_backfill_done: false,
        window_started_at: null,
        window_request_count: 0,
        last_429_at: null,
      },
      {
        onConflict: 'user_id',
      }
    );

    if (syncStateError) {
      console.error('Failed to initialize Reader sync state:', syncStateError);
      return NextResponse.json(
        { success: false, error: 'Failed to initialize sync state. Please try again.' },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error in connect-reader:', error);

    // Handle JSON parse errors
    if (error instanceof SyntaxError) {
      return NextResponse.json({ success: false, error: 'Invalid request body' }, { status: 400 });
    }

    return NextResponse.json(
      { success: false, error: 'An unexpected error occurred' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/auth/connect-reader
 *
 * Disconnects the user's Readwise Reader account by removing the stored token.
 */
export async function DELETE(): Promise<NextResponse<ConnectReaderResponse>> {
  try {
    // Get authenticated user
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { success: false, error: 'Authentication required' },
        { status: 401 }
      );
    }

    // Remove token from user's profile
    const { error: updateError } = await supabase
      .from('users')
      .update({
        reader_access_token: null,
        updated_at: new Date().toISOString(),
      } as Database['public']['Tables']['users']['Update'])
      .eq('id', user.id);

    if (updateError) {
      console.error('Failed to remove Reader token:', updateError);
      return NextResponse.json(
        { success: false, error: 'Failed to disconnect. Please try again.' },
        { status: 500 }
      );
    }

    const { error: syncStateError } = await supabase
      .from('readwise_sync_state')
      .delete()
      .eq('user_id', user.id);

    if (syncStateError) {
      console.error('Failed to remove Reader sync state:', syncStateError);
      return NextResponse.json(
        { success: false, error: 'Failed to disconnect. Please try again.' },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error in disconnect-reader:', error);
    return NextResponse.json(
      { success: false, error: 'An unexpected error occurred' },
      { status: 500 }
    );
  }
}

/**
 * GET /api/auth/connect-reader
 *
 * Check if the current user has a connected Reader account.
 */
export async function GET(): Promise<NextResponse<{ connected: boolean; error?: string }>> {
  try {
    // Get authenticated user
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { connected: false, error: 'Authentication required' },
        { status: 401 }
      );
    }

    // Check if user has a Reader token
    const { data: userData, error: fetchError } = await supabase
      .from('users')
      .select('reader_access_token')
      .eq('id', user.id)
      .single();

    if (fetchError) {
      console.error('Failed to fetch user data:', fetchError);
      return NextResponse.json(
        { connected: false, error: 'Failed to check connection status' },
        { status: 500 }
      );
    }

    const hasToken = !!userData?.reader_access_token;

    return NextResponse.json({ connected: hasToken });
  } catch (error) {
    console.error('Error checking Reader connection:', error);
    return NextResponse.json(
      { connected: false, error: 'An unexpected error occurred' },
      { status: 500 }
    );
  }
}
