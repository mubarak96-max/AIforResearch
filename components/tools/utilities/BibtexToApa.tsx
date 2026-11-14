'use client';

/**
 * BibTeX to APA: paste BibTeX or open a .bib file (read in the browser, never uploaded), parse it
 * with citation-js and format it in APA 7 or any CSL style. Each entry lists the fields it lacks.
 * Copy, or download as .txt or .ris.
 */
import { useEffect, useMemo, useState, type ChangeEvent } from 'react';
import { LuDownload, LuLoaderCircle, LuTriangleAlert, LuUpload } from 'react-icons/lu';
import { missingFields, parseBibtex, toRis, type CslItem } from '@/lib/bibtexTools';
import { focusRing } from '@/components/marketing/styles';
import { StylePicker, control, copyRich, format, textOf, type Csl } from '../CitationGenerator';

const MAX_BYTES = 2_000_000;
const small = `inline-flex h-8 shrink-0 items-center gap-1 rounded-lg border border-line px-2.5 text-[13px] text-ink-2 hover:bg-soft disabled:opacity-50 ${focusRing}`;

const EXAMPLE = `@article{ioannidis2005,
  author  = {Ioannidis, John P. A.},
  title   = {Why Most Published Research Findings Are False},
  journal = {PLoS Medicine},
  year    = {2005},
  volume  = {2},
  number  = {8},
  pages   = {e124},
  doi     = {10.1371/journal.pmed.0020124}
}`;

