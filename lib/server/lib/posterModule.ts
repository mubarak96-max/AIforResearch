/**
 * Posters (/slides?module=poster): the module's form, its prompt and the poster JSON it returns,
 * cleaned. Kept out of studioCatalog.ts and studioModules.ts so it can be registered there with
 * one line each (STUDIO_MODULES and the prompt builders). Pure: the browser imports the sizes and
 * types, the server the prompt and the cleaner.
 */
import type { StudioModule } from './studioCatalog.js';
import type { StudioContext } from './studioModules.js';

/** Poster sizes in inches (PowerPoint takes custom slides up to 56 in a side). */
export const POSTER_SIZES = {
  'a0-portrait': { label: 'A0 portrait (841 × 1189 mm)', width: 33.11, height: 46.81, paper: 'a0paper', orientation: 'portrait', fontPt: 25 },
  'a1-portrait': { label: 'A1 portrait (594 × 841 mm)', width: 23.39, height: 33.11, paper: 'a1paper', orientation: 'portrait', fontPt: 20 },
  '48x36-landscape': { label: '48 × 36 in landscape', width: 48, height: 36, paper: null, orientation: 'landscape', fontPt: 25 },
} as const;
export type PosterSize = keyof typeof POSTER_SIZES;
export const POSTER_LAYOUTS = { '3-column': 3, '2-column': 2 } as const;
export type PosterLayout = keyof typeof POSTER_LAYOUTS;

export const posterSize = (value: string | undefined): PosterSize => (value && value in POSTER_SIZES ? value as PosterSize : 'a0-portrait');
export const posterColumns = (value: string | undefined): number => POSTER_LAYOUTS[(value && value in POSTER_LAYOUTS ? value : '3-column') as PosterLayout];

/**
 * The module as the studio catalogue holds it. `output: 'poster'` needs 'poster' in StudioOutput
 * (studioCatalog.ts); until then the object is typed on its own.
 */
export const POSTER_MODULE: Omit<StudioModule, 'output'> & { output: 'poster' } = {
  id: 'poster', workspace: 'slides', label: 'Research poster', short: 'A conference poster from your paper or a topic: short sections, figure suggestions and references, as PowerPoint or LaTeX.',
  fields: [
    { name: 'topic', label: 'Title or topic', kind: 'text', placeholder: 'e.g. Sleep quality and exam performance in first-year students', max: 400, min: 3, required: true },
    { name: 'text', label: 'Content (optional)', kind: 'textarea', placeholder: 'Paste or upload the paper, abstract or results the poster is made from. Leave empty to build from the literature.', max: 140_000, upload: true },
    { name: 'size', label: 'Size', kind: 'select', options: Object.entries(POSTER_SIZES).map(([id, size]): [string, string] => [id, size.label]), max: 60 },
    { name: 'layout', label: 'Layout', kind: 'select', options: [['3-column', '3 columns'], ['2-column', '2 columns']], max: 60 },
  ],
  grounded: 'single', output: 'poster', topicField: 'topic', cost: () => ({ action: 'section', units: 1 }),
};

export type PosterSection = { heading: string; text: string; bullets: string[] };
export type PosterFigure = { title: string; description: string };
export type Poster = {
  title: string;
  authors: string;
  affiliations: string;
  sections: PosterSection[];
  figures: PosterFigure[];
  /** References the content itself gives (when the poster is built from the writer's text); cited sources are added from the markers. */
  references: string[];
  contact: string;
};

const SYSTEM =
  'You are AI for Research, an assistant for academic research and writing. You write research posters: short, plain, scannable text that a reader takes in from a metre away. ' +
  'Prefer short common words and direct sentences; no stock phrases ("delve", "plays a crucial role", "it is important to note"). Never mention being an AI. Answer with JSON only.';

