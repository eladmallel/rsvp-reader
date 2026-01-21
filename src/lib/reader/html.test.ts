import { describe, expect, it } from 'vitest';
import { htmlToPlainText } from './html';

describe('htmlToPlainText', () => {
  it('strips tags and normalizes whitespace', () => {
    const html = '<h1>Title</h1><p>Hello <strong>world</strong>.</p>';

    // Block elements should be separated by double newlines to create proper paragraph breaks
    expect(htmlToPlainText(html)).toBe('Title\n\nHello world.');
  });

  it('decodes common HTML entities', () => {
    const html = '<p>Fish &amp; chips &quot;today&quot; &#39;now&#39;.</p>';

    expect(htmlToPlainText(html)).toBe('Fish & chips "today" \'now\'.');
  });

  it('preserves paragraph boundaries to prevent word merging', () => {
    const html = '<p>...at roughly the same time.</p><p>South Korea is the extreme case.</p>';

    const result = htmlToPlainText(html);

    // Should have double newline between paragraphs
    expect(result).toBe('...at roughly the same time.\n\nSouth Korea is the extreme case.');

    // Words should not merge together
    expect(result).not.toContain('time.South');
  });
});
