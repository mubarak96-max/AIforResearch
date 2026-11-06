import type { ReactNode } from 'react';
import { COMPANY } from '@/lib/site';
import { container, focusRing } from './styles';

export { COMPANY };

/** "email us at …" when a support address is set, otherwise the help center. */
export function ContactLine() {
  return COMPANY.email
    ? <>email <a href={`mailto:${COMPANY.email}`} className="text-ink underline underline-offset-4 hover:text-brand">{COMPANY.email}</a></>
    : <>contact us through the <a href="/help" className="text-ink underline underline-offset-4 hover:text-brand">help center</a></>;
}

export type LegalSection = { id: string; title: string; body: ReactNode };

/** Privacy policy and terms: a title, the date, a contents list and numbered sections. */
export function LegalPage({ title, intro, updated, sections }: { title: string; intro: ReactNode; updated: string; sections: LegalSection[] }) {
  const updatedLabel = new Date(`${updated}T00:00:00Z`).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric', timeZone: 'UTC' });
  return (
    <div className={container}>
      <div className="max-w-[760px] pb-6 pt-10 md:pt-[46px]">
        <h1 className="text-[34px] font-bold tracking-[-0.03em] text-ink sm:text-[42px]">{title}</h1>
        <p className="mt-2 text-[14px] text-muted">Last updated <time dateTime={updated}>{updatedLabel}</time></p>
        <div className="mt-5 text-[17px] leading-relaxed text-ink-2">{intro}</div>
      </div>
      <div className="grid gap-10 pb-20 md:grid-cols-[220px_minmax(0,1fr)] md:gap-14">
        <nav aria-label="Contents" className="hidden md:block">
          <ol className="sticky top-24 space-y-1 text-[14.5px]">
            {sections.map((section, index) => (
              <li key={section.id}>
                <a href={`#${section.id}`} className={`block rounded-lg px-2.5 py-1.5 text-ink-2 hover:bg-soft hover:text-ink ${focusRing}`}>{index + 1}. {section.title}</a>
              </li>
            ))}
          </ol>
        </nav>
        <div className="max-w-[720px] space-y-10">
          {sections.map((section, index) => (
            <section key={section.id} id={section.id} aria-labelledby={`${section.id}-title`} className="scroll-mt-24">
              <h2 id={`${section.id}-title`} className="mb-3 text-[22px] font-bold tracking-[-0.02em] text-ink">{index + 1}. {section.title}</h2>
              <div className="space-y-3 text-[15.5px] leading-relaxed text-ink-2 [&_li]:ml-5 [&_li]:list-disc [&_ul]:space-y-1.5">{section.body}</div>
            </section>
          ))}
        </div>
      </div>
    </div>
  );
}