/** The prompt (the same shape as the other studio prompt builders in studioModules.ts). */
export function posterBuilder(c: StudioContext): { system: string; user: string; maxTokens: number; grounded: boolean; json: true } {
  const columns = posterColumns(c.inputs.layout);
  const content = c.inputs.text?.trim();
  const cited = c.sources.length > 0;
  return {
    // With sources, buildStudioPrompt adds the citation rules ([S1] markers) to this system prompt.
    system: `${SYSTEM} Write in ${c.language || 'the language of the user’s input'}.${cited ? ' Put source markers like [S2] at the end of sentences and bullets that state findings.' : ' Never invent results, numbers or references.'}`,
    user: `Make a research poster on "${c.inputs.topic}" for a ${columns}-column layout. ` +
      'Return {"title": "...", "authors": "[Author names]", "affiliations": "[Affiliations]", "sections": [{"heading": "...", "text": "1–3 short sentences", "bullets": ["at most 5 bullets, each under 15 words"]}], ' +
      '"figures": [{"title": "...", "description": "what the figure shows and the data it needs, one sentence"}], "references": ["..."], "contact": "[Email]"}. ' +
      'Use 5–7 sections in this order where they fit: Introduction or Background, Aim or Research question, Methods, Results, Discussion, Conclusions, and optionally Future work. Keep the whole poster under 600 words. ' +
      'Suggest 2–3 key figures (a chart, diagram or table) that a designer would make; only name numbers that the content or sources give. ' +
      'Leave authors, affiliations and contact as [placeholders] unless the content names them. ' +
      (content
        ? 'Build the poster from the content below; use only its findings and numbers. "references" lists the references it cites (at most 6), as written; otherwise leave it empty.' +
          `\n\nThe content:\n${content.slice(0, 100_000)}`
        : 'Leave "references" empty: the references are added from the source markers.'),
    maxTokens: 3200, grounded: !content, json: true,
  };
}

const str = (value: unknown, max: number) => (typeof value === 'string' ? value.replace(/\s+/g, ' ').trim().slice(0, max) : '');

/** A poster from the model's JSON, cleaned: strings trimmed and capped, empty parts dropped; null when nothing usable came back. */
export function cleanPoster(raw: any, fallbackTitle: string): Poster | null {
  if (!raw || typeof raw !== 'object') return null;
  const sections: PosterSection[] = (Array.isArray(raw.sections) ? raw.sections : []).slice(0, 10).map((section: any) => ({
    heading: str(section?.heading ?? section?.title, 80),
    text: str(section?.text, 700),
    bullets: (Array.isArray(section?.bullets) ? section.bullets : []).map((bullet: unknown) => str(bullet, 220)).filter(Boolean).slice(0, 6),
  })).filter((section: PosterSection) => section.heading && (section.text || section.bullets.length));
  if (!sections.length) return null;
  const figures: PosterFigure[] = (Array.isArray(raw.figures) ? raw.figures : []).slice(0, 4).map((figure: any) => ({
    title: str(figure?.title, 120), description: str(figure?.description, 400),
  })).filter((figure: PosterFigure) => figure.title || figure.description);
  return {
    title: str(raw.title, 200) || str(fallbackTitle, 200) || 'Research poster',
    authors: str(raw.authors, 300) || '[Author names]',
    affiliations: str(raw.affiliations, 300) || '[Affiliations]',
    sections,
    figures,
    references: (Array.isArray(raw.references) ? raw.references : []).map((item: unknown) => str(item, 400)).filter(Boolean).slice(0, 8),
    contact: str(raw.contact, 200),
  };
}

/** Every piece of poster text that may carry [S…] markers, for keeping only real ones. */
export function mapPosterText(poster: Poster, map: (text: string) => string): Poster {
  return {
    ...poster,
    sections: poster.sections.map((section) => ({ ...section, text: map(section.text), bullets: section.bullets.map(map).filter(Boolean) })),
    figures: poster.figures.map((figure) => ({ ...figure, description: map(figure.description) })),
  };
}

/** All the text of a poster in one string (for finding the cited sources). */
export const posterText = (poster: Poster) => poster.sections.map((section) => [section.text, ...section.bullets].join(' ')).concat(poster.figures.map((figure) => figure.description)).join(' ');
