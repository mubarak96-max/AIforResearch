/**
 * Opens a tool's result as a new editor document, through the editor's existing import
 * (?from=research-agent reads these keys; see AIEditorWorkspace). Both storages, so the result
 * survives a sign-up in between (sessionStorage does not cross the sign-up redirect in every browser).
 */
import { hasSession } from '@/lib/session';
import { signupHref } from '@/lib/features';

export function openInEditor({ title, html, markdown, style }: { title: string; html: string; markdown: string; style: string }) {
  const values: Record<string, string> = {
    'research-agent-editor-content': html,
    'research-agent-editor-markdown': markdown,
    'research-agent-editor-title': title.slice(0, 200),
    'research-agent-editor-citation-style': style,
  };
  for (const storage of [sessionStorage, localStorage]) {
    try {
      for (const [key, value] of Object.entries(values)) storage.setItem(key, value);
    } catch {
      /* storage full or blocked: the editor opens without it */
    }
  }
  const target = '/editor?from=research-agent';
  window.location.assign(hasSession() ? target : signupHref(target));
}
