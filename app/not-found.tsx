import type { Metadata } from 'next';
import Link from 'next/link';
import { SiteFooter } from '@/components/marketing/SiteFooter';
import { SiteHeader } from '@/components/marketing/SiteHeader';
import { btnGhost, btnPrimary, container } from '@/components/marketing/styles';

export const metadata: Metadata = { title: 'Page not found', robots: { index: false, follow: true } };

const LINKS = [
  { label: 'Features', href: '/features', text: 'AI writing, citations and claim check' },
  { label: 'Blog', href: '/blog', text: 'Guides for writers who work with sources' },
  { label: 'Citation generator', href: '/citation-styles', text: 'APA, MLA, Chicago and 10,000+ styles' },
  { label: 'Help center', href: '/help', text: 'How to write, cite and export' },
];

/** Any unknown address: say so plainly and offer the main ways back in. */
export default function NotFound() {
  return (
    <div className="flex min-h-dvh flex-col">
      <SiteHeader />
      <main id="main" className={`${container} flex-1 pb-20 pt-16 text-center md:pt-24`}>
        <p className="text-[13px] font-semibold uppercase tracking-[0.2em] text-muted">404</p>
        <h1 className="mx-auto mt-3 max-w-[640px] text-balance font-serif text-[34px] font-semibold leading-[1.1] tracking-[-0.02em] text-ink md:text-[46px]">We couldn&rsquo;t find that page</h1>
        <p className="mx-auto mt-4 max-w-[480px] text-[16px] leading-relaxed text-muted md:text-[17px]">The link may be old, or the address mistyped. These are good places to start.</p>
        <div className="mt-7 flex flex-wrap justify-center gap-3">
          <Link href="/" className={`${btnPrimary} h-11 rounded-[10px] px-5 text-[15px]`}>Go to the home page</Link>
          <Link href="/editor" className={`${btnGhost} h-11 rounded-[10px] px-5 text-[15px]`}>Open your documents</Link>
        </div>
        <ul className="mx-auto mt-14 grid max-w-[760px] gap-3 text-left sm:grid-cols-2">
          {LINKS.map((link) => (
            <li key={link.href}>
              <Link href={link.href} className="block rounded-2xl border border-line px-5 py-4 transition-colors hover:border-brand-100 hover:bg-soft">
                <span className="block text-[15.5px] font-semibold text-ink">{link.label}</span>
                <span className="mt-0.5 block text-[14px] text-muted">{link.text}</span>
              </Link>
            </li>
          ))}
        </ul>
      </main>
      <SiteFooter />
    </div>
  );
}
