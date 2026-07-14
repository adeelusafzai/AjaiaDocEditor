import sanitizeHtml from 'sanitize-html';

// The editor and file importers both produce HTML. We store sanitized HTML so
// that a malicious document can never inject script/style/event handlers that
// would run in another user's browser when a document is shared.
const ALLOWED_TAGS = [
  'p', 'br', 'span', 'div',
  'strong', 'b', 'em', 'i', 'u', 's', 'code', 'pre',
  'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
  'ul', 'ol', 'li',
  'blockquote', 'hr',
  'a',
];

export function sanitizeDocumentHtml(dirty) {
  if (typeof dirty !== 'string') return '';
  return sanitizeHtml(dirty, {
    allowedTags: ALLOWED_TAGS,
    allowedAttributes: {
      a: ['href', 'title', 'target', 'rel'],
      span: ['class'],
      code: ['class'],
      pre: ['class'],
    },
    allowedSchemes: ['http', 'https', 'mailto'],
    transformTags: {
      // Force safe link behavior.
      a: sanitizeHtml.simpleTransform('a', { rel: 'noopener noreferrer', target: '_blank' }),
    },
  });
}

export default sanitizeDocumentHtml;
