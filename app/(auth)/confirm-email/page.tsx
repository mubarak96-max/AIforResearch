import { ConfirmEmail } from '@/components/auth/PasswordReset';
import { pageMetadata } from '@/components/marketing/seo';

export const metadata = pageMetadata({ title: 'Confirm your email', path: '/confirm-email', description: 'Confirm the email address on your AI for Research account.', index: false });

export default function ConfirmEmailPage() {
  return <ConfirmEmail />;
}
