import type { Metadata, Viewport } from 'next';
import { Inter, Source_Serif_4 } from 'next/font/google';
import './globals.css';
import { PricingDialog } from '@/components/billing/PricingDialog';
import { ThemeSync } from '@/components/theme/theme';
import { themeInitScript } from '@/components/theme/themeScript';

const inter = Inter({ subsets: ['latin'], variable: '--font-inter', display: 'swap' });
const serif = Source_Serif_4({ subsets: ['latin'], variable: '--font-serif', display: 'swap' });

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL || 'https://app.example.com'),
  title: { default: 'WriteOrbit — the AI editor for academic writing', template: '%s · WriteOrbit' },
  description:
    'Write your paper faster, with citations you can trust. Autocomplete with real references, 250M+ papers, AI review, Word and LaTeX export.',
  applicationName: 'WriteOrbit',
  manifest: '/manifest.webmanifest',
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
      </head>
      <body>
        <ThemeSync />
        {children}
        <PricingDialog />
      </body>
    </html>
  );
}
