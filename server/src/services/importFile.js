import mammoth from 'mammoth';
import { marked } from 'marked';
import { sanitizeDocumentHtml } from '../utils/sanitize.js';
import { badRequest } from '../utils/errors.js';

const escapeHtml = (s) =>
  s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

const DOCX_MIME =
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document';

export const SUPPORTED_EXTENSIONS = ['.txt', '.md', '.markdown', '.docx'];

function extensionOf(name = '') {
  const i = name.lastIndexOf('.');
  return i === -1 ? '' : name.slice(i).toLowerCase();
}

/**
 * Converts an uploaded file (multer memory file) into a document title + HTML.
 * Supported: .txt, .md/.markdown, .docx. Anything else throws a 400.
 */
export async function importFileToDocument(file) {
  if (!file) throw badRequest('No file was uploaded');

  const originalName = file.originalname || 'upload';
  const ext = extensionOf(originalName);
  const title = originalName.replace(/\.[^.]+$/, '').trim() || 'Imported document';

  let html;
  if (ext === '.docx' || file.mimetype === DOCX_MIME) {
    const { value } = await mammoth.convertToHtml({ buffer: file.buffer });
    html = value;
  } else if (ext === '.md' || ext === '.markdown') {
    html = marked.parse(file.buffer.toString('utf8'));
  } else if (ext === '.txt' || file.mimetype === 'text/plain') {
    const text = file.buffer.toString('utf8');
    html = text
      .split(/\r?\n\r?\n+/)
      .map((para) => `<p>${escapeHtml(para).replace(/\r?\n/g, '<br>')}</p>`)
      .join('');
  } else {
    throw badRequest(
      `Unsupported file type "${ext || originalName}". Supported types: ${SUPPORTED_EXTENSIONS.join(', ')} (legacy .doc is not supported).`
    );
  }

  return { title: title.slice(0, 200), content: sanitizeDocumentHtml(html) };
}
