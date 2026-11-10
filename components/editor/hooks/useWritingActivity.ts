'use client';

import { useEffect } from 'react';
import { sendWritingActivity, type WritingActivity } from '../lib/aiEditor/assistApi';
import { isAIAuthor } from '../lib/aiEditor/suggestions';
import { safeView } from '../lib/aiEditor/editorPlugins';

/**
 * Records how the writer adds text, for the authorship report: characters typed, pasted from
 * outside, pasted from an AI for Research document, accepted from AI for Research, and deleted, plus
 * time spent writing. Large pastes are listed with when they happened and a SHA-256 of the
 * text; the text itself never leaves the editor. Other people's edits (arriving over Yjs) are
 * theirs and are not counted here.
 *
 * How a change is classified:
 *   - a paste or drop (ProseMirror's uiEvent): pasted, from inside when the clipboard carried
 *     BlockNote's own format (copied from an AI for Research document), else from outside;
 *   - a small insertion (a few characters, as typing and autocorrect make): typed;
 *   - a large insertion that is neither: held for a moment. If AI for Research text was just
 *     accepted (noteAIInsertion), it counts as AI; otherwise it was the app itself (a template,
 *     a citation, undo) and is not counted as anyone's writing.
 *
 * Totals for the session are sent every 45 seconds while they change, and when the tab is hidden.
 */

const FLUSH_MS = 45_000;
const BUCKET_MS = 15_000;
const TYPED_MAX = 8;
const AI_WINDOW_MS = 4_000;
const LARGE_PASTE = 200;

type Pending = { at: number; chars: number };

const aiListeners = new Set<() => void>();

/** Called where AI for Research text was accepted into the document. */
export function noteAIInsertion() {
  aiListeners.forEach((listener) => listener());
}

async function sha256(text: string): Promise<string> {
  try {
    const bytes = new TextEncoder().encode(text);
    const digest = await crypto.subtle.digest('SHA-256', bytes);
    return [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, '0')).join('');
  } catch {
    return '';
  }
}

/** AI for Research's tracked changes carry its name in the suggestion mark ("id|AI for Research|time"). */
const isAIText = (node: any) => (node?.marks || []).some((mark: any) => typeof mark?.attrs?.stringValue === 'string' && isAIAuthor(mark.attrs.stringValue.split('|')[1]));

/** Characters a transaction added and removed (text only; structure does not count), and how many of the added are AI suggestions. */
function measure(transaction: any): { inserted: number; deleted: number; ai: number } {
  let inserted = 0;
  let deleted = 0;
  let ai = 0;
  transaction.steps.forEach((step: any, index: number) => {
    const json = typeof step.toJSON === 'function' ? step.toJSON() : null;
    if (!json || (json.stepType !== 'replace' && json.stepType !== 'replaceAround')) return;
    const before = transaction.docs?.[index];
    if (before && typeof step.from === 'number' && typeof step.to === 'number' && step.to > step.from) {
      try { deleted += before.textBetween(step.from, step.to, '\n', ' ').length; } catch { /* positions from another doc */ }
    }
    const content = step.slice?.content;
    if (content && content.size) {
      try { inserted += content.textBetween(0, content.size, '\n', ' ').length; } catch { /* empty slice */ }
      try {
        content.descendants((node: any) => {
          if (node.isText && isAIText(node)) ai += node.text.length;
          return true;
        });
      } catch { /* not a fragment */ }
    }
  });
  return { inserted, deleted, ai: Math.min(ai, inserted) };
}

