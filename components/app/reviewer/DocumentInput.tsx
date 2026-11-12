'use client';

/**
 * Where the text to check comes from: an uploaded file (PDF, Word, Markdown, text), one of the
 * person's editor documents, or pasted text.
 */
import { useEffect, useRef, useState } from 'react';
import { LuFileText, LuUpload } from 'react-icons/lu';
import { api } from '@/lib/session';
import { Segmented } from '@/components/app/ui';
import { showError } from '@/components/app/research/parts';
import { fileText } from '@/components/app/research/stream';

export type DocumentChoice = { kind: 'text'; text: string; title: string; words: number } | { kind: 'document'; document_id: string; title: string; words: number } | null;

type Listed = { id: string; title: string | null; wordCount: number; updatedAt: number };

const countWords = (text: string) => (text.match(/\S+/g) || []).length;

export function DocumentInput({ value, onChange, pastePlaceholder = 'Paste your text here' }: { value: DocumentChoice; onChange: (value: DocumentChoice) => void; pastePlaceholder?: string }) {
  const [source, setSource] = useState<'upload' | 'documents' | 'paste'>('upload');
  const [docs, setDocs] = useState<Listed[] | null>(null);
  const [reading, setReading] = useState(false);
  const [pasted, setPasted] = useState('');
  const input = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (source !== 'documents' || docs) return;
    api<{ documents: Listed[] }>('/api/ai-editor/documents').then((result) => setDocs(result.documents)).catch((error) => { setDocs([]); showError(error); });
  }, [source, docs]);

  const upload = async (file: File | undefined) => {
    if (!file) return;
    setReading(true);
    try {
      const read = await fileText(file);
      onChange({ kind: 'text', text: read.text, title: read.name.replace(/\.[a-z0-9]+$/i, ''), words: read.words });
    } catch (error) {
      showError(error);
    } finally {
      setReading(false);
    }
  };

  return (
    <div>
      <Segmented label="Document source" value={source} onChange={(next) => { setSource(next); if (next === 'paste') onChange(pasted ? { kind: 'text', text: pasted, title: 'Pasted text', words: countWords(pasted) } : null); }}
        options={[{ value: 'upload', label: 'Upload' }, { value: 'documents', label: 'My documents' }, { value: 'paste', label: 'Paste' }]} />
      <div className="mt-3">
        {source === 'upload' && (
          <>
            <input ref={input} type="file" accept=".pdf,.doc,.docx,.odt,.rtf,.md,.markdown,.txt" className="hidden" onChange={(event) => { upload(event.target.files?.[0]); event.target.value = ''; }} />
            <button type="button" onClick={() => input.current?.click()} disabled={reading}
              className="flex w-full items-center gap-3 rounded-xl border border-dashed border-line-3 bg-soft px-4 py-5 text-left hover:border-brand disabled:opacity-60">
              <LuUpload className="h-5 w-5 shrink-0 text-brand" aria-hidden="true" />
              <span className="min-w-0">
                <span className="block text-[15px] font-semibold text-ink">{reading ? 'Reading the file…' : value?.kind === 'text' && value.title !== 'Pasted text' ? value.title : 'Choose a file'}</span>
                <span className="text-[13px] text-muted">{value?.kind === 'text' && value.title !== 'Pasted text' ? `${value.words.toLocaleString('en-US')} words` : 'PDF, Word (.docx, .doc), Markdown or text, up to 25 MB'}</span>
              </span>
            </button>
          </>
        )}
        {source === 'documents' && (
          <ul className="max-h-64 overflow-y-auto rounded-xl border border-line">
            {docs === null && <li className="px-4 py-4 text-[14px] text-muted">Loading…</li>}
            {docs?.length === 0 && <li className="px-4 py-4 text-[14px] text-muted">You have no documents yet.</li>}
            {docs?.map((doc) => {
              const on = value?.kind === 'document' && value.document_id === doc.id;
              return (
                <li key={doc.id}>
                  <button type="button" onClick={() => onChange({ kind: 'document', document_id: doc.id, title: doc.title || 'Untitled document', words: doc.wordCount })}
                    className={`flex w-full items-center gap-3 px-4 py-2.5 text-left hover:bg-soft ${on ? 'bg-brand-50' : ''}`} aria-pressed={on}>
                    <LuFileText className="h-4 w-4 shrink-0 text-muted" aria-hidden="true" />
                    <span className="min-w-0 flex-1 truncate text-[14.5px] font-medium text-ink">{doc.title || 'Untitled document'}</span>
                    <span className="shrink-0 text-[13px] text-muted">{doc.wordCount ? `${doc.wordCount.toLocaleString('en-US')} words` : ''}</span>
                  </button>
                </li>
              );
            })}
          </ul>
        )}
        {source === 'paste' && (
          <textarea value={pasted} rows={10} placeholder={pastePlaceholder} aria-label="Text"
            onChange={(event) => { setPasted(event.target.value); onChange(event.target.value.trim() ? { kind: 'text', text: event.target.value, title: 'Pasted text', words: countWords(event.target.value) } : null); }}
            className="w-full rounded-xl border border-line bg-surface px-3.5 py-3 text-[15px] leading-relaxed text-ink placeholder:text-subtle focus:border-brand focus:outline-none" />
        )}
      </div>
    </div>
  );
}

/** The request fields for a chosen document. */
export const documentFields = (choice: DocumentChoice) => (choice?.kind === 'document' ? { document_id: choice.document_id, title: choice.title } : choice?.kind === 'text' ? { text: choice.text, title: choice.title } : {});