function download(name: string, text: string, type: string) {
  const url = URL.createObjectURL(new Blob([text], { type }));
  const link = document.createElement('a');
  link.href = url;
  link.download = name;
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export function BibtexToApa() {
  const [bib, setBib] = useState('');
  const [style, setStyle] = useState('apa');
  const [parsed, setParsed] = useState<ReturnType<typeof parseBibtex>>({ items: [], errors: [] });
  const [formatted, setFormatted] = useState<{ entries: { id: string; html: string }[]; numeric: boolean } | null>(null);
  const [busy, setBusy] = useState(false);
  const [fileNote, setFileNote] = useState<string | null>(null);
  const [copied, setCopied] = useState<string | null>(null);

  // Parse shortly after typing stops.
  useEffect(() => {
    const timer = window.setTimeout(() => setParsed(bib.trim() ? parseBibtex(bib) : { items: [], errors: [] }), 300);
    return () => window.clearTimeout(timer);
  }, [bib]);

  useEffect(() => {
    if (!parsed.items.length) { setFormatted(null); return; }
    let cancelled = false;
    setBusy(true);
    format(parsed.items as Csl[], style)
      .then((result) => { if (!cancelled) setFormatted(result); })
      .catch(() => { if (!cancelled) setFormatted(null); })
      .finally(() => { if (!cancelled) setBusy(false); });
    return () => { cancelled = true; };
  }, [parsed, style]);

  const byId = useMemo(() => new Map<string, CslItem>(parsed.items.map((item) => [item.id, item])), [parsed]);
  const ordered = useMemo(() => {
    if (!formatted) return [];
    const rows = formatted.entries.map((entry) => ({ ...entry, text: textOf(entry.html), missing: missingFields(byId.get(entry.id) ?? { id: entry.id, type: 'article-journal' }) }));
    return formatted.numeric ? rows : rows.sort((a, b) => a.text.localeCompare(b.text));
  }, [formatted, byId]);
  const warned = ordered.filter((row) => row.missing.length).length;

  async function openFile(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    if (file.size > MAX_BYTES) { setFileNote('That file is over 2 MB. Paste part of it instead.'); return; }
    try {
      setBib(await file.text());
      setFileNote(`Read ${file.name} in your browser. It was not uploaded.`);
    } catch {
      setFileNote('Could not read that file.');
    }
  }

  const flash = (key: string) => { setCopied(key); window.setTimeout(() => setCopied(null), 1600); };
  const plain = ordered.map((row) => row.text).join('\n');

  return (
    <div className="flex flex-col gap-6">
      <div>
        <div className="mb-1.5 flex flex-wrap items-end justify-between gap-2">
          <label htmlFor="bib-input" className="text-[14px] font-medium text-ink">BibTeX</label>
          <div className="flex gap-2">
            {!bib && <button type="button" onClick={() => setBib(EXAMPLE)} className={small}>Try an example</button>}
            <label className={`${small} cursor-pointer focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-brand`}>
              <LuUpload className="h-3.5 w-3.5" aria-hidden="true" />Open a .bib file
              <input type="file" accept=".bib,.bibtex,.txt,text/plain,application/x-bibtex" onChange={openFile} className="sr-only" />
            </label>
          </div>
        </div>
        <textarea id="bib-input" aria-describedby="bib-help" value={bib} onChange={(event) => setBib(event.target.value.slice(0, MAX_BYTES))} rows={10} spellCheck={false}
          placeholder={EXAMPLE} className={`${control} py-3 font-mono text-[13.5px] leading-[1.5]`} />
        <p id="bib-help" className="mt-1 text-[12.5px] text-muted">Paste entries from Zotero, Mendeley, JabRef, Overleaf or Google Scholar. Everything runs in your browser.</p>
        {fileNote && <p role="status" className="mt-1 text-[13px] text-ink-2">{fileNote}</p>}
      </div>

      <StylePicker value={style} onChange={setStyle} />

      <section aria-labelledby="bib-output" className="rounded-2xl border border-line bg-surface">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-line-2 px-5 py-3">
          <div>
            <h2 id="bib-output" className="text-[15px] font-semibold text-ink">References {ordered.length > 0 && <span className="font-normal text-muted">({ordered.length})</span>}</h2>
            <p aria-live="polite" className="text-[13px] text-muted">
              {ordered.length > 0 ? (warned ? `${warned} with missing fields.` : 'No missing fields found.') : ''}
              {parsed.errors.length > 0 && ` ${parsed.errors.length} could not be read.`}
            </p>
          </div>
          {ordered.length > 0 && (
            <div className="flex flex-wrap gap-2">
              <button type="button" onClick={async () => { if (await copyRich(ordered.map((row) => row.html).join(''), plain)) flash('rich'); }}
                className={`inline-flex h-8 items-center rounded-lg bg-brand px-2.5 text-[13px] font-medium text-on-brand hover:bg-brand-600 ${focusRing}`}>{copied === 'rich' ? 'Copied' : 'Copy (with italics)'}</button>
              <button type="button" onClick={async () => { try { await navigator.clipboard.writeText(plain); flash('text'); } catch { /* blocked */ } }} className={small}>{copied === 'text' ? 'Copied' : 'Copy plain text'}</button>
              <button type="button" onClick={() => download('references.txt', `${plain}\n`, 'text/plain;charset=utf-8')} className={small}><LuDownload className="h-3.5 w-3.5" aria-hidden="true" />.txt</button>
              <button type="button" onClick={() => download('references.ris', toRis(parsed.items), 'application/x-research-info-systems;charset=utf-8')} className={small}><LuDownload className="h-3.5 w-3.5" aria-hidden="true" />.ris</button>
            </div>
          )}
        </div>
        <div aria-live="polite">
          {parsed.errors.length > 0 && (
            <ul className="border-b border-line-2 px-5 py-3 text-[13px] text-rose-800">
              {parsed.errors.map((error) => <li key={error.key}><span className="font-mono">{error.key}</span>: {error.message} Check its braces and commas.</li>)}
            </ul>
          )}
          {!bib.trim() ? (
            <p className="px-5 py-8 text-center text-[14.5px] text-muted">Paste BibTeX or open a .bib file to see the references.</p>
          ) : busy && !formatted ? (
            <p className="flex items-center gap-2 px-5 py-6 text-[14px] text-muted"><LuLoaderCircle className="h-4 w-4 animate-spin" aria-hidden="true" />Loading the style…</p>
          ) : ordered.length === 0 ? (
            <p className="px-5 py-8 text-center text-[14.5px] text-muted">No BibTeX entries found. Each entry starts with @article, @book or similar.</p>
          ) : (
            <ol className="divide-y divide-line-2">
              {ordered.map((row) => (
                <li key={row.id} className="px-5 py-4">
                  <div className="pl-8 -indent-8 font-serif text-[15.5px] leading-[1.6] text-ink [overflow-wrap:anywhere]" dangerouslySetInnerHTML={{ __html: row.html }} />
                  <p className="mt-1.5 flex flex-wrap items-center gap-x-2 text-[12.5px] text-muted">
                    <span className="font-mono">{row.id}</span>
                    {row.missing.length > 0 && (
                      <span className="inline-flex items-center gap-1 text-amber-900"><LuTriangleAlert className="h-3.5 w-3.5" aria-hidden="true" />Missing: {row.missing.join(', ')}</span>
                    )}
                  </p>
                </li>
              ))}
            </ol>
          )}
        </div>
      </section>
      <p className="text-[13px] text-muted">BibTeX often stores titles in title case and drops accents in braces. Check capitalisation, names and DOIs against the source before you submit.</p>
    </div>
  );
}
