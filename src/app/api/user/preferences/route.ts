import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

interface PreferencesResponse {
  defaultWpm?: number;
  skipAmount?: number;
  rsvpFont?: string;
  theme?: string;
  error?: string;
}

/**
 * GET /api/user/preferences
 *
 * Get the current user's preferences.
 */
export async function GET(): Promise<NextResponse<PreferencesResponse>> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    // Get user preferences from database
    const { data: userData, error: queryError } = await supabase
      .from('users')
      .select('default_wpm, theme, font_size')
      .eq('id', user.id)
      .single();

    if (queryError) {
      console.error('Error fetching preferences:', queryError);
      return NextResponse.json({ error: 'Failed to fetch preferences' }, { status: 500 });
    }

    // Return preferences with defaults
    return NextResponse.json({
      defaultWpm: userData?.default_wpm ?? 300,
      skipAmount: 3, // Not stored in DB, use default (can be stored in localStorage)
      rsvpFont: 'monospace', // Not stored in DB, use default
      theme: userData?.theme ?? 'system',
    });
  } catch (error) {
    console.error('Error in preferences GET:', error);
    return NextResponse.json({ error: 'An unexpected error occurred' }, { status: 500 });
  }
}

/**
 * PUT /api/user/preferences
 *
 * Update the current user's preferences.
 */
export async function PUT(request: NextRequest): Promise<NextResponse<PreferencesResponse>> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const body = await request.json();
    const { defaultWpm, theme } = body;

    // Validate WPM if provided
    if (defaultWpm !== undefined) {
      if (typeof defaultWpm !== 'number' || defaultWpm < 100 || defaultWpm > 1000) {
        return NextResponse.json(
          { error: 'WPM must be a number between 100 and 1000' },
          { status: 400 }
        );
      }
    }

    // Validate theme if provided
    if (theme !== undefined) {
      if (!['light', 'dark', 'system'].includes(theme)) {
        return NextResponse.json(
          { error: 'Theme must be "light", "dark", or "system"' },
          { status: 400 }
        );
      }
    }

    // Build update object
    const updates: { default_wpm?: number; theme?: string; updated_at: string } = {
      updated_at: new Date().toISOString(),
    };

    if (defaultWpm !== undefined) {
      updates.default_wpm = defaultWpm;
    }
    if (theme !== undefined) {
      updates.theme = theme;
    }

    // Update preferences
    const { error: updateError } = await supabase.from('users').update(updates).eq('id', user.id);

    if (updateError) {
      console.error('Error updating preferences:', updateError);
      return NextResponse.json({ error: 'Failed to update preferences' }, { status: 500 });
    }

    // Return updated preferences
    const { data: userData, error: fetchError } = await supabase
      .from('users')
      .select('default_wpm, theme, font_size')
      .eq('id', user.id)
      .single();

    if (fetchError) {
      console.error('Error fetching updated preferences:', fetchError);
      return NextResponse.json({ error: 'Failed to fetch updated preferences' }, { status: 500 });
    }

    return NextResponse.json({
      defaultWpm: userData?.default_wpm ?? 300,
      skipAmount: 3,
      rsvpFont: 'monospace',
      theme: userData?.theme ?? 'system',
    });
  } catch (error) {
    console.error('Error in preferences PUT:', error);
    return NextResponse.json({ error: 'An unexpected error occurred' }, { status: 500 });
  }
}
