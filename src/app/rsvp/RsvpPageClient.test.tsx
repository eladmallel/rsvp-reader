import { render, screen, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import RsvpPageClient from './RsvpPageClient';

const mockPush = vi.fn();
const mockRefresh = vi.fn();
const mockSearchParams = new URLSearchParams('id=doc-123');

vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: mockPush,
    refresh: mockRefresh,
  }),
  useSearchParams: () => mockSearchParams,
}));

vi.mock('next/link', () => ({
  default: ({ href, children, ...props }: React.AnchorHTMLAttributes<HTMLAnchorElement>) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
}));

vi.mock('@/components/ui', () => ({
  ThemeToggle: () => <div data-testid="theme-toggle" />,
}));

vi.mock('@/components/rsvp', () => ({
  RSVPPlayer: ({ text }: { text: string }) => <div data-testid="rsvp-text">{text}</div>,
}));

describe('RsvpPageClient', () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  afterEach(() => {
    mockSearchParams.delete('id');
  });

  it('requests article content with HTML included', async () => {
    mockSearchParams.set('id', 'doc-123');
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        document: {
          id: 'doc-123',
          title: 'Test Article',
          author: 'Test Author',
          htmlContent: '<p>Hello world</p>',
          wordCount: 2,
        },
      }),
    });
    globalThis.fetch = fetchMock;

    render(<RsvpPageClient />);

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith('/api/reader/documents/doc-123?content=true');
    });
  });

  it('uses Readwise content instead of sample text', async () => {
    mockSearchParams.set('id', 'doc-123');
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        document: {
          id: 'doc-123',
          title: 'Test Article',
          author: 'Test Author',
          htmlContent: '<p>Hello <strong>world</strong></p>',
          wordCount: 2,
        },
      }),
    });
    globalThis.fetch = fetchMock;

    render(<RsvpPageClient />);

    const text = await screen.findByTestId('rsvp-text');
    expect(text).toHaveTextContent('Hello world');
    expect(text).not.toHaveTextContent('The quick brown fox');
  });
});
