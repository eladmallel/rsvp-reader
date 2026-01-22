import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

interface ProfileResponse {
  id?: string;
  email?: string;
  name?: string;
  initials?: string;
  isPro?: boolean;
  readerConnected?: boolean;
  error?: string;
}

/**
 * GET /api/user/profile
 *
 * Get the current user's profile information.
 */
export async function GET(): Promise<NextResponse<ProfileResponse>> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    // Get user data from database
    const { data: userData, error: queryError } = await supabase
      .from('users')
      .select('email, reader_access_token, reader_access_token_encrypted')
      .eq('id', user.id)
      .single();

    if (queryError && queryError.code !== 'PGRST116') {
      // PGRST116 is "no rows returned"
      console.error('Error fetching user:', queryError);
      return NextResponse.json({ error: 'Failed to fetch user profile' }, { status: 500 });
    }

    // Get email from auth user or database
    const email = user.email || userData?.email || '';

    // Generate name from email (everything before @)
    const name = email.split('@')[0] || 'User';

    // Generate initials from name
    const nameParts = name.split(/[._-]/);
    const initials =
      nameParts.length >= 2
        ? (nameParts[0][0] + nameParts[1][0]).toUpperCase()
        : name.slice(0, 2).toUpperCase();

    // Check if Reader is connected (check both encrypted and plaintext during migration)
    const readerConnected =
      !!userData?.reader_access_token_encrypted || !!userData?.reader_access_token;

    return NextResponse.json({
      id: user.id,
      email,
      name: formatName(name),
      initials,
      isPro: false, // Placeholder - can add subscription check later
      readerConnected,
    });
  } catch (error) {
    console.error('Error in profile GET:', error);
    return NextResponse.json({ error: 'An unexpected error occurred' }, { status: 500 });
  }
}

/**
 * Format a username-style string into a readable name
 */
function formatName(name: string): string {
  // Replace common separators with spaces and capitalize each word
  return name
    .split(/[._-]/)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
    .join(' ');
}
