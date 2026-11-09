'use client';

/** Merge, extract, split and rotate PDFs with pdf-lib, in the browser. Files are never uploaded. */
import { useState } from 'react';
import { LuArrowDown, LuArrowUp, LuDownload, LuLoaderCircle, LuUpload, LuX } from 'react-icons/lu';
import { btnPrimary, focusRing } from '@/components/marketing/styles';

type Task = 'merge' | 'extract' | 'split' | 'rotate';
type Output = { name: string; url: string; pages: number };

const TASKS: [Task, string, string][] = [
  ['merge', 'Merge', 'Combine PDFs into one, in the order shown.'],
  ['extract', 'Extract pages', 'Keep only the pages you list, e.g. 1-3, 7, 10-12.'],
  ['split', 'Split', 'One PDF per page.'],
  ['rotate', 'Rotate', 'Turn pages by 90°, 180° or 270°.'],
];

/** "1-3, 7" -> [0, 1, 2, 6] (zero-based, in order given, within 1..count). */
export function parsePageList(input: string, count: number): number[] {
  const pages: number[] = [];
  for (const part of input.split(/[,\s]+/).filter(Boolean)) {
    const range = /^(\d+)(?:-(\d+))?$/.exec(part);
    if (!range) throw new Error(`“${part}” is not a page or range.`);
    const from = Number(range[1]);
    const to = range[2] ? Number(range[2]) : from;
    if (from < 1 || to > count || from > to) throw new Error(`Pages must be between 1 and ${count}.`);
    for (let page = from; page <= to; page += 1) pages.push(page - 1);
  }
  if (!pages.length) throw new Error('List at least one page.');
  return pages;
}

const baseName = (name: string) => name.replace(/\.pdf$/i, '');

