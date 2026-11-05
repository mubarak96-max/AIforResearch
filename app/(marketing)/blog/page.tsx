import Link from 'next/link';
import { pageMetadata } from '@/components/marketing/seo';
import { container, focusRing, kicker } from '@/components/marketing/styles';
import { postsByTopic } from '@/lib/blog';

export const metadata = pageMetadata({
  title: 'Blog: guides for writers who work with sources',
  path: '/blog',
  description: 'Practical guides on fact-checking, AP style, news writing, interviews, screenwriting, citations and research reports, with sources you can check.',
});

export default function BlogIndexPage() {
  const topics = postsByTopic();
  return (
    <div className={container}>
      <div className="max-w-[760px] pb-4 pt-10 md:pt-[46px]">
        <h1 className="text-balance text-[34px] font-bold tracking-[-0.03em] text-ink sm:text-[42px]">Blog</h1>
        <p className="mt-3 text-[17px] leading-relaxed text-ink-2">
          Guides for people who write with sources: reporters, editors, analysts, screenwriters and researchers. Every claim links to where it comes from.
        </p>
      </div>

      <nav aria-label="Topics" className="mb-4 mt-6 flex flex-wrap gap-2">
        {topics.map(({ topic }) => (
          <a key={topic} href={`#${topicId(topic)}`} className={`rounded-full border border-line px-3.5 py-1.5 text-[14px] text-ink-2 transition-colors hover:bg-soft hover:text-ink ${focusRing}`}>
            {topic}
          </a>
        ))}
      </nav>

      <div className="space-y-16 pb-24 pt-8">
        {topics.map(({ topic, posts }) => {
          const [pillar, ...rest] = posts;
          return (
            <section key={topic} id={topicId(topic)} aria-labelledby={`${topicId(topic)}-title`} className="scroll-mt-24">
              <h2 id={`${topicId(topic)}-title`} className="mb-5 text-[24px] font-bold tracking-[-0.02em] text-ink">{topic}</h2>
              <div className="grid gap-4 md:grid-cols-3">
                <Link
                  href={`/blog/${pillar.slug}`}
                  className={`group flex flex-col rounded-2xl border border-line bg-gradient-to-b from-brand-50 to-white p-6 transition-shadow hover:shadow-[0_10px_30px_-12px_rgba(15,23,42,.25)] md:row-span-2 ${focusRing}`}
                >
                  <span className={kicker}>Start here</span>
                  <span className="text-balance text-[22px] font-bold leading-tight tracking-[-0.02em] text-ink group-hover:text-brand">{pillar.heading}</span>
                  <span className="mt-3 text-[15px] leading-relaxed text-ink-2">{pillar.description}</span>
                  <span className="mt-auto pt-5 text-[13px] text-muted">{pillar.readingMinutes} min read</span>
                </Link>
                {rest.map((post) => (
                  <Link
                    key={post.slug}
                    href={`/blog/${post.slug}`}
                    className={`group flex flex-col rounded-2xl border border-line p-5 transition-shadow hover:shadow-[0_10px_30px_-12px_rgba(15,23,42,.25)] ${focusRing}`}
                  >
                    <span className="text-balance text-[17px] font-semibold leading-snug text-ink group-hover:text-brand">{post.heading}</span>
                    <span className="mt-2 line-clamp-3 text-[14.5px] leading-relaxed text-ink-2">{post.description}</span>
                    <span className="mt-auto pt-4 text-[13px] text-muted">{post.readingMinutes} min read</span>
                  </Link>
                ))}
              </div>
            </section>
          );
        })}
      </div>
    </div>
  );
}

function topicId(topic: string) {
  return topic.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}
