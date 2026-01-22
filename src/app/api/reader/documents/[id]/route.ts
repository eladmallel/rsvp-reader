import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createReaderClient, ReaderApiException } from '@/lib/reader';
import { decrypt } from '@/lib/crypto/encryption';

interface DocumentResponse {
  document?: {
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
    htmlContent?: string | null;
  };
  error?: string;
}

interface RouteParams {
  params: Promise<{ id: string }>;
}

/**
 * GET /api/reader/documents/[id]
 *
 * Fetches a single document from Reader, optionally with HTML content.
 *
 * Query parameters:
 * - content: 'true' to include HTML content
 */
export async function GET(
  request: NextRequest,
  { params }: RouteParams
): Promise<NextResponse<DocumentResponse>> {
  try {
    const { id: documentId } = await params;

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
      .select('reader_access_token, reader_access_token_encrypted')
      .eq('id', user.id)
      .single();

    // Decrypt encrypted token if available, otherwise use plaintext (during migration)
    let readerToken: string | null = null;
    if (userData?.reader_access_token_encrypted) {
      try {
        readerToken = decrypt(userData.reader_access_token_encrypted);
      } catch (error) {
        console.error('Failed to decrypt reader token:', error);
        return NextResponse.json(
          { error: 'Failed to decrypt Reader token. Please reconnect your account.' },
          { status: 500 }
        );
      }
    } else if (userData?.reader_access_token) {
      readerToken = userData.reader_access_token;
    }

    if (fetchError || !readerToken) {
      return NextResponse.json(
        { error: 'Readwise Reader not connected. Please connect your account first.' },
        { status: 400 }
      );
    }

    // Parse query parameters
    const searchParams = request.nextUrl.searchParams;
    const includeContent = searchParams.get('content') === 'true';

    // Create Reader client and fetch document
    const readerClient = createReaderClient(readerToken);

    try {
      // Check cache first if including content
      if (includeContent) {
        const { data: cachedArticle } = await supabase
          .from('cached_articles')
          .select('html_content, plain_text, word_count, cached_at')
          .eq('user_id', user.id)
          .eq('reader_document_id', documentId)
          .single();

        // Use cache if it exists and is less than 24 hours old
        if (cachedArticle?.html_content) {
          const cachedAt = new Date(cachedArticle.cached_at);
          const hoursSinceCached = (Date.now() - cachedAt.getTime()) / (1000 * 60 * 60);

          if (hoursSinceCached < 24) {
            // Get document metadata from Reader API
            const doc = await readerClient.getDocument(documentId, false);

            return NextResponse.json({
              document: {
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
                wordCount: cachedArticle.word_count || doc.word_count,
                readingProgress: doc.reading_progress,
                summary: doc.summary,
                imageUrl: doc.image_url,
                publishedDate: doc.published_date,
                createdAt: doc.created_at,
                htmlContent: cachedArticle.html_content,
              },
            });
          }
        }
      }

      // Fetch from Reader API
      const doc = await readerClient.getDocument(documentId, includeContent);

      // Cache the content if we fetched it
      if (includeContent && 'html_content' in doc && doc.html_content) {
        const plainText = stripHtml(doc.html_content);
        const wordCount = countWords(plainText);

        await supabase.from('cached_articles').upsert(
          {
            user_id: user.id,
            reader_document_id: documentId,
            html_content: doc.html_content,
            plain_text: plainText,
            word_count: wordCount,
            reader_updated_at: doc.updated_at,
            cached_at: new Date().toISOString(),
          },
          {
            onConflict: 'user_id,reader_document_id',
          }
        );
      }

      return NextResponse.json({
        document: {
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
          htmlContent: 'html_content' in doc ? doc.html_content : undefined,
        },
      });
    } catch (error) {
      if (error instanceof ReaderApiException) {
        if (error.status === 404) {
          return NextResponse.json({ error: 'Document not found' }, { status: 404 });
        }
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
          { error: 'Failed to fetch document from Readwise.' },
          { status: 502 }
        );
      }
      throw error;
    }
  } catch (error) {
    console.error('Error fetching document:', error);
    return NextResponse.json({ error: 'An unexpected error occurred' }, { status: 500 });
  }
}

/**
 * Simple HTML stripping for plain text conversion
 */
function stripHtml(html: string): string {
  return html
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Count words in text
 */
function countWords(text: string): number {
  return text.split(/\s+/).filter((word) => word.length > 0).length;
}
