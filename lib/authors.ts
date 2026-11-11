import { SITE_URL } from './site';

/**
 * People who write for the site. Blog frontmatter names an author by `key` (`author: "Mubarak"`),
 * which links each article to a full profile, an author page and Person structured data.
 * Only state facts here that the person has confirmed: these pages are what search engines
 * and readers use to judge who is behind the writing.
 */
export type Author = {
  /** The value used in blog frontmatter. */
  key: string;
  slug: string;
  name: string;
  jobTitle: string;
  /** One sentence for the box under each article. */
  shortBio: string;
  /** Paragraphs for the author page. */
  bio: string[];
  /** Path under /public. */
  image: string;
  /** Profiles elsewhere that are the same person (LinkedIn, X, GitHub, Google Scholar…). */
  sameAs: { label: string; url: string }[];
  knowsAbout: string[];
  credentials: string[];
  alumniOf?: { name: string; url: string };
};

export const AUTHORS: Author[] = [
  {
    key: 'Mubarak',
    slug: 'mubarak-mutesasira',
    name: 'Mubarak Mutesasira',
    jobTitle: 'Founder and software developer, AI for Research',
    shortBio:
      'Mubarak Mutesasira is the founder of AI for Research and the software developer who builds it. He holds a bachelor’s degree in computer science from Makerere University and has a background in copywriting and digital marketing.',
    bio: [
      'Mubarak Mutesasira is the founder of AI for Research and the software developer who builds it, from the editor to the citation, claim-check and source-quality features.',
      'He holds a bachelor’s degree in computer science from Makerere University. He also has experience in copywriting and digital marketing. That combination, writing for readers and building software, is what the guides on this blog draw on.',
      'He writes the articles here on fact-checking, news writing, citations and research tools, and keeps them updated as the tools they cover change.',
    ],
    image: '/author.jpg',
    sameAs: [
      { label: 'LinkedIn', url: 'https://www.linkedin.com/in/mubarak-mutesasira-43a21095/' },
      { label: 'GitHub', url: 'https://github.com/mubarak96-max' },
      { label: 'X', url: 'https://x.com/MubarakMutesa' },
    ],
    alumniOf: { name: 'Makerere University', url: 'https://www.mak.ac.ug' },
    knowsAbout: ['Software development', 'Artificial intelligence', 'Copywriting', 'Digital marketing', 'Fact-checking', 'Citation management'],
    credentials: ['Bachelor’s degree in computer science, Makerere University'],
  },
];

export function getAuthorByKey(key: string | null | undefined) {
  return AUTHORS.find((author) => author.key === key) ?? null;
}

export function getAuthorBySlug(slug: string) {
  return AUTHORS.find((author) => author.slug === slug) ?? null;
}

export function authorPath(author: Author) {
  return `/authors/${author.slug}`;
}

/** The stable @id other structured data uses to point at this person. */
export function authorId(author: Author) {
  return `${SITE_URL}${authorPath(author)}#person`;
}

/** Schema.org Person for an author, shared by blog posts, the author page and the About page. */
export function personSchema(author: Author) {
  return {
    '@type': 'Person',
    '@id': authorId(author),
    name: author.name,
    url: `${SITE_URL}${authorPath(author)}`,
    image: `${SITE_URL}${author.image}`,
    jobTitle: author.jobTitle,
    description: author.shortBio,
    worksFor: { '@id': `${SITE_URL}/#organization` },
    knowsAbout: author.knowsAbout,
    ...(author.alumniOf ? { alumniOf: { '@type': 'CollegeOrUniversity', ...author.alumniOf } } : {}),
    hasCredential: author.credentials.map((name) => ({
      '@type': 'EducationalOccupationalCredential',
      credentialCategory: 'degree',
      name,
      ...(author.alumniOf ? { recognizedBy: { '@type': 'CollegeOrUniversity', name: author.alumniOf.name } } : {}),
    })),
    sameAs: author.sameAs.map((profile) => profile.url),
  };
}

/** The founder, for the Organization schema and the About page. */
export const FOUNDER = AUTHORS[0];
