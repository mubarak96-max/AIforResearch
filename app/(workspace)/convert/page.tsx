'use client';

/**
 * Document converter: a PDF, Word (.docx) or PowerPoint (.pptx) file as Markdown, to copy,
 * download or open as an editor document. No credits; the plan's upload size applies.
 */
import { Suspense, useRef, useState } from 'react';
import toast from 'react-hot-toast';
import { LuCopy, LuDownload, LuFilePen, LuLoaderCircle, LuUpload } from 'react-icons/lu';
import { AppFrame } from '@/components/app/AppFrame';
import { Button, Card } from '@/components/app/ui';
import { useSignedIn } from '@/components/app/useSignedIn';
import { api } from '@/lib/session';
import { showError } from '@/components/app/research/parts';
import { openResultInEditor } from '@/components/app/research/handoff';

type Converted = { title: string; kind: 'pdf' | 'docx' | 'pptx'; markdown: string; words: number; truncated: boolean; warnings: string[] };
const KIND_LABEL: Record<Converted['kind'], string> = { pdf: 'PDF', docx: 'Word', pptx: 'PowerPoint' };

function ConvertPage() {
  const { user } = useSignedIn();
  const input = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [result, setResult] = useState<Converted | null>(null);

  const convert = async (list: FileList | null) => {
    const file = list?.[0];
    if (!file) return;
    if (!/\.(pdf|docx|pptx)$/i.test(file.name)) { toast.error('Choose a PDF, Word (.docx) or PowerPoint (.pptx) file.'); return; }
    setBusy(file.name);
    setResult(null);
    try {
      const form = new FormData();
      form.append('file', file, file.name);
      setResult(await api<Converted>('/api/convert', { method: 'POST', body: form }));
    } catch (error) { showError(error); } finally { setBusy(null); }
  };

  const download = () => {
    if (!result) return;
    const url = URL.createObjectURL(new Blob([result.markdown], { type: 'text/markdown;charset=utf-8' }));
    const link = document.createElement('a');
    link.href = url;
    link.download = `${result.title.replace(/[^\p{L}\p{N} _-]+/gu, '').trim().slice(0, 80) || 'document'}.md`;
    link.click();
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
  };

  return (
    <AppFrame title="Document converter" subtitle="PDF, Word and PowerPoint files as Markdown, or as a document you can edit. No credits.">
      <Card className="p-4 sm:p-5">
        <div
          className="flex flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-line bg-soft px-4 py-8 text-center"
          onDragOver={(event) => event.preventDefault()}
          onDrop={(event) => { event.preventDefault(); if (user && !busy) convert(event.dataTransfer.files); }}
        >
          {busy ? <LuLoaderCircle className="h-6 w-6 animate-spin text-brand" aria-hidden="true" /> : <LuUpload className="h-6 w-6 text-muted" aria-hidden="true" />}
          <p className="text-[15px] font-semibold text-ink">{busy ? `Converting ${busy}…` : 'Drop a file here, or choose one'}</p>
          <p className="text-[13px] text-muted">PDF, Word (.docx) or PowerPoint (.pptx). Scanned PDFs need selectable text.</p>
          <Button variant="primary" size="sm" className="mt-2" disabled={!user || Boolean(busy)} onClick={() => input.current?.click()}>Choose a file</Button>
          {!user && <p className="text-[13px] text-muted">Sign in to convert files.</p>}
          <input ref={input} type="file" accept=".pdf,.docx,.pptx,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/vnd.openxmlformats-officedocument.presentationml.presentation" className="hidden" onChange={(event) => { convert(event.target.files); event.target.value = ''; }} />
        </div>
      </Card>

      {result && (
        <section aria-label="Result" className="mt-6">
          <div className="mb-3 flex flex-wrap items-center gap-2">
            <Button variant="primary" size="sm" onClick={() => openResultInEditor(result.title, result.markdown, [])}><LuFilePen className="h-4 w-4" />Open as a document</Button>
            <Button size="sm" onClick={() => navigator.clipboard.writeText(result.markdown).then(() => toast.success('Copied'))}><LuCopy className="h-4 w-4" />Copy Markdown</Button>
            <Button size="sm" onClick={download}><LuDownload className="h-4 w-4" />Download .md</Button>
            <span className="text-[13.5px] text-muted">{KIND_LABEL[result.kind]} · {result.words.toLocaleString('en-US')} words{result.truncated ? ' (shortened)' : ''}</span>
          </div>
          {result.warnings.length > 0 && <p className="mb-3 rounded-xl bg-soft px-4 py-3 text-[13.5px] text-ink-2">{result.warnings.slice(0, 3).join(' ')}</p>}
          <Card>
            <pre className="max-h-[70dvh] overflow-auto whitespace-pre-wrap break-words p-4 font-mono text-[13px] leading-relaxed text-ink-2 sm:p-5">{result.markdown}</pre>
          </Card>
        </section>
      )}
    </AppFrame>
  );
}

export default function Page() { return <Suspense fallback={null}><ConvertPage /></Suspense>; }
