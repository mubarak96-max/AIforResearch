import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { pageMetadata } from '@/components/marketing/seo';
import { container, focusRing } from '@/components/marketing/styles';
import { h2 } from '@/components/marketing/landing';
import { Formatted } from '@/components/marketing/Formatted';
import { ToolPage } from '@/components/tools/ToolPage';
import { CITATION_STYLES, getCitationStyle } from '@/lib/citationStyles';
import { getTool } from '@/lib/tools';

type Props = { params: Promise<{ style: string }> };

export const dynamicParams = false;

export function generateStaticParams() {
  return CITATION_STYLES.map((style) => ({ style: style.slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const style = getCitationStyle((await params).style);
  if (!style) return {};
  return { ...pageMetadata({ title: style.seoTitle, description: style.description, path: `/tools/citation-generator/${style.slug}` }), keywords: style.keywords };
}

const card = 'rounded-2xl border border-line bg-surface';
const label = 'text-[12px] font-medium uppercase tracking-[.1em] text-subtle';
/** A reference as it sits in a list: hanging indent, serif like a paper. */
const referenceText = 'pl-8 -indent-8 font-serif text-[16.5px] leading-[1.65] text-ink [overflow-wrap:anywhere]';

export default async function CitationStylePage({ params }: Props) {
  const style = getCitationStyle((await params).style);
  if (!style) notFound();
  const tool = getTool('citation-generator')!;
  const path = `/tools/citation-generator/${style.slug}`;
  const others = CITATION_STYLES.filter((other) => other.slug !== style.slug);

  return (
    <ToolPage
      tool={tool}
      heading={style.heading}
      intro={style.intro}
      description={style.description}
      faq={style.faq}
      path={path}
      defaultStyle={style.cslId}
      crumbs={[{ name: 'Tools', path: '/tools' }, { name: 'Citation generator', path: '/tools/citation-generator' }, { name: style.name, path }]}
    >
      <div className={`${container} grid gap-14 pt-20 md:pt-24 lg:grid-cols-[minmax(0,1fr)_300px] lg:gap-16`}>
        <div className="flex min-w-0 flex-col gap-16">
          <section aria-labelledby="example-title">
            <h2 id="example-title" className={h2}>{style.name} example</h2>
            <p className="mt-3 text-[15.5px] leading-[1.6] text-muted">
              The 1953 paper in which Watson and Crick described the structure of DNA (DOI <a href="https://doi.org/10.1038/171737a0" className="underline underline-offset-4 hover:text-ink">10.1038/171737a0</a>), cited in {style.name}.
            </p>
            <div className={`mt-6 ${card}`}>
              <div className="border-b border-line-2 px-6 py-5">
                <p className={label}>In the text</p>
                <dl className="mt-3 grid gap-2.5">
                  {style.inText.map((item) => (
                    <div key={item.label} className="grid gap-0.5 sm:grid-cols-[200px_1fr] sm:gap-4">
                      <dt className="text-[14px] text-muted">{item.label}</dt>
                      <dd className="font-serif text-[16.5px] text-ink"><Formatted text={item.text} /></dd>
                    </div>
                  ))}
                </dl>
              </div>
              {style.note && (
                <div className="border-b border-line-2 px-6 py-5">
                  <p className={label}>First footnote</p>
                  <p className={`mt-3 ${referenceText}`}><Formatted text={style.note} /></p>
                </div>
              )}
              <div className="px-6 py-5">
                <p className={label}>{style.listName}</p>
                <p className={`mt-3 ${referenceText}`}><Formatted text={style.reference} /></p>
              </div>
            </div>
          </section>

          <section aria-labelledby="patterns-title">
            <h2 id="patterns-title" className={h2}>{style.name} format for common sources</h2>
            <dl className="mt-6 flex flex-col gap-4">
              {style.patterns.map((pattern) => (
                <div key={pattern.label} className={`${card} px-6 py-5`}>
                  <dt className="text-[15px] font-semibold text-ink">{pattern.label}</dt>
                  <dd className={`mt-2 ${referenceText}`}><Formatted text={pattern.text} /></dd>
                </div>
              ))}
            </dl>
          </section>

          <section aria-labelledby="rules-title">
            <h2 id="rules-title" className={h2}>Main {style.name} rules</h2>
            <ul className="mt-6 flex list-disc flex-col gap-3 pl-5 text-[15.5px] leading-[1.6] text-ink-2 marker:text-subtle">
              {style.rules.map((rule) => <li key={rule}>{rule}</li>)}
            </ul>
            <p className="mt-5 text-[14px] text-muted">Your course, publisher or university may change these rules. When they differ, follow them.</p>
          </section>
        </div>

        <aside className="flex flex-col gap-6 lg:sticky lg:top-24 lg:self-start">
          <div className={`${card} px-5 py-5`}>
            <p className={label}>At a glance</p>
            <dl className="mt-3 grid gap-3 text-[14.5px]">
              <div><dt className="text-muted">Type</dt><dd className="text-ink">{style.kind}</dd></div>
              <div><dt className="text-muted">Edition</dt><dd className="text-ink">{style.edition}</dd></div>
              <div><dt className="text-muted">Used in</dt><dd className="text-ink">{style.usedIn}</dd></div>
              <div><dt className="text-muted">List at the end</dt><dd className="text-ink">{style.listName}</dd></div>
            </dl>
          </div>
          <nav aria-labelledby="other-styles" className={`${card} px-5 py-5`}>
            <p id="other-styles" className={label}>Other styles</p>
            <ul className="mt-3 grid gap-1.5 text-[14.5px]">
              {others.map((other) => (
                <li key={other.slug}><Link href={`/tools/citation-generator/${other.slug}`} className={`rounded text-ink-2 hover:text-brand ${focusRing}`}>{other.name} citation generator</Link></li>
              ))}
            </ul>
          </nav>
        </aside>
      </div>
    </ToolPage>
  );
}