export function PdfTools() {
  const [task, setTask] = useState<Task>('merge');
  const [files, setFiles] = useState<File[]>([]);
  const [pages, setPages] = useState('');
  const [angle, setAngle] = useState(90);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [outputs, setOutputs] = useState<Output[]>([]);

  const reset = () => { outputs.forEach((output) => URL.revokeObjectURL(output.url)); setOutputs([]); setError(null); };
  const move = (index: number, by: number) => setFiles((current) => {
    const next = [...current];
    const [item] = next.splice(index, 1);
    next.splice(index + by, 0, item);
    return next;
  });

  async function run() {
    reset();
    setBusy(true);
    try {
      const { PDFDocument, degrees } = await import('pdf-lib');
      const load = async (file: File) => {
        try { return await PDFDocument.load(await file.arrayBuffer()); } catch { throw new Error(`${file.name} could not be opened. It may be password-protected or damaged.`); }
      };
      const save = async (doc: Awaited<ReturnType<typeof PDFDocument.create>>, name: string): Promise<Output> => {
        const bytes = await doc.save();
        return { name, url: URL.createObjectURL(new Blob([bytes as BlobPart], { type: 'application/pdf' })), pages: doc.getPageCount() };
      };
      if (!files.length) throw new Error('Add a PDF first.');
      if (task === 'merge') {
        if (files.length < 2) throw new Error('Add at least two PDFs to merge.');
        const merged = await PDFDocument.create();
        for (const file of files) {
          const source = await load(file);
          (await merged.copyPages(source, source.getPageIndices())).forEach((page) => merged.addPage(page));
        }
        setOutputs([await save(merged, 'merged.pdf')]);
      } else {
        const source = await load(files[0]);
        const count = source.getPageCount();
        if (task === 'extract') {
          const out = await PDFDocument.create();
          (await out.copyPages(source, parsePageList(pages, count))).forEach((page) => out.addPage(page));
          setOutputs([await save(out, `${baseName(files[0].name)}-pages.pdf`)]);
        } else if (task === 'split') {
          if (count > 300) throw new Error('Split works on PDFs of up to 300 pages.');
          const results: Output[] = [];
          for (let index = 0; index < count; index += 1) {
            const out = await PDFDocument.create();
            const [page] = await out.copyPages(source, [index]);
            out.addPage(page);
            results.push(await save(out, `${baseName(files[0].name)}-p${index + 1}.pdf`));
          }
          setOutputs(results);
        } else {
          const targets = pages.trim() ? parsePageList(pages, count) : source.getPageIndices();
          for (const index of targets) {
            const page = source.getPage(index);
            page.setRotation(degrees((page.getRotation().angle + angle) % 360));
          }
          setOutputs([await save(source, `${baseName(files[0].name)}-rotated.pdf`)]);
        }
      }
    } catch (caught) {
      setError((caught as Error).message);
    } finally {
      setBusy(false);
    }
  }

  const description = TASKS.find(([id]) => id === task)![2];

  return (
    <div className="flex flex-col gap-5">
      <div role="tablist" aria-label="Task" className="flex flex-wrap gap-1">
        {TASKS.map(([id, label]) => (
          <button key={id} type="button" role="tab" aria-selected={task === id} onClick={() => { setTask(id); reset(); if (id !== 'merge') setFiles((current) => current.slice(0, 1)); }}
            className={`inline-flex h-9 items-center rounded-lg px-3 text-[14px] ${focusRing} ${task === id ? 'bg-ink text-on-ink' : 'text-ink-2 hover:bg-soft'}`}>{label}</button>
        ))}
      </div>
      <p className="text-[14px] text-muted">{description}</p>

      <label className="flex cursor-pointer flex-col items-center gap-2 rounded-2xl border border-dashed border-line-3 bg-soft px-6 py-8 text-center hover:border-brand-100">
        <LuUpload className="h-5 w-5 text-brand" aria-hidden="true" />
        <span className="text-[15px] font-medium text-ink">{task === 'merge' ? 'Choose PDFs' : 'Choose a PDF'}</span>
        <span className="text-[13px] text-muted">Processed on this device. Nothing is uploaded.</span>
        <input type="file" accept="application/pdf,.pdf" multiple={task === 'merge'} className="sr-only"
          onChange={(event) => { const picked = Array.from(event.target.files || []); setFiles((current) => (task === 'merge' ? [...current, ...picked] : picked.slice(0, 1))); reset(); event.target.value = ''; }} />
      </label>

      {files.length > 0 && (
        <ul className="divide-y divide-line-2 rounded-xl border border-line">
          {files.map((file, index) => (
            <li key={`${file.name}-${index}`} className="flex items-center gap-2 px-4 py-2.5 text-[14px]">
              <span className="min-w-0 flex-1 truncate text-ink">{file.name}</span>
              <span className="text-subtle">{(file.size / 1024 / 1024).toFixed(1)} MB</span>
              {task === 'merge' && <>
                <button type="button" aria-label="Move up" disabled={index === 0} onClick={() => move(index, -1)} className={`grid size-8 place-items-center rounded-lg text-muted hover:bg-soft disabled:opacity-30 ${focusRing}`}><LuArrowUp className="h-4 w-4" /></button>
                <button type="button" aria-label="Move down" disabled={index === files.length - 1} onClick={() => move(index, 1)} className={`grid size-8 place-items-center rounded-lg text-muted hover:bg-soft disabled:opacity-30 ${focusRing}`}><LuArrowDown className="h-4 w-4" /></button>
              </>}
              <button type="button" aria-label={`Remove ${file.name}`} onClick={() => setFiles((current) => current.filter((_, i) => i !== index))} className={`grid size-8 place-items-center rounded-lg text-muted hover:bg-soft ${focusRing}`}><LuX className="h-4 w-4" /></button>
            </li>
          ))}
        </ul>
      )}

      {(task === 'extract' || task === 'rotate') && (
        <div className="grid gap-4 sm:grid-cols-2">
          <label>
            <span className="mb-1.5 block text-[14px] font-medium text-ink">Pages{task === 'rotate' ? <span className="font-normal text-subtle"> (blank for all)</span> : ''}</span>
            <input value={pages} onChange={(event) => setPages(event.target.value)} placeholder="e.g. 1-3, 7" className={`h-11 w-full rounded-xl border border-line bg-surface px-3.5 text-[15px] ${focusRing}`} />
          </label>
          {task === 'rotate' && (
            <label>
              <span className="mb-1.5 block text-[14px] font-medium text-ink">Turn by</span>
              <select value={angle} onChange={(event) => setAngle(Number(event.target.value))} className={`h-11 w-full rounded-xl border border-line bg-surface px-3 text-[15px] ${focusRing}`}>
                <option value={90}>90° clockwise</option><option value={180}>180°</option><option value={270}>90° anticlockwise</option>
              </select>
            </label>
          )}
        </div>
      )}

      <div><button type="button" onClick={run} disabled={busy || !files.length} className={`${btnPrimary} h-11 rounded-[10px] px-5 text-[15px]`}>{busy && <LuLoaderCircle className="h-4 w-4 animate-spin" aria-hidden="true" />}{TASKS.find(([id]) => id === task)![1]}</button></div>
      {error && <p role="alert" className="text-[14px] text-amber-800">{error}</p>}

      {outputs.length > 0 && (
        <ul aria-live="polite" className="flex flex-col gap-2">
          {outputs.map((output) => (
            <li key={output.url}>
              <a href={output.url} download={output.name} className={`inline-flex items-center gap-2 rounded-lg border border-line bg-surface px-3 py-2 text-[14px] text-brand hover:bg-soft ${focusRing}`}>
                <LuDownload className="h-4 w-4" aria-hidden="true" />{output.name} <span className="text-subtle">({output.pages} {output.pages === 1 ? 'page' : 'pages'})</span>
              </a>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
