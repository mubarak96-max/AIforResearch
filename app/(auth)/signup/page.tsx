import { AuthEntry } from '@/components/auth/AuthEntry';
import { pageMetadata } from '@/components/marketing/seo';

export const metadata = pageMetadata({
  title: 'Sign up',
  path: '/signup',
  description:
    'Create your free WriteOrbit account: the full AI writing editor and citation generator, with 250M+ real papers to cite. No credit card needed.',
});

export default function SignupPage() {
  return <AuthEntry />;
}
