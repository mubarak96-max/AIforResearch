import Link from 'next/link';
import type { ReactNode } from 'react';
import { ContactLine, LegalPage, type LegalSection } from '@/components/marketing/LegalPage';
import { pageMetadata } from '@/components/marketing/seo';
import { PrivacySettingsButton } from '@/components/analytics/PrivacyControls';

export const metadata = pageMetadata({
  title: 'Cookies and browser storage',
  path: '/cookies',
  description: 'The cookies and browser storage AI for Research uses: what each is for, how long it lasts and how to clear it.',
});

const row = (name: string, purpose: string, kept: string) => (
  <tr key={name} className="border-t border-line-2 align-top">
    <th scope="row" className="py-2.5 pr-4 text-left font-mono text-[13px] font-normal text-ink">{name}</th>
    <td className="py-2.5 pr-4">{purpose}</td>
    <td className="py-2.5">{kept}</td>
  </tr>
);

const table = (rows: ReactNode) => (
  <div className="overflow-x-auto">
    <table className="w-full min-w-[560px] border-collapse text-[14.5px]">
      <thead>
        <tr className="text-left text-[13px] text-muted">
          <th scope="col" className="pb-2 pr-4 font-medium">Name</th>
          <th scope="col" className="pb-2 pr-4 font-medium">What it is for</th>
          <th scope="col" className="pb-2 font-medium">How long</th>
        </tr>
      </thead>
      <tbody>{rows}</tbody>
    </table>
  </div>
);

const SECTIONS: LegalSection[] = [
  {
    id: 'needed',
    title: 'Needed to run AI for Research',
    body: (
      <>
        <p>These keep you signed in and keep the service secure. AI for Research does not work without them.</p>
        {table([
          row('writeorbit_signed_in', 'A cookie that only says you are signed in, so pages show the right buttons before they load. It holds no password or token.', 'Until you sign out'),
          row('Firebase Authentication', 'Your sign-in session, kept by Google’s Firebase in your browser’s storage.', 'Until you sign out'),
          row('App Check (reCAPTCHA)', 'Where turned on, checks that requests come from the real app and not from bots.', 'Short-lived'),
        ])}
      </>
    ),
  },
  {
    id: 'preferences',
    title: 'Your preferences',
    body: (
      <>
        <p>Stored only in this browser and never sent to us. Clearing your browser data removes them.</p>
        {table([
          row('Theme', 'Light or dark mode.', 'Until cleared'),
          row('research-privacy-v1', 'Your choices for optional analytics and public-page recordings.', '180 days, or until changed or cleared'),
          row('writeorbit_nav_collapsed', 'Whether the editor’s side menu is collapsed.', 'Until cleared'),
          row('writeorbit_autocomplete_settings', 'Your autocomplete source choices.', 'Until cleared'),
          row('writeorbit_review_…', 'When each review check last ran on a document, so its results show again.', 'Until cleared'),
          row('writeorbit_citation_list', 'Your list in the free citation generator.', 'Until cleared'),
          row('research-agent-editor-…', 'A free tool’s result, held while it opens in the editor.', 'Removed once the document opens'),
        ])}
      </>
    ),
  },
  {
    id: 'analytics',
    title: 'Analytics',
    body: (
      <>
        <p>Optional analytics is off until you choose it. With your permission, Google Tag Manager loads analytics on public information pages; Google Analytics may use cookies such as <code>_ga</code> to measure visits. The app also counts approved feature events, such as document creation and review completion, in daily totals. Those event payloads exclude document text, questions, source names and document, account and user identifiers.</p>
        <p>Microsoft Clarity session recordings and heatmaps are a separate, optional choice for adults on public information pages. Clarity can use cookies such as <code>_clck</code> and <code>_clsk</code>. Third-party analytics and recording scripts are not loaded in private workspaces, sign-in pages, interactive tools or research search pages. Advertising consent stays denied.</p>
        <p><PrivacySettingsButton />. You can decline or withdraw either choice and keep using the app. Withdrawal stops collection going forward and reloads a tracked page to remove loaded analytics code; it does not remove data already collected. Your browser can also clear cookies and block third-party requests.</p>
      </>
    ),
  },
  {
    id: 'control',
    title: 'Clearing and blocking',
    body: (
      <p>
        Every browser lets you see, clear and block cookies and site data. Clearing them signs you out and resets your preferences. For anything else, <ContactLine />. See also the{' '}
        <Link href="/privacy" className="text-ink underline underline-offset-4 hover:text-brand">privacy policy</Link>.
      </p>
    ),
  },
];

export default function CookiesPage() {
  return <LegalPage title="Cookies and browser storage" updated="2026-11-12" intro={<p>What AI for Research stores in your browser, and why.</p>} sections={SECTIONS} />;
}
