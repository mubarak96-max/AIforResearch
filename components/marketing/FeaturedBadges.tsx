import { focusRing } from '@/components/marketing/styles';

/* eslint-disable @next/next/no-img-element -- third-party badge images, served as-is by the directories. */

/** "Featured on" badges from launch directories (About page and home page). */
export function FeaturedBadges({ className = '' }: { className?: string }) {
  const badgeLink = `inline-block rounded ${focusRing}`;
  return (
    <div className={`flex flex-wrap items-center gap-4 ${className}`}>
      <a href="https://startupfa.me/s/ai-for-research?utm_source=aiforresearch.app" target="_blank" rel="noopener" className={badgeLink}>
        <img src="https://startupfa.me/badges/featured-badge-small.webp" alt="AI for Research - Featured on Startup Fame" width={224} height={36} />
      </a>
      <a href="https://www.producthunt.com/products/ai-for-research?embed=true&utm_source=badge-featured&utm_medium=badge&utm_campaign=badge-ai-for-research" target="_blank" rel="noopener noreferrer" className={badgeLink}>
        <img src="https://api.producthunt.com/widgets/embed-image/v1/featured.svg?post_id=1312485&theme=light&t=1794408106399" alt="AI for Research - AI research with papers and citations | Product Hunt" width={250} height={54} />
      </a>
    </div>
  );
}
