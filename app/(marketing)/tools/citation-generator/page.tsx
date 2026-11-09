import Link from 'next/link';
import { LuArrowRight } from 'react-icons/lu';
import { pageMetadata } from '@/components/marketing/seo';
import { container, focusRing } from '@/components/marketing/styles';
import { h2 } from '@/components/marketing/landing';
import { ToolPage } from '@/components/tools/ToolPage';
import { CITATION_STYLES } from '@/lib/citationStyles';
import { getTool } from '@/lib/tools';

const tool = getTool('citation-generator')!;

export const metadata = { ...pageMetadata({ title: tool.seoTitle, description: tool.description, path: '/tools/citation-generator' }), keywords: tool.keywords };

export default function CitationGeneratorPage() {
  return (
    <ToolPage tool={tool}>
      <section aria-labelledby="styles-title" className={`${container} pt-20 md:pt-24`}>
        <h2 id="styles-title" className={h2}>Citation generator by style</h2>
        <p className="mt-3 max-w-[620px] text-[15.5px] leading-[1.6] text-muted">Examples and the main rules for each style, with the same paper cited in each so you can compare them.</p>
        <ul className="mt-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {CITATION_STYLES.map((style) => (
            <li key={style.slug}>
              <Link href={`/tools/citation-generator/${style.slug}`} className={`group flex items-center justify-between gap-3 rounded-xl border border-line px-5 py-4 hover:border-brand-100 ${focusRing}`}>
                <span>
                  <span className="block text-[16px] font-semibold text-ink group-hover:text-brand">{style.name} citation generator</span>
                  <span className="block text-[13.5px] text-muted">{style.edition} · {style.kind}</span>
                </span>
                <LuArrowRight className="h-4 w-4 shrink-0 text-muted group-hover:text-brand" aria-hidden="true" />
              </Link>
            </li>
          ))}
        </ul>
        <p className="mt-6 text-[15px] text-muted">
          Writing a paper? In the editor, citations stay live and the reference list builds itself. <Link href="/features/paper-search" className="text-ink underline underline-offset-4 hover:text-brand">Find papers and cite as you write</Link>.
        </p>
      </section>
    </ToolPage>
  );
}
