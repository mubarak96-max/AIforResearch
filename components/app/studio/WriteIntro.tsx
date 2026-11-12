'use client';

/**
 * The top of Writing Studio: the editor (co-writing with autocomplete and live citations) and
 * the templates that open a new document with the right headings.
 */
import Link from 'next/link';
import { LuArrowRight, LuFileText, LuNotebookPen } from 'react-icons/lu';
import { openInEditor } from '@/components/tools/editorHandoff';
import { TEMPLATES } from '@/lib/server/lib/studioCatalog';

const escape = (text: string) => text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

export function openTemplate(id: string) {
  const template = TEMPLATES.find((item) => item.id === id);
  if (!template) return;
  const html = `<h1>${escape(template.label)}</h1>${template.sections.map(([heading, hint]) => `<h2>${escape(heading)}</h2><p>${hint ? `<em>${escape(hint)}</em>` : ''}</p>`).join('')}`;
  const markdown = `# ${template.label}\n\n${template.sections.map(([heading, hint]) => `## ${heading}\n\n${hint ? `*${hint}*` : ''}`).join('\n\n')}`;
  openInEditor({ title: template.label, html, markdown, style: 'apa' });
}

export function WriteIntro() {
  return (
    <div className="mb-8 grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.3fr)]">
      <Link href="/editor?new=1" className="group flex flex-col justify-between rounded-2xl bg-brand p-5 text-on-brand">
        <span>
          <LuNotebookPen className="h-6 w-6" aria-hidden="true" />
          <span className="mt-3 block text-[19px] font-bold">Write in the editor</span>
          <span className="mt-1 block text-[14.5px] leading-relaxed opacity-85">Write yourself with AI suggestions that cite real papers as you type, @-cite from 250M+ works, and share with co-authors.</span>
        </span>
        <span className="mt-4 inline-flex items-center gap-1.5 text-[14.5px] font-semibold">New document<LuArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" aria-hidden="true" /></span>
      </Link>
      <section aria-labelledby="templates-title" className="rounded-2xl border border-line bg-surface p-5">
        <h2 id="templates-title" className="text-[16px] font-bold text-ink">Start from a template</h2>
        <ul className="mt-3 grid gap-1 sm:grid-cols-2">
          {TEMPLATES.map((template) => (
            <li key={template.id}>
              <button type="button" onClick={() => openTemplate(template.id)} title={template.short} className="flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-left text-[14px] font-medium text-ink-2 hover:bg-soft">
                <LuFileText className="h-4 w-4 shrink-0 text-brand" aria-hidden="true" /><span className="truncate">{template.label}</span>
              </button>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
