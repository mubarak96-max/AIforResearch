import Link from 'next/link';
import { ContactLine, LegalPage, type LegalSection } from '@/components/marketing/LegalPage';
import { pageMetadata } from '@/components/marketing/seo';

export const metadata = pageMetadata({
  title: 'How AI for Research uses AI',
  path: '/ai-use',
  description: 'Where AI for Research uses AI, what it sends to AI providers, what AI cannot do, and how to use it with integrity. Your documents are never used to train AI.',
});

const link = 'text-ink underline underline-offset-4 hover:text-brand';

const SECTIONS: LegalSection[] = [
  {
    id: 'where',
    title: 'Where we use AI',
    body: (
      <ul>
        <li>Writing: autocomplete, AI Edit, Write with AI and the free drafting tools.</li>
        <li>Research: AI Chat, PDF chat, review matrices, deep research reports and the research gap finder.</li>
        <li>Review: claim check, the evidence check, peer review, proofreading and tone.</li>
      </ul>
    ),
  },
  {
    id: 'not-ai',
    title: 'Where we do not',
    body: (
      <ul>
        <li>Citation formatting is done by citeproc, the standard formatter also used by Zotero and Mendeley, not by AI.</li>
        <li>Statistics in the data analysis tool are calculated, not generated.</li>
        <li>Paper details come from a scholarly index, not from an AI model’s memory, so cited papers are real records.</li>
      </ul>
    ),
  },
  {
    id: 'data',
    title: 'What is sent, and what is not kept',
    body: (
      <>
        <p>When you use an AI feature, only the text that feature needs (for example the paragraph you are editing, or the abstracts of the papers it cites) is sent to our AI provider to produce the answer.</p>
        <p><strong>We never use your documents to train AI</strong>, and we use providers under terms that do not let them train on what we send. More in the <Link href="/privacy" className={link}>privacy policy</Link>.</p>
      </>
    ),
  },
  {
    id: 'limits',
    title: 'What AI cannot promise',
    body: (
      <ul>
        <li>AI text can be wrong, out of date or overstated, even when it cites a real paper. Read the sources before you rely on a claim.</li>
        <li>We do not promise that research is accurate, new or publishable, or that a statistical test is the right one for your data.</li>
        <li>No tool can reliably tell whether a text was written by AI. The writing pattern checker points out phrases to rewrite; it is not evidence of how a text was written. The humanizer is a style editor, not a way past detectors.</li>
      </ul>
    ),
  },
  {
    id: 'integrity',
    title: 'Using AI with integrity',
    body: (
      <>
        <p>Schools, universities, journals and employers set their own rules on AI. Follow them, and say where you used AI when they ask. Your work is your responsibility.</p>
        <p>The <Link href="/features/authorship-report" className={link}>authorship report</Link> can show a teacher or editor how your document was written: what you typed, what you pasted and what you accepted from AI.</p>
      </>
    ),
  },
  {
    id: 'contact',
    title: 'Questions',
    body: <p>To ask about AI and your data, <ContactLine />.</p>,
  },
];

export default function AiUsePage() {
  return <LegalPage title="How AI for Research uses AI" updated="2026-11-09" intro={<p>Where AI is used, what it can and cannot do, and how your writing is handled.</p>} sections={SECTIONS} />;
}
