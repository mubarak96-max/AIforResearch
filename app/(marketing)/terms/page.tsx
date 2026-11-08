import Link from 'next/link';
import { COMPANY, ContactLine, LegalPage, type LegalSection } from '@/components/marketing/LegalPage';
import { pageMetadata } from '@/components/marketing/seo';

export const metadata = pageMetadata({
  title: 'Terms of service',
  path: '/terms',
  description: 'The terms for using WriteOrbit: your account, your content, plans and billing, fair use of the AI features, and what to check before you submit.',
});

const link = 'text-ink underline underline-offset-4 hover:text-brand';

const SECTIONS: LegalSection[] = [
  {
    id: 'agreement',
    title: 'Using WriteOrbit',
    body: <p>By creating an account or using WriteOrbit you agree to these terms and to our <Link href="/privacy" className={link}>privacy policy</Link>. If you use WriteOrbit for an organization, you confirm you may accept these terms for it. You must be at least 13, and old enough to agree to these terms where you live.</p>,
  },
  {
    id: 'account',
    title: 'Your account',
    body: <p>Keep your sign-in details safe; you are responsible for what happens under your account. Tell us straight away if you think someone else has used it.</p>,
  },
  {
    id: 'content',
    title: 'Your content',
    body: (
      <>
        <p><strong>You own what you write and upload.</strong> You give {COMPANY.name} only the permission needed to store, display, process and share it as you direct, so the service can work (for example, to sync a document or answer an AI request). We do not use your documents to train AI.</p>
        <p>Only upload material you have the right to use, such as PDFs you are allowed to keep.</p>
      </>
    ),
  },
  {
    id: 'ai-output',
    title: 'AI suggestions and citations',
    body: (
      <>
        <p>AI suggestions, reviews and claim checks can be wrong or incomplete. Citations point to real records in scholarly databases, but you are responsible for reading your sources, checking that they support what you write, and following the rules of your school, journal or publication on AI use and plagiarism.</p>
        <p>WriteOrbit is a writing tool, not legal, medical or professional advice.</p>
      </>
    ),
  },
  {
    id: 'acceptable-use',
    title: 'Acceptable use',
    body: (
      <>
        <p>Do not use WriteOrbit to:</p>
        <ul>
          <li>break the law or infringe anyone&rsquo;s rights, including copyright;</li>
          <li>harass people or create content meant to deceive or harm;</li>
          <li>get around plan limits, resell access, or scrape or overload the service;</li>
          <li>probe, attack or reverse-engineer the service, except as the law allows.</li>
        </ul>
      </>
    ),
  },
  {
    id: 'plans',
    title: 'Plans, billing and cancelling',
    body: (
      <>
        <p>The free plan is free. Paid plans renew automatically each month or year until you cancel, and are sold and charged by Dodo Payments, our merchant of record, which also handles sales tax, receipts and refunds of the payment. Prices and limits are on the <Link href="/pricing" className={link}>pricing page</Link>; if we change a price, the new price applies from your next renewal after we tell you.</p>
        <p>You can cancel any time from Account. Your plan stays active until the end of the period you paid for. Where the law gives you a right to a refund, we honour it.</p>
      </>
    ),
  },
  {
    id: 'api',
    title: 'Developer API',
    body: <p>Use of the <Link href="/developers" className={link}>WriteOrbit API</Link> is billed as you go and must follow these terms. Keep your API keys secret; you are responsible for usage under them.</p>,
  },
  {
    id: 'termination',
    title: 'Suspension and closing your account',
    body: <p>You can delete your account at any time. We may suspend or close an account that seriously or repeatedly breaks these terms, and will tell you why unless the law or safety prevents it.</p>,
  },
  {
    id: 'liability',
    title: 'Warranty and liability',
    body: <p>We work hard to keep WriteOrbit available and your work safe, but the service is provided &ldquo;as is&rdquo;. Keep your own copies of important work (Word, PDF or LaTeX export makes this easy). To the extent the law allows, {COMPANY.name} is not liable for indirect or consequential losses, and our total liability is limited to what you paid us in the 12 months before the claim. Nothing in these terms limits rights you have under consumer law.</p>,
  },
  {
    id: 'changes',
    title: 'Changes and contact',
    body: <p>If we change these terms in a way that matters, we will tell you before the change applies; if you keep using WriteOrbit after that, the new terms apply. Questions? <ContactLine />.</p>,
  },
];

export default function TermsPage() {
  return (
    <LegalPage
      title="Terms of service"
      updated="2026-11-06"
      intro={<p>These terms are the agreement between you and {COMPANY.name} for using WriteOrbit. We have kept them short and plain.</p>}
      sections={SECTIONS}
    />
  );
}
