'use client';

import { ApiError, api, authHeaders } from '@/lib/session';

/** Polling may stop when a tab closes; the saved Firebase job keeps running. */
export async function watchResearchTask(id: string, onEvent: (event: string, data: any) => void, signal?: AbortSignal) {
  let failures = 0;
  const pause = (ms: number) => new Promise<void>((resolve, reject) => {
    if (signal?.aborted) { reject(new DOMException('Stopped watching', 'AbortError')); return; }
    const stop = () => { clearTimeout(timer); reject(new DOMException('Stopped watching', 'AbortError')); };
    const timer = setTimeout(() => { signal?.removeEventListener('abort', stop); resolve(); }, ms);
    signal?.addEventListener('abort', stop, { once: true });
  });
  for (;;) {
    if (signal?.aborted) throw new DOMException('Stopped watching', 'AbortError');
    let task: any;
    try { task = await api<any>(`/api/history/${encodeURIComponent(id)}`, { signal }); }
    catch (error) {
      if (signal?.aborted || (error as Error).name === 'AbortError' || (error instanceof ApiError && [401, 403, 404].includes(error.status))) throw error;
      failures += 1;
      if (failures > 10) throw new Error('Progress could not reconnect. Your saved research continues independently; reopen this task to check it.');
      onEvent('watch_status', { message: 'Progress connection interrupted. Your saved research continues; reconnecting…' });
      await pause(Math.min(15000, 1000 * 2 ** (failures - 1)));
      continue;
    }
    if (failures) onEvent('watch_status', { message: '' });
    failures = 0;
    onEvent('snapshot', task);
    if (task.status === 'done') { onEvent('done', { task_id: id, credits: task.credits, ...task.result }); return; }
    if (task.status === 'failed') { onEvent('error', { detail: task.error }); return; }
    await pause(3000);
  }
}

/**
 * POSTs JSON and reads a Server-Sent Events answer (`event: name` + `data: json`), calling
 * `onEvent` for each. Resolves when the stream ends; rejects with an ApiError when the server
 * refuses before streaming (402 for a plan limit, 422 for a bad request).
 */
export async function postStream(path: string, body: unknown, onEvent: (event: string, data: any) => void, signal?: AbortSignal): Promise<void> {
  const response = await fetch(path, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'text/event-stream', ...(await authHeaders()) },
    body: JSON.stringify(body),
    signal,
  });
  if (!response.ok || !response.body) {
    const json = await response.json().catch(() => null);
    throw new ApiError((json && (json.detail || json.error)) || `Request failed (${response.status})`, response.status, json);
  }
  if (response.status === 202 && response.headers.get('content-type')?.includes('application/json')) {
    const queued = await response.json();
    onEvent('task', { id: queued.task_id, credits: queued.credits, background: true });
    await watchResearchTask(queued.task_id, onEvent, signal);
    return;
  }
  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';
  for (;;) {
    const { value, done } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    let cut = buffer.indexOf('\n\n');
    while (cut >= 0) {
      const chunk = buffer.slice(0, cut);
      buffer = buffer.slice(cut + 2);
      const event = chunk.match(/^event: (.+)$/m)?.[1]?.trim() || 'message';
      const data = chunk.split('\n').filter((line) => line.startsWith('data: ')).map((line) => line.slice(6)).join('\n');
      if (data) {
        try { onEvent(event, JSON.parse(data)); } catch { /* a broken event is skipped */ }
      }
      cut = buffer.indexOf('\n\n');
    }
  }
}

/** Uploads a file and returns its text (POST /api/files/text). */
export async function fileText(file: File, ocrLanguages?: string[]): Promise<{ name: string; text: string; words: number; truncated: boolean; warnings?: string[]; extraction?: { requires_review: boolean; ocr_pages: number[]; pages_without_text: number[] } }> {
  const form = new FormData();
  form.append('file', file, file.name);
  if (ocrLanguages?.length) form.append('ocr_languages', ocrLanguages.join('+'));
  const response = await fetch('/api/files/text', { method: 'POST', headers: await authHeaders(), body: form });
  const json = await response.json().catch(() => null);
  if (!response.ok) throw new ApiError((json && json.detail) || 'This file could not be read.', response.status, json);
  return json;
}
