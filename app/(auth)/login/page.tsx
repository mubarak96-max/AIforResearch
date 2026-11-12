import { AuthEntry } from '@/components/auth/AuthEntry';
import { pageMetadata } from '@/components/marketing/seo';

export const metadata = pageMetadata({
  title: 'Sign in',
  path: '/login',
  description: 'Sign in to AI for Research, the research assistant that answers from 250M+ real papers, every claim cited.',
});

export default function LoginPage() {
  return <AuthEntry />;
}
