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
    // Note: skip_amount and rsvp_font columns are added via migration
    const { data: userData, error: queryError } = await supabase
      .from('users')
      .select('default_wpm, theme, font_size, skip_amount, rsvp_font')
      .eq('id', user.id)
      .single();

    if (queryError) {
      console.error('Error fetching preferences:', queryError);
      return NextResponse.json({ error: 'Failed to fetch preferences' }, { status: 500 });
    }

    // Return preferences with defaults
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const data = userData as any;
    return NextResponse.json({
      defaultWpm: data?.default_wpm ?? 300,
      skipAmount: data?.skip_amount ?? 3,
      rsvpFont: data?.rsvp_font ?? 'monospace',
      theme: data?.theme ?? 'system',
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
    const { defaultWpm, theme, skipAmount, rsvpFont } = body;

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

    // Validate skip amount if provided
    if (skipAmount !== undefined) {
      if (typeof skipAmount !== 'number' || skipAmount < 1 || skipAmount > 20) {
        return NextResponse.json(
          { error: 'Skip amount must be a number between 1 and 20' },
          { status: 400 }
        );
      }
    }

    // Validate font if provided
    if (rsvpFont !== undefined) {
      const validFonts = ['monospace', 'ibm-plex-mono', 'sans-serif', 'serif'];
      if (!validFonts.includes(rsvpFont)) {
        return NextResponse.json({ error: 'Invalid font value' }, { status: 400 });
      }
    }

    // Build update object
    const updates: {
      default_wpm?: number;
      theme?: string;
      skip_amount?: number;
      rsvp_font?: string;
      updated_at: string;
    } = {
      updated_at: new Date().toISOString(),
    };

    if (defaultWpm !== undefined) {
      updates.default_wpm = defaultWpm;
    }
    if (theme !== undefined) {
      updates.theme = theme;
    }
    if (skipAmount !== undefined) {
      updates.skip_amount = skipAmount;
    }
    if (rsvpFont !== undefined) {
      updates.rsvp_font = rsvpFont;
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
      .select('default_wpm, theme, font_size, skip_amount, rsvp_font')
      .eq('id', user.id)
      .single();

    if (fetchError) {
      console.error('Error fetching updated preferences:', fetchError);
      return NextResponse.json({ error: 'Failed to fetch updated preferences' }, { status: 500 });
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const data = userData as any;
    return NextResponse.json({
      defaultWpm: data?.default_wpm ?? 300,
      skipAmount: data?.skip_amount ?? 3,
      rsvpFont: data?.rsvp_font ?? 'monospace',
      theme: data?.theme ?? 'system',
    });
  } catch (error) {
    console.error('Error in preferences PUT:', error);
    return NextResponse.json({ error: 'An unexpected error occurred' }, { status: 500 });
  }
}
