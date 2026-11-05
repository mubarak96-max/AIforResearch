import { POSTS } from './posts.generated';
import type { BlogPostSource } from './types';

export type { BlogPostSource } from './types';

export type TocEntry = { id: string; text: string };

export type BlogPost = BlogPostSource & {
  /** "AP style and news writing" (the cluster without its letter). */
  topic: string;
  isPillar: boolean;
  readingMinutes: number;
  /** The `##` headings, for the contents list. */
  toc: TocEntry[];
  /** A real byline, or null while the frontmatter still holds a placeholder. */
  byline: string | null;
  /** The answer block: the article's first paragraph, shown as the summary under the H1. */
  lead: string;
  /** The rest of the body after the lead. */
  rest: string;
};

/** The first block of the body if it is a plain paragraph (not a heading, list, table, quote or code). */
function splitLead(body: string) {
  const end = body.indexOf('\n\n');
  const first = end === -1 ? body : body.slice(0, end);
  if (/^(#|\||[-*+] |\d+\. |>|```)/.test(first)) return { lead: '', rest: body };
  return { lead: first.trim(), rest: end === -1 ? '' : body.slice(end + 2).trim() };
}

/** Plain text of a Markdown heading: links, emphasis and code marks removed. */
export function headingText(markdown: string) {
  return markdown
    .replace(/\[([^\]]*)\]\([^)]*\)/g, '$1')
    .replace(/[*_`]/g, '')
    .trim();
}

/** The id a heading gets on the page; the contents list and the rendered heading both use it. */
export function headingId(text: string) {
  return text
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-');
}

function tocOf(body: string): TocEntry[] {
  const entries: TocEntry[] = [];
  let inFence = false;
  for (const line of body.split('\n')) {
    if (line.startsWith('```')) inFence = !inFence;
    if (inFence) continue;
    const match = line.match(/^## (.+)$/);
    if (match) {
      const text = headingText(match[1]);
      entries.push({ id: headingId(text), text });
    }
  }
  return entries;
}

function enrich(post: BlogPostSource): BlogPost {
  const words = post.body.split(/\s+/).filter(Boolean).length;
  return {
    ...post,
    topic: post.cluster.replace(/^[A-Z]\.\s*/, ''),
    isPillar: post.pillar === `/blog/${post.slug}`,
    readingMinutes: Math.max(1, Math.round(words / 230)),
    toc: tocOf(post.body),
    byline: post.author && !post.author.startsWith('[') ? post.author : null,
    ...splitLead(post.body),
  };
}

const ALL: BlogPost[] = POSTS.map(enrich);

export function allPosts() {
  return ALL;
}

export function getPost(slug: string) {
  return ALL.find((post) => post.slug === slug) ?? null;
}

/** Topics in plan order (A to F), each with its pillar first. */
export function postsByTopic() {
  const groups = new Map<string, BlogPost[]>();
  for (const post of [...ALL].sort((a, b) => a.cluster.localeCompare(b.cluster) || Number(b.isPillar) - Number(a.isPillar) || a.number - b.number)) {
    const list = groups.get(post.topic) ?? [];
    list.push(post);
    groups.set(post.topic, list);
  }
  return [...groups].map(([topic, posts]) => ({ topic, posts }));
}

/** Up to `count` other articles from the same topic, the pillar first. */
export function relatedPosts(post: BlogPost, count = 3) {
  return ALL.filter((other) => other.cluster === post.cluster && other.slug !== post.slug)
    .sort((a, b) => Number(b.isPillar) - Number(a.isPillar) || a.number - b.number)
    .slice(0, count);
}

/** "November 6, 2026" from "2026-11-06" (fixed to UTC so the server and browser agree). */
export function formatDate(iso: string) {
  return new Date(`${iso}T00:00:00Z`).toLocaleDateString('en-US', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' });
}
