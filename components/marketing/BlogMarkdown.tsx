import Link from 'next/link';
import { Children, isValidElement, type ReactNode } from 'react';
import ReactMarkdown, { type Components } from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { headingId } from '@/lib/blog';
import { focusRing } from './styles';

/** Plain text of rendered children, for heading ids. */
function textOf(children: ReactNode): string {
  return Children.toArray(children)
    .map((child) => {
      if (typeof child === 'string' || typeof child === 'number') return String(child);
      if (isValidElement<{ children?: ReactNode }>(child)) return textOf(child.props.children);
      return '';
    })
    .join('');
}

// Bare URLs in source lists are long unbroken strings; let them wrap anywhere so they can't widen the page.
const link = `[overflow-wrap:anywhere] font-medium text-brand underline decoration-brand/30 underline-offset-[3px] hover:decoration-brand ${focusRing} rounded-sm`;

const components: Components = {
  h2: ({ children }) => (
    <h2 id={headingId(textOf(children))} className="mb-4 mt-14 scroll-mt-24 text-balance text-[26px] font-bold leading-[1.2] tracking-[-0.02em] text-ink sm:text-[30px]">
      {children}
    </h2>
  ),
  h3: ({ children }) => (
    <h3 id={headingId(textOf(children))} className="mb-3 mt-9 scroll-mt-24 text-[20px] font-semibold leading-snug tracking-[-0.01em] text-ink">
      {children}
    </h3>
  ),
  h4: ({ children }) => <h4 className="mb-2 mt-7 text-[17px] font-semibold text-ink">{children}</h4>,
  p: ({ children }) => <p className="my-5 text-[17px] leading-[1.75] text-ink-2 break-words">{children}</p>,
  a: ({ href = '', children }) => {
    if (href.startsWith('/')) return <Link href={href} className={link}>{children}</Link>;
    if (href.startsWith('#')) return <a href={href} className={link}>{children}</a>;
    return <a href={href} className={link} target="_blank" rel="noopener noreferrer">{children}</a>;
  },
  ul: ({ children }) => <ul className="my-5 list-disc space-y-2 pl-6 text-[17px] leading-[1.7] text-ink-2 marker:text-subtle">{children}</ul>,
  ol: ({ children, start }) => <ol start={start} className="my-5 list-decimal space-y-2 pl-6 text-[17px] leading-[1.7] text-ink-2 marker:font-semibold marker:text-muted">{children}</ol>,
  li: ({ children }) => <li className="break-words pl-1.5">{children}</li>,
  strong: ({ children }) => <strong className="font-semibold text-ink">{children}</strong>,
  blockquote: ({ children }) => <blockquote className="my-6 border-l-[3px] border-brand bg-brand-50/60 py-1 pl-5 pr-4 [&>p]:my-3">{children}</blockquote>,
  hr: () => <hr className="my-12 border-line" />,
  table: ({ children }) => (
    <div className="my-7 overflow-x-auto rounded-xl border border-line">
      <table className="w-full border-collapse text-left text-[14.5px] leading-snug">{children}</table>
    </div>
  ),
  thead: ({ children }) => <thead className="bg-line-2/70">{children}</thead>,
  th: ({ children }) => <th scope="col" className="border-b border-line px-4 py-3 align-bottom font-semibold text-ink">{children}</th>,
  td: ({ children }) => <td className="border-b border-line-2 px-4 py-3 align-top text-ink-2 [tr:last-child_&]:border-b-0">{children}</td>,
  pre: ({ children }) => (
    <pre className="my-6 overflow-x-auto rounded-xl border border-line bg-soft p-5 text-[13.5px] leading-relaxed text-ink [&_code]:bg-transparent [&_code]:p-0 [&_code]:text-[13.5px]">
      {children}
    </pre>
  ),
  code: ({ children }) => <code className="rounded-md bg-line-2 [overflow-wrap:anywhere] px-1.5 py-0.5 font-mono text-[0.88em] text-ink">{children}</code>,
  img: ({ src, alt }) => (typeof src === 'string' ? <img src={src} alt={alt ?? ''} loading="lazy" className="my-6 rounded-xl border border-line" /> : null),
};

/** An article's Markdown with the site's type styles. Raw HTML in the Markdown is not rendered. */
export function BlogMarkdown({ markdown }: { markdown: string }) {
  return (
    <ReactMarkdown remarkPlugins={[remarkGfm]} components={components} skipHtml>
      {markdown}
    </ReactMarkdown>
  );
}
