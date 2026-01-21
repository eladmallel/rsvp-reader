export function htmlToPlainText(html: string): string {
  const withoutScripts = html.replace(/<script[^>]*>[\s\S]*?<\/script>/gi, ' ');
  const withoutStyles = withoutScripts.replace(/<style[^>]*>[\s\S]*?<\/style>/gi, ' ');
  // Add newlines for block-level closing tags to create paragraph breaks
  const withClosingBreaks = withoutStyles.replace(
    /<\/(p|div|li|h[1-6]|blockquote|article|section)[^>]*>/gi,
    '\n\n'
  );
  // Add newlines for self-closing br/hr tags
  const withLineBreaks = withClosingBreaks.replace(/<(br|hr)[^>]*\/?>/gi, '\n');
  // Remove all remaining tags without adding spaces
  const withoutTags = withLineBreaks.replace(/<[^>]+>/g, '');
  const decoded = decodeBasicEntities(withoutTags);

  return decoded
    .replace(/[ \t]+\n/g, '\n') // Remove spaces/tabs before newlines (but not other newlines)
    .replace(/\n{3,}/g, '\n\n') // Collapse 3+ newlines to 2
    .replace(/[ \t]{2,}/g, ' ') // Collapse multiple spaces/tabs to single space
    .replace(/\s+([.,!?;:])/g, '$1') // Remove whitespace before punctuation
    .trim();
}

function decodeBasicEntities(input: string): string {
  return input
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'");
}
