import { AuthEntry } from '@/components/auth/AuthEntry';
import { pageMetadata } from '@/components/marketing/seo';

export const metadata = pageMetadata({
  title: 'Sign in',
  path: '/login',
  description: 'Sign in to AI for Research, the AI writing editor that cites real sources.',
});

export default function LoginPage() {
  return <AuthEntry />;
}
