import { COMPANY, ContactLine, LegalPage, type LegalSection } from '@/components/marketing/LegalPage';
import { pageMetadata } from '@/components/marketing/seo';
import { PrivacySettingsButton } from '@/components/analytics/PrivacyControls';

export const metadata = pageMetadata({
  title: 'Privacy policy',
  path: '/privacy',
  description: 'What AI for Research collects, why, who processes it and how long it is kept. Your documents are private to you and are never used to train AI.',
});

const SECTIONS: LegalSection[] = [
  {
    id: 'what-we-collect',
    title: 'What we collect',
    body: (
      <ul>
        <li><strong>Account details</strong>: your name, email address and sign-in method (password or a provider such as Google).</li>
        <li><strong>Your content</strong>: the documents, comments, references, uploaded files and PDFs you add to AI for Research.</li>
        <li><strong>Billing details</strong>: your plan and payment status. Card details go straight to our payment processor; we never see or store them.</li>
        <li><strong>Usage and technical data</strong>: how much of each AI feature you use (to apply plan limits), and logs such as IP address, browser and error reports that keep the service secure and working.</li>
      </ul>
    ),
  },
  {
    id: 'how-we-use-it',
    title: 'How we use it',
    body: (
      <>
        <p>We use your data to run AI for Research: to sign you in, save and sync your documents, run the AI and citation features you ask for, apply your plan, take payments, send account emails (such as password resets) and keep the service secure.</p>
        <p>We send the newsletter only if you turn it on, and you can turn it off at any time in Account › Email.</p>
      </>
    ),
  },
  {
    id: 'ai',
    title: 'AI features and your writing',
    body: (
      <>
        <p><strong>We do not train AI on your documents.</strong> When you use an AI feature, the text needed for that request (for example the paragraph you are editing, or a PDF you chat with) is sent to our AI provider to produce the answer.</p>
        <p>We use AI providers under terms that do not allow them to train their models on what we send.</p>
      </>
    ),
  },
  {
    id: 'sharing',
    title: 'Who we share it with',
    body: (
      <>
        <p>We do not sell your personal data. We share it only with the service providers that run AI for Research for us, and only as far as each one needs:</p>
        <ul>
          <li>Google Cloud and Firebase: hosting, sign-in, database and file storage.</li>
          <li>Dodo Payments: payments, as merchant of record (it receives your billing details and card, not your writing).</li>
          <li>Our AI provider: answering AI requests, as described above.</li>
          <li>Our email provider: account emails and, if you subscribe, the newsletter.</li>
          <li>Scholarly databases: we send your search terms (not your documents) to find papers to cite.</li>
          <li>If you opt in: Google analytics services measure public-page visits, and Microsoft Clarity records interactions on public information pages only when you separately allow recordings. Private workspaces, sign-in pages and interactive tools do not load these tracking scripts.</li>
        </ul>
        <p>Documents you share are visible to the people you invite, with the role you give them. We may also disclose data when the law requires it.</p>
      </>
    ),
  },
  {
    id: 'retention',
    title: 'How long we keep it',
    body: (
      <p>We keep your account and content while your account is open. When you delete your account (Account › Delete account) we delete your documents and profile; copies in backups are removed as the backups expire. We keep billing records for as long as tax law requires.</p>
    ),
  },
  {
    id: 'your-rights',
    title: 'Your choices and rights',
    body: (
      <>
        <p>You can view, edit, export and delete your documents at any time, and delete your whole account from Account. Depending on where you live (for example under the GDPR or CCPA), you may also have the right to ask for a copy of your data, to correct it, to object to some uses or to complain to a data protection authority.</p>
        <p>To make a request, <ContactLine />.</p>
      </>
    ),
  },
  {
    id: 'security',
    title: 'Security',
    body: <p>Data is encrypted in transit and at rest on our hosting provider, and access inside {COMPANY.name} is limited to people who need it to run the service. No system is perfectly secure, so please use a strong, unique password.</p>,
  },
  {
    id: 'cookies',
    title: 'Cookies and local storage',
    body: <><p>Essential storage supports sign-in, security and your preferences. Optional analytics and public-page session recordings are off until you choose them. Content-free editor events, if allowed, are stored as daily totals without document, account or user identifiers; these counters do not include your writing, research questions or source names. Advertising consent stays denied.</p><p><PrivacySettingsButton />. Choices apply to this browser for 180 days and can be withdrawn at any time. Withdrawal stops future collection, not data already collected. See <a href="/cookies" className="underline underline-offset-4">cookies and browser storage</a> for details.</p></>,
  },
  {
    id: 'children',
    title: 'Children',
    body: <p>AI for Research is not meant for children under 13, and we do not knowingly collect their data. If you think a child has given us data, <ContactLine /> and we will delete it.</p>,
  },
  {
    id: 'changes',
    title: 'Changes and contact',
    body: (
      <p>
        If we change this policy in a way that matters, we will tell you by email or in the app before the change applies. Questions? <ContactLine />
        {COMPANY.address ? <>, or write to {COMPANY.name}, {COMPANY.address}</> : null}.
      </p>
    ),
  },
];

export default function PrivacyPage() {
  return (
    <LegalPage
      title="Privacy policy"
      updated="2026-11-12"
      intro={<p>This policy explains what {COMPANY.name} collects when you use AI for Research, why, and the choices you have. The short version: your documents are yours, they stay private to you and the people you share them with, and we never use them to train AI.</p>}
      sections={SECTIONS}
    />
  );
}
