'use client';

import { ApiError, authHeaders } from '@/lib/session';

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
export async function fileText(file: File): Promise<{ name: string; text: string; words: number; truncated: boolean }> {
  const form = new FormData();
  form.append('file', file, file.name);
  const response = await fetch('/api/files/text', { method: 'POST', headers: await authHeaders(), body: form });
  const json = await response.json().catch(() => null);
  if (!response.ok) throw new ApiError((json && json.detail) || 'This file could not be read.', response.status, json);
  return json;
}
