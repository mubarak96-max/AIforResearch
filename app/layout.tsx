import type { Metadata, Viewport } from 'next';
import { Inter, Source_Serif_4 } from 'next/font/google';
import './globals.css';
import { PricingDialog } from '@/components/billing/PricingDialog';
import { ThemeSync } from '@/components/theme/theme';
import { themeInitScript } from '@/components/theme/themeScript';
import { authInitScript } from '@/components/marketing/authScript';
import { SITE_URL } from '@/lib/site';
import { PrivacyControls } from '@/components/analytics/PrivacyControls';

const inter = Inter({ subsets: ['latin'], variable: '--font-inter', display: 'swap' });
// Italic too: headings stress one word in italic, and figure captions are set in italic.
const serif = Source_Serif_4({ subsets: ['latin'], style: ['normal', 'italic'], variable: '--font-serif', display: 'swap' });

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: { default: 'AI for Research — AI writing editor and citation generator', template: '%s · AI for Research' },
  description:
    'Write faster with AI that cites real papers. Generate citations in 10,000+ styles, check every claim and export to Word or LaTeX.',
  applicationName: 'AI for Research',
  manifest: '/manifest.webmanifest',
  icons: {
    icon: [
      { url: '/favicon.ico', sizes: '16x16 32x32 48x48' },
      { url: '/favicon.svg', type: 'image/svg+xml' },
    ],
    apple: { url: '/apple-touch-icon.png', sizes: '180x180' },
  },
  // Google Search Console ownership check.
  verification: { google: 'qpi2MhfXKt0eozZZJecJFkA5LbzhcolfCosZSXcuAl4' },
};

export const viewport: Viewport = {
  // Literal hex: browsers read this meta tag before any CSS. Matches --color-brand.
  themeColor: '#1e3a5f',
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    // The init script sets data-theme before hydration, so React must not complain about it.
    <html lang="en" className={`${inter.variable} ${serif.variable}`} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeInitScript }} />
        <script dangerouslySetInnerHTML={{ __html: authInitScript }} />
      </head>
      {/* Extensions (Grammarly, LanguageTool, ColorZilla…) add attributes to <body> before hydration. */}
      <body suppressHydrationWarning data-clarity-mask="true">
        <ThemeSync />
        <PrivacyControls>
          {children}
          <PricingDialog />
        </PrivacyControls>
      </body>
    </html>
  );
}
