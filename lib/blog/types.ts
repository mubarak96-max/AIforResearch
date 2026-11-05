/** One article as scripts/build-blog.mjs writes it from content/blog/*.md. */
export type BlogPostSource = {
  number: number;
  slug: string;
  /** The <title> tag (SEO title). */
  title: string;
  /** The on-page H1. */
  heading: string;
  description: string;
  primaryKeyword: string;
  secondaryKeywords: string[];
  /** e.g. "C. AP style and news writing" */
  cluster: string;
  /** Path of the cluster's pillar article, e.g. "/blog/ap-style-guide". */
  pillar: string;
  /** Empty or a "[placeholder]" until a real byline is set. */
  author: string;
  /** YYYY-MM-DD */
  published: string;
  updated: string;
  faq: { q: string; a: string }[];
  /** Markdown after the H1 and date line, editor comments removed. */
  body: string;
};
