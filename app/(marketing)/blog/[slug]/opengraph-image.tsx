import { ImageResponse } from 'next/og';
import { allPosts, getPost } from '@/lib/blog';

/** The social preview for an article: its heading on the brand colour, with the topic and byline. */
export const alt = 'AI for Research blog article';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

export function generateStaticParams() {
  return allPosts().map((post) => ({ slug: post.slug }));
}

export default async function Image({ params }: { params: Promise<{ slug: string }> }) {
  const post = getPost((await params).slug);
  const heading = post?.heading ?? 'AI for Research blog';
  return new ImageResponse(
    (
      <div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', padding: '72px 80px', background: '#1e3a5f', color: '#ffffff' }}>
        <div style={{ display: 'flex', fontSize: 28, letterSpacing: 4, textTransform: 'uppercase', color: '#c7d2e0' }}>{post?.topic ?? 'Blog'}</div>
        <div style={{ display: 'flex', fontSize: heading.length > 70 ? 56 : 66, fontWeight: 700, lineHeight: 1.12, letterSpacing: -1.5 }}>{heading}</div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 28, color: '#c7d2e0' }}>
          <div style={{ display: 'flex', fontWeight: 700, color: '#ffffff', fontSize: 34 }}>AI for Research</div>
          <div style={{ display: 'flex' }}>{post?.byline ? `By ${post.byline}` : 'AI for Research blog'}</div>
        </div>
      </div>
    ),
    size,
  );
}
