'use client';

/**
 * The top of Writing Studio: the editor (co-writing with autocomplete and live citations) and
 * the templates. With no earlier work, a template opens a new document with its headings; when
 * the person came with research (or has a result on screen), the template is written from it.
 */
import Link from 'next/link';
import type { IconType } from 'react-icons';
import {
  LuArrowRight, LuArrowUpRight, LuBookOpen, LuClipboardList, LuFileText, LuFlaskConical,
  LuLandmark, LuLibrary, LuMic, LuNotebookPen, LuPresentation,
} from 'react-icons/lu';
import { openInEditor } from '@/components/tools/editorHandoff';
import { openResultInEditor } from '@/components/app/research/handoff';
import { TEMPLATES } from '@/lib/server/lib/studioCatalog';
import type { StudioIntroContext } from './StudioWorkspace';

const escape = (text: string) => text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

export function openTemplate(id: string) {
  const template = TEMPLATES.find((item) => item.id === id);
  if (!template) return;
  const html = `<h1>${escape(template.label)}</h1>${template.sections.map(([heading, hint]) => `<h2>${escape(heading)}</h2><p>${hint ? `<em>${escape(hint)}</em>` : ''}</p>`).join('')}`;
  const markdown = `# ${template.label}\n\n${template.sections.map(([heading, hint]) => `## ${heading}\n\n${hint ? `*${hint}*` : ''}`).join('\n\n')}`;
  openInEditor({ title: template.label, html, markdown, style: 'apa' });
}

/** One icon per template so the grid reads at a glance; anything unlisted falls back to a page. */
const TEMPLATE_ICONS: Record<string, IconType> = {
  imrad: LuFlaskConical,
  'literature-review': LuLibrary,
  'thesis-chapter': LuBookOpen,
  'research-proposal': LuClipboardList,
  grant: LuLandmark,
  'conference-abstract': LuMic,
  poster: LuPresentation,
};

export function WriteIntro({ from, startTemplate }: StudioIntroContext) {
  const editorBar = 'group flex w-full flex-col gap-4 rounded-2xl bg-brand px-5 py-4 text-left text-on-brand shadow-sm transition-colors hover:bg-brand-600 sm:flex-row sm:items-center';
  const editorBody = (
    <>
      <span className="flex min-w-0 flex-1 items-center gap-4">
        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-white/15">
          <LuNotebookPen className="h-5 w-5" aria-hidden="true" />
        </span>
        <span className="min-w-0">
          <span className="block text-[16px] font-bold leading-tight">Write in the editor</span>
          <span className="mt-1 block text-[13.5px] leading-snug opacity-80 lg:truncate">
            {from
              ? `Open “${from.title}” as a document with its citations live, and keep writing.`
              : 'Write with AI suggestions that cite real papers as you type, @-cite from 250M+ works, and share with co-authors.'}
          </span>
        </span>
      </span>
      <span className="inline-flex shrink-0 items-center gap-1.5 self-start rounded-lg bg-white px-4 py-2 text-[14px] font-semibold text-brand sm:self-auto">
        {from ? 'Open in the editor' : 'New document'}
        <LuArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" aria-hidden="true" />
      </span>
    </>
  );
  return (
    <div className="mb-8 space-y-5">
      {from && from.markdown.trim()
        ? <button type="button" onClick={() => openResultInEditor(from.title, from.markdown, from.sources)} className={editorBar}>{editorBody}</button>
        : <Link href="/editor?new=1" className={editorBar}>{editorBody}</Link>}

      <section aria-labelledby="templates-title" className="rounded-2xl border border-line bg-surface p-5 shadow-sm">
        <div className="flex flex-wrap items-end justify-between gap-x-4 gap-y-1">
          <div>
            <h2 id="templates-title" className="text-[17px] font-bold text-ink">Start from a template</h2>
            <p className="mt-0.5 text-[13.5px] text-muted">
              {from ? `Written from “${from.title}”, citing its sources.` : 'A new document with the headings and writing prompts already in place.'}
            </p>
          </div>
          <span className="text-[12.5px] font-medium text-subtle">{TEMPLATES.length} templates</span>
        </div>
        <ul className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {TEMPLATES.map((template) => {
            const Icon = TEMPLATE_ICONS[template.id] ?? (template.id.startsWith('checklist-') ? LuClipboardList : LuFileText);
            return (
              <li key={template.id}>
                <button
                  type="button"
                  onClick={() => (from && !template.blankOnly ? startTemplate(template.id) : openTemplate(template.id))}
                  className="group flex h-full w-full flex-col rounded-xl border border-line bg-surface p-4 text-left transition hover:-translate-y-0.5 hover:border-brand hover:shadow-md"
                >
                  <span className="flex w-full items-center justify-between">
                    <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-brand-50 text-brand transition-colors group-hover:bg-brand group-hover:text-on-brand">
                      <Icon className="h-[18px] w-[18px]" aria-hidden="true" />
                    </span>
                    <LuArrowUpRight className="h-4 w-4 text-subtle opacity-0 transition-opacity group-hover:opacity-100" aria-hidden="true" />
                  </span>
                  <span className="mt-3 block text-[14.5px] font-semibold text-ink">{template.label}</span>
                  <span className="mt-1 line-clamp-2 block text-[12.5px] leading-snug text-muted">{template.short}</span>
                </button>
              </li>
            );
          })}
        </ul>
      </section>
    </div>
  );
}
