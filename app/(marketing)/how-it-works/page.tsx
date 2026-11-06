import Link from 'next/link';
import { pageMetadata } from '@/components/marketing/seo';
import { container } from '@/components/marketing/styles';
import { FinalCta, PageIntro, Points, STEPS, StartButton, h2Item, visualPanel } from '@/components/marketing/landing';
import { FigCaption } from '@/components/marketing/Marginalia';

export const metadata = pageMetadata({
  title: 'How to write a research paper with AI',
  path: '/how-it-works',
  description:
    'Write a research paper with AI in three steps: open your Word file, write with AI that cites real papers, then check your claims and export to Word or LaTeX.',
});

export default function HowItWorksPage() {
  return (
    <>
      <PageIntro title="From blank page to cited paper" intro="Three steps in one editor. Start from your own file, write with AI that cites real papers, then check your claims and export.">
        <StartButton />
      </PageIntro>

      <ol className={`${container} flex flex-col gap-20 pt-16 md:gap-28 md:pt-24`}>
        {STEPS.map((step, index) => (
          <li key={step.id} id={step.id} aria-labelledby={`${step.id}-title`} className="grid scroll-mt-8 items-center gap-8 md:grid-cols-2 md:gap-14">
            <div className={index % 2 ? 'md:order-2' : ''}>
              <p className="flex items-center gap-3">
                <span className="grid size-10 place-items-center rounded-full bg-ink text-[15px] font-semibold text-on-ink" aria-hidden="true">{index + 1}</span>
                <span className="grid size-10 place-items-center rounded-xl bg-brand-50 text-brand" aria-hidden="true">{step.icon}</span>
              </p>
              <h2 id={`${step.id}-title`} className={`mt-4 ${h2Item}`}>
                <span className="sr-only">Step {index + 1}: </span>{step.title}
              </h2>
              <p className="mt-3 max-w-[480px] text-[15px] leading-[1.6] text-muted md:text-[16px]">{step.body}</p>
              <Points items={step.points} />
            </div>
            <div className={`min-w-0 ${index % 2 ? 'md:order-1' : ''}`}>
              <div className={visualPanel}>{step.visual}</div>
              <FigCaption n={index + 1}>{step.short}</FigCaption>
            </div>
          </li>
        ))}
      </ol>

      <p className={`${container} pt-16 text-center text-[15px] text-muted md:pt-24`}>
        More about each tool on <Link href="/features" className="text-ink underline underline-offset-4 hover:text-brand">Features</Link>; shortcuts and tips in the <Link href="/help" className="text-ink underline underline-offset-4 hover:text-brand">help center</Link>.
      </p>

      <FinalCta />
    </>
  );
}
