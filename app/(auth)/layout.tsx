import Link from 'next/link';
import { LuArrowLeft } from 'react-icons/lu';
import { Logo } from '@/components/Logo';
import { focusRing } from '@/components/marketing/styles';

/**
 * Sign-in pages. Wide screens: a navy panel on the left (fixed navy: the theme's brand token
 * turns light in dark mode) with one line about the product, the form on
 * the right. Phones: a slim brand bar sized to fit, and the form centred in the space below it.
 */
export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="grid min-h-dvh grid-rows-[auto_1fr] bg-surface text-ink lg:grid-cols-[minmax(0,1.05fr)_minmax(0,1fr)] lg:grid-rows-1">
      <aside className={`flex items-center justify-between bg-soft px-5 py-3 lg:flex-col lg:items-stretch lg:px-14 lg:py-10 xl:px-20 lg:bg-[#1e3a5f]`}>
        <Link href="/" className={`inline-flex items-center gap-2 rounded-lg ${focusRing}`}>
          <span className="rounded-[22%] lg:ring-2 lg:ring-white/25"><Logo size={30} showName={false} /></span>
          <span className="text-[19px] font-extrabold leading-none tracking-[-0.02em] lg:text-white">
            <span className="text-brand lg:text-white">AI</span> for Research
          </span>
          <span className="sr-only">home</span>
        </Link>

        <div className="hidden lg:block">
          <p className="max-w-[560px] text-balance font-serif text-[clamp(44px,4vw,64px)] font-semibold leading-[1.06] tracking-[-0.02em] text-white">
            Answers you can cite.
          </p>
          <p className="mt-6 max-w-[440px] text-[18px] leading-[1.55] text-white/80">
            Every claim linked to the paper behind it.
          </p>
        </div>

        <p className="hidden text-[13px] text-white/65 lg:block">
          © {new Date().getFullYear()} AI for Research ·{' '}
          <Link href="/help" className="rounded hover:text-white">Help center</Link> ·{' '}
          <Link href="/pricing" className="rounded hover:text-white">Pricing</Link>
        </p>

        <Link href="/" className={`inline-flex items-center gap-1.5 rounded text-[13px] text-muted hover:text-ink lg:hidden ${focusRing}`}>
          <LuArrowLeft className="h-3.5 w-3.5" aria-hidden="true" />Home
        </Link>
      </aside>

      <main className="flex min-w-0 flex-col px-5 py-8 sm:px-8 lg:px-12 lg:py-7">
        <Link href="/" className={`hidden items-center gap-1.5 self-end rounded text-[13px] text-muted hover:text-ink lg:inline-flex ${focusRing}`}>
          <LuArrowLeft className="h-3.5 w-3.5" aria-hidden="true" />Back to home
        </Link>
        <div className="mx-auto my-auto w-full max-w-[400px] py-4">{children}</div>
      </main>
    </div>
  );
}
