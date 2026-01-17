import { describe, expect, it } from 'vitest';
import { htmlToPlainText } from './html';

describe('htmlToPlainText', () => {
  it('strips tags and normalizes whitespace', () => {
    const html = '<h1>Title</h1><p>Hello <strong>world</strong>.</p>';

    expect(htmlToPlainText(html)).toBe('Title\nHello world.');
  });

  it('decodes common HTML entities', () => {
    const html = '<p>Fish &amp; chips &quot;today&quot; &#39;now&#39;.</p>';

    expect(htmlToPlainText(html)).toBe('Fish & chips "today" \'now\'.');
  });
});
