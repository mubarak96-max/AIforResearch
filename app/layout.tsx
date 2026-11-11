import type { Metadata, Viewport } from 'next';
import { Inter, Source_Serif_4 } from 'next/font/google';
import Script from 'next/script';
import './globals.css';
import { PricingDialog } from '@/components/billing/PricingDialog';
import { ThemeSync } from '@/components/theme/theme';
import { themeInitScript } from '@/components/theme/themeScript';
import { authInitScript } from '@/components/marketing/authScript';
import { SITE_URL } from '@/lib/site';

const inter = Inter({ subsets: ['latin'], variable: '--font-inter', display: 'swap' });
// Italic too: headings stress one word in italic, and figure captions are set in italic.
const serif = Source_Serif_4({ subsets: ['latin'], style: ['normal', 'italic'], variable: '--font-serif', display: 'swap' });

// Google Tag Manager container for analytics.
const GTM_ID = 'GTM-THRFTJ7T';
const gtmInitScript = `window.dataLayer = window.dataLayer || [];
function gtag(){dataLayer.push(arguments);}
gtag('js', new Date());
dataLayer.push({'gtm.start': new Date().getTime(), event: 'gtm.js'});`;

// Microsoft Clarity project for session recordings and heatmaps.
const CLARITY_ID = 'zbxvles1es';
const clarityInitScript = `(function(c,l,a,r,i,t,y){
c[a]=c[a]||function(){(c[a].q=c[a].q||[]).push(arguments)};
t=l.createElement(r);t.async=1;t.src="https://www.clarity.ms/tag/"+i;
y=l.getElementsByTagName(r)[0];y.parentNode.insertBefore(t,y);
})(window, document, "clarity", "script", "${CLARITY_ID}");`;

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
      <body suppressHydrationWarning>
        <noscript>
          <iframe src={`https://www.googletagmanager.com/ns.html?id=${GTM_ID}`} height="0" width="0" style={{ display: 'none', visibility: 'hidden' }} />
        </noscript>
        <Script id="gtm-init" strategy="afterInteractive" dangerouslySetInnerHTML={{ __html: gtmInitScript }} />
        <Script id="gtm" strategy="afterInteractive" src={`https://www.googletagmanager.com/gtm.js?id=${GTM_ID}`} />
        <Script id="clarity" strategy="afterInteractive" dangerouslySetInnerHTML={{ __html: clarityInitScript }} />
        <ThemeSync />
        {children}
        <PricingDialog />
      </body>
    </html>
  );
}
