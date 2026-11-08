import DOMPurify from 'isomorphic-dompurify';

const PURIFY_CONFIG = {
  ADD_ATTR: ['target', 'rel', 'class', 'id', 'data-source', 'data-ref', 'data-cite', 'data-mermaid', 'data-display-mode', 'title', 'aria-label', 'style', 'contenteditable', 'suppresscontenteditablewarning'],
  ADD_TAGS: ['sup', 'sub'],
  ALLOW_DATA_ATTR: true,
};

// Where there is no DOM (Cloudflare Workers render without jsdom), DOMPurify comes back
// unsupported, without addHook or sanitize. Install the hook on first use, never at import:
// this module is imported while pages render on the server.
let hooked = false;
function purifier(): typeof DOMPurify | null {
  if (!DOMPurify.isSupported || typeof DOMPurify.sanitize !== 'function') return null;
  if (!hooked) {
    hooked = true;
    DOMPurify.addHook('afterSanitizeAttributes', (node) => {
      if (node.tagName === 'A') {
        node.setAttribute('target', '_blank');
        node.setAttribute('rel', 'noopener noreferrer');
      }
    });
  }
  return DOMPurify;
}

const escapeHtml = (text: string) =>
  text.replace(/[&<>"']/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char]!);

export function sanitize(dirty: string): string {
  const purify = purifier();
  // No sanitizer here: show the markup as text rather than trust it.
  return purify ? purify.sanitize(dirty, PURIFY_CONFIG) : escapeHtml(dirty);
}

export default sanitize;
