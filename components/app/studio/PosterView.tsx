'use client';

/**
 * A poster on screen (title band, columns of blocks, figure placeholders, references) with its
 * downloads: PowerPoint at print size (plans with PowerPoint export) and a tikzposter .tex file
 * (plans with LaTeX export), and Open in editor.
 */
import { useMemo, useState } from 'react';
import { LuDownload, LuFilePen, LuImage, LuLoaderCircle } from 'react-icons/lu';
import { Button } from '@/components/app/ui';
import { api } from '@/lib/session';
import { showError, type Source } from '@/components/app/research/parts';
import { openResultInEditor } from '@/components/app/research/handoff';
import { POSTER_SIZES, posterColumns, posterSize, type Poster } from '@/lib/server/lib/posterModule';
import { blockWeight, posterBlocks, posterFileName, posterMarkdown, posterTex, numberCitations, splitColumns } from './poster';

function saveText(text: string, name: string, type: string) {
  const url = URL.createObjectURL(new Blob([text], { type }));
  const link = document.createElement('a');
  link.href = url;
  link.download = name;
  link.click();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export function PosterView({ poster, sources, inputs }: { poster: Poster; sources: Source[]; inputs: Record<string, string> }) {
  const [busy, setBusy] = useState<'pptx' | 'tex' | null>(null);
  const size = POSTER_SIZES[posterSize(inputs.size)];
  const count = posterColumns(inputs.layout);
  // On screen, markers show as the numbers the downloads use, with the same reference list.
  const { poster: numbered, references } = useMemo(() => numberCitations(poster, sources), [poster, sources]);
  const columns = useMemo(() => splitColumns(posterBlocks(numbered, references), count, blockWeight), [numbered, references, count]);

  const pptx = async () => {
    setBusy('pptx');
    try {
      await api('/api/studio/slides/export-allowed');
      const { downloadPosterPptx } = await import('./posterPptx');
      await downloadPosterPptx(poster, sources, inputs);
    } catch (error) { showError(error); } finally { setBusy(null); }
  };
  const tex = async () => {
    setBusy('tex');
    try {
      await api('/api/studio/poster/latex-allowed');
      saveText(posterTex(numbered, references, inputs), `${posterFileName(poster.title)}.tex`, 'application/x-tex;charset=utf-8');
    } catch (error) { showError(error); } finally { setBusy(null); }
  };

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <Button variant="primary" size="sm" onClick={pptx} disabled={Boolean(busy)}>{busy === 'pptx' ? <LuLoaderCircle className="h-4 w-4 animate-spin" /> : <LuDownload className="h-4 w-4" />}Download PowerPoint</Button>
        <Button size="sm" onClick={tex} disabled={Boolean(busy)}>{busy === 'tex' ? <LuLoaderCircle className="h-4 w-4 animate-spin" /> : <LuDownload className="h-4 w-4" />}Download LaTeX (.tex)</Button>
        <Button size="sm" onClick={() => openResultInEditor(poster.title, posterMarkdown(poster), sources)}><LuFilePen className="h-4 w-4" />Open in editor</Button>
        <span className="text-[13.5px] text-muted">{size.label}, {count} columns</span>
      </div>
      <div className="overflow-hidden rounded-xl border border-line bg-surface">
        <div className="bg-brand px-5 py-5 text-on-brand sm:px-6">
          <p className="font-serif text-[22px] font-semibold leading-tight">{poster.title}</p>
          <p className="mt-2 text-[14px] font-semibold opacity-90">{poster.authors}</p>
          <p className="text-[13px] opacity-80">{[poster.affiliations, poster.contact].filter(Boolean).join(' · ')}</p>
        </div>
        <div className={`grid gap-3 p-3 sm:p-4 ${count === 3 ? 'md:grid-cols-3' : 'md:grid-cols-2'}`}>
          {columns.map((blocks, index) => (
            <div key={index} className="flex min-w-0 flex-col gap-3">
              {blocks.map((block, at) => (
                <section key={at} className="overflow-hidden rounded-lg border border-line-2">
                  <p className="bg-brand px-3 py-1.5 text-[14px] font-semibold text-on-brand">
                    {block.kind === 'section' ? block.section.heading : block.kind === 'figure' ? `Figure: ${block.figure.title || 'Key figure'}` : 'References'}
                  </p>
                  <div className="px-3 py-2.5">
                    {block.kind === 'section' && (
                      <>
                        {block.section.text && <p className="text-[13.5px] leading-snug text-ink-2">{block.section.text}</p>}
                        {block.section.bullets.length > 0 && <ul className="mt-1.5 list-disc space-y-1 pl-5 text-[13.5px] leading-snug text-ink-2">{block.section.bullets.map((bullet, n) => <li key={n}>{bullet}</li>)}</ul>}
                      </>
                    )}
                    {block.kind === 'figure' && (
                      <div className="flex min-h-[110px] flex-col items-center justify-center gap-1.5 rounded-lg border border-dashed border-line bg-soft px-3 py-4 text-center">
                        <LuImage className="h-5 w-5 text-muted" aria-hidden="true" />
                        <p className="text-[13px] italic text-muted">{block.figure.description || 'Figure to add'}</p>
                      </div>
                    )}
                    {block.kind === 'references' && <ol className="list-decimal space-y-1 pl-5 text-[12.5px] leading-snug text-muted">{block.references.map((line, n) => <li key={n}>{line}</li>)}</ol>}
                  </div>
                </section>
              ))}
            </div>
          ))}
        </div>
      </div>
      <p className="mt-2 text-[12.5px] text-muted">Replace the [placeholders] and add your figures after downloading. The .tex file uses the tikzposter class and compiles with pdfLaTeX (for example on Overleaf).</p>
    </div>
  );
}