export function useWritingActivity(editor: any, documentId: string | null | undefined, enabled: boolean) {
  useEffect(() => {
    const tiptap = editor?._tiptapEditor;
    if (!enabled || !documentId || !tiptap?.on) return undefined;

    const sessionId = (crypto as any).randomUUID?.() ?? `${Date.now()}-${Math.random().toString(36).slice(2)}`;
    const totals: WritingActivity = {
      session_id: sessionId, started_at: Date.now(), last_at: Date.now(), active_seconds: 0,
      typed: 0, pasted_external: 0, pasted_internal: 0, ai_inserted: 0, deleted: 0, pastes: [],
    };
    const buckets = new Set<number>();
    let pending: Pending[] = [];
    let lastPaste: { internal: boolean; text: string } | null = null;
    let dirty = false;
    let sent = '';

    const touch = () => {
      const now = Date.now();
      totals.last_at = now;
      buckets.add(Math.floor(now / BUCKET_MS));
      totals.active_seconds = buckets.size * (BUCKET_MS / 1000);
      dirty = true;
    };

    // The clipboard is only readable in the paste event, before ProseMirror's transaction.
    // Tiptap's `view` throws until the editor is mounted, so attach on mount too (and follow
    // remounts: the DOM node can change).
    let dom: HTMLElement | null = null;
    const attach = () => {
      detach();
      dom = safeView(editor)?.dom ?? null;
      dom?.addEventListener('paste', onPaste, true);
      dom?.addEventListener('drop', onDrop, true);
    };
    const detach = () => {
      dom?.removeEventListener('paste', onPaste, true);
      dom?.removeEventListener('drop', onDrop, true);
      dom = null;
    };
    const onPaste = (event: ClipboardEvent) => {
      const data = event.clipboardData;
      if (!data) return;
      const types = Array.from(data.types || []);
      lastPaste = { internal: types.includes('blocknote/html'), text: data.getData('text/plain') || '' };
    };
    const onDrop = (event: DragEvent) => {
      const data = event.dataTransfer;
      lastPaste = { internal: Boolean(data && Array.from(data.types || []).includes('blocknote/html')), text: data?.getData('text/plain') || '' };
    };
    attach();
    tiptap.on('mount', attach);
    tiptap.on('unmount', detach);

    const onTransaction = ({ transaction }: { transaction: any }) => {
      if (!transaction?.docChanged) return;
      // Changes from collaborators (Yjs) and restored versions are not this writer's typing.
      const ySync = transaction.getMeta?.('y-sync$');
      if (ySync?.isChangeOrigin || ySync?.isUndoRedoOperation) return;
      const measured = measure(transaction);
      const { deleted } = measured;
      // Text AI for Research proposed as a tracked change is the AI's, whatever else happens.
      totals.ai_inserted += measured.ai;
      const inserted = measured.inserted - measured.ai;
      if (!inserted && !deleted && !measured.ai) return;
      totals.deleted += deleted;
      const uiEvent = transaction.getMeta?.('uiEvent');
      if (uiEvent === 'paste' || uiEvent === 'drop') {
        const paste = lastPaste;
        lastPaste = null;
        const internal = Boolean(paste?.internal);
        if (internal) totals.pasted_internal += inserted;
        else totals.pasted_external += inserted;
        if (inserted >= LARGE_PASTE) {
          const at = Date.now();
          void sha256(paste?.text || '').then((hash) => {
            totals.pastes.push({ at, chars: inserted, hash: hash || 'unknown', internal });
            if (totals.pastes.length > 300) totals.pastes.splice(0, totals.pastes.length - 300);
            dirty = true;
          });
        }
      } else if (!inserted) {
        // Only AI suggestion text, or only deletions.
      } else if (inserted <= TYPED_MAX) {
        totals.typed += inserted;
      } else {
        pending.push({ at: Date.now(), chars: inserted });
      }
      touch();
    };
    tiptap.on('transaction', onTransaction);

    // AI text accepted: the large insertions just before it were the AI's.
    const onAI = () => {
      const now = Date.now();
      const recent = pending.filter((item) => now - item.at <= AI_WINDOW_MS);
      if (!recent.length) return;
      totals.ai_inserted += recent.reduce((sum, item) => sum + item.chars, 0);
      pending = pending.filter((item) => now - item.at > AI_WINDOW_MS);
      dirty = true;
    };
    aiListeners.add(onAI);

    const flush = (keepalive = false) => {
      // Large insertions nobody claimed within the window were the app's own (not counted).
      pending = pending.filter((item) => Date.now() - item.at <= AI_WINDOW_MS);
      if (!dirty) return;
      const body = JSON.stringify(totals);
      if (body === sent) return;
      dirty = false;
      sent = body;
      void sendWritingActivity(documentId, { ...totals, pastes: [...totals.pastes] }, keepalive).catch(() => {
        dirty = true;
        sent = '';
      });
    };
    const timer = window.setInterval(() => flush(), FLUSH_MS);
    const onHide = () => { if (document.visibilityState === 'hidden') flush(true); };
    document.addEventListener('visibilitychange', onHide);
    window.addEventListener('pagehide', onHide);

    return () => {
      flush(true);
      window.clearInterval(timer);
      document.removeEventListener('visibilitychange', onHide);
      window.removeEventListener('pagehide', onHide);
      aiListeners.delete(onAI);
      tiptap.off?.('transaction', onTransaction);
      tiptap.off?.('mount', attach);
      tiptap.off?.('unmount', detach);
      detach();
    };
  }, [documentId, editor, enabled]);
}
