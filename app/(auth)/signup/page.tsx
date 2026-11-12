import { AuthEntry } from '@/components/auth/AuthEntry';
import { pageMetadata } from '@/components/marketing/seo';

export const metadata = pageMetadata({
  title: 'Sign up',
  path: '/signup',
  description:
    'Create your free AI for Research account: cited answers from 250M+ papers, paper search, and writing tools for literature reviews and theses. No credit card needed.',
});

export default function SignupPage() {
  return <AuthEntry />;
}
