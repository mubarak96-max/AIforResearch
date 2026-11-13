import { describe, expect, it } from 'vitest';
import { POSTER_MODULE, cleanPoster, mapPosterText, posterBuilder, posterText, type Poster } from '../../lib/server/lib/posterModule.js';
import { blockWeight, escapeLatex, numberCitations, posterBlocks, posterMarkdown, posterTex, splitColumns } from '../../components/app/studio/poster.js';
import type { Source } from '../../components/app/research/parts';

const source = (n: number, extra: Partial<Source> = {}): Source => ({
  n, marker: `S${n}`, kind: 'paper', id: `W${n}`, title: `Paper ${n}`, authors: ['Jane Smith', 'Ali Khan'], more_authors: 0, year: 2020 + n, venue: 'Sleep', doi: `10.1/${n}`,
  url: null, pdf_url: null, is_oa: false, cited_by_count: null, study_type: null, study_type_label: null, journal_tier: null, is_preprint: false, is_retracted: false,
  providers: ['openalex'], abstract: null, tldr: null, ...extra,
});

const raw = {
  title: '  Sleep and   recall ',
  sections: [
    { heading: 'Introduction', text: 'Sleep helps memory [S2].', bullets: ['One', '', 42] },
    { heading: 'Methods', text: '', bullets: ['120 students', 'Recall test'] },
    { heading: 'Results', text: 'Recall rose by 12% [S1, S9].', bullets: [] },
    { heading: '', text: 'No heading: dropped' },
    { heading: 'Empty: dropped', text: '', bullets: [] },
    { heading: 'Conclusions', bullets: ['Sleep after study [S2]'] },
  ],
  figures: [{ title: 'Recall by group', description: 'Bar chart of recall [S1]' }, { title: '', description: '' }],
  references: ['Smith J. (2020). Sleep.', 7],
};

describe('poster JSON', () => {
  it('cleans the model’s JSON: trims, drops empty or untitled sections and figures, keeps placeholders for authors', () => {
    const poster = cleanPoster(raw, 'Fallback')!;
    expect(poster.title).toBe('Sleep and recall');
    expect(poster.sections.map((section) => section.heading)).toEqual(['Introduction', 'Methods', 'Results', 'Conclusions']);
    expect(poster.sections[0].bullets).toEqual(['One']);
    expect(poster.figures).toHaveLength(1);
    expect(poster.references).toEqual(['Smith J. (2020). Sleep.']);
    expect(poster.authors).toBe('[Author names]');
    expect(poster.affiliations).toBe('[Affiliations]');
  });

  it('returns null without usable sections, and uses the topic as a missing title', () => {
    expect(cleanPoster(null, 'x')).toBeNull();
    expect(cleanPoster({ title: 'T', sections: [{ heading: 'A' }] }, 'x')).toBeNull();
    expect(cleanPoster({ sections: [{ heading: 'A', text: 'b' }] }, 'My topic')!.title).toBe('My topic');
  });

  it('caps long text and the number of sections', () => {
    const poster = cleanPoster({ sections: Array.from({ length: 20 }, (_, index) => ({ heading: `H${index}`, text: 'x'.repeat(2000), bullets: Array(10).fill('b') })) }, 't')!;
    expect(poster.sections).toHaveLength(10);
    expect(poster.sections[0].text).toHaveLength(700);
    expect(poster.sections[0].bullets).toHaveLength(6);
  });

  it('maps every marker-carrying text (for dropping invented markers) and collects the text', () => {
    const poster = mapPosterText(cleanPoster(raw, 't')!, (text) => text.replace(/\s*\[S9\]|, S9/g, ''));
    expect(poster.sections[2].text).toBe('Recall rose by 12% [S1].');
    expect(posterText(poster)).toContain('Bar chart of recall [S1]');
  });

  it('is a slides-workspace module costing a section, with the size and layout choices', () => {
    expect(POSTER_MODULE).toMatchObject({ id: 'poster', workspace: 'slides', grounded: 'single', topicField: 'topic' });
    expect(POSTER_MODULE.cost({})).toEqual({ action: 'section', units: 1 });
    expect(POSTER_MODULE.fields.find((field) => field.name === 'size')!.options!.map(([id]) => id)).toEqual(['a0-portrait', 'a1-portrait', '48x36-landscape']);
    expect(POSTER_MODULE.fields.find((field) => field.name === 'layout')!.options!.map(([id]) => id)).toEqual(['3-column', '2-column']);
    const prompt = posterBuilder({ inputs: { topic: 'Sleep', text: 'Our study found…', layout: '2-column' }, sources: [], role: null, field: null, headings: true, length: 'standard', language: null, highQuality: false });
    expect(prompt.json).toBe(true);
    expect(prompt.user).toContain('2-column');
    expect(prompt.user).toContain('Our study found');
  });
});

describe('poster exports', () => {
  const poster = cleanPoster(raw, 't')!;

  it('numbers citations in order of first use, drops unknown markers and lists the references', () => {
    const { poster: numbered, references } = numberCitations(poster, [source(1), source(2)]);
    expect(numbered.sections[0].text).toBe('Sleep helps memory [1].');
    expect(numbered.sections[2].text).toBe('Recall rose by 12% [2].');
    expect(references[0]).toContain('Paper 2');
    expect(references[1]).toContain('Paper 1');
    // The writer's own references come after the cited sources.
    expect(references[2]).toBe('Smith J. (2020). Sleep.');
  });

  it('escapes LaTeX special characters and common symbols', () => {
    expect(escapeLatex('50% of R&D_costs #1 cost $5 {x} ~ ^ \\path')).toBe('50\\% of R\\&D\\_costs \\#1 cost \\$5 \\{x\\} \\textasciitilde{} \\textasciicircum{} \\textbackslash{}path');
    expect(escapeLatex('p ≤ 0.05, n ≥ 30, 5 ± 2 µm, χ² test')).toBe('p $\\leq$ 0.05, n $\\geq$ 30, 5 $\\pm$ 2 $\\mu$m, $\\chi$$^{2}$ test');
    expect(escapeLatex('a\u0000b\n\nc')).toBe('ab c');
  });

  it('writes a compile-ready tikzposter document at the chosen size and columns', () => {
    const { poster: numbered, references } = numberCitations(poster, [source(1), source(2)]);
    const tex = posterTex({ ...numbered, title: 'Costs & 50% gains' }, references, { size: 'a1-portrait', layout: '2-column' });
    expect(tex).toContain('\\documentclass[20pt, a1paper, portrait,');
    expect(tex).toContain('{tikzposter}');
    expect(tex).toContain('\\title{Costs \\& 50\\% gains}');
    expect(tex.match(/\\column\{0\.500\}/g)).toHaveLength(2);
    expect(tex).toContain('\\block{References}');
    expect(tex).toMatch(/\\begin\{document\}[\s\S]*\\maketitle[\s\S]*\\end\{columns\}[\s\S]*\\end\{document\}/);
    // Every brace the document opens is closed.
    const unescaped = tex.replace(/\\[{}]/g, '');
    expect(unescaped.split('{').length).toBe(unescaped.split('}').length);
    const wide = posterTex(numbered, references, { size: '48x36-landscape', layout: '3-column' });
    expect(wide).toContain('landscape');
    expect(wide).toContain('\\geometry{paperwidth=48in, paperheight=36in}');
    expect(wide.match(/\\column\{0\.333\}/g)).toHaveLength(3);
  });

  it('places figures after Results and splits blocks into balanced, non-empty columns in order', () => {
    const blocks = posterBlocks(poster, ['ref']);
    expect(blocks.map((block) => block.kind)).toEqual(['section', 'section', 'section', 'figure', 'section', 'references']);
    const columns = splitColumns(blocks, 3, blockWeight);
    expect(columns).toHaveLength(3);
    expect(columns.every((column) => column.length > 0)).toBe(true);
    expect(columns.flat()).toEqual(blocks);
    expect(splitColumns([1, 1], 3, () => 1)).toEqual([[1], [1], []]);
  });

  it('gives Markdown with the markers kept for the editor', () => {
    const markdown = posterMarkdown(poster as Poster);
    expect(markdown).toContain('## Results');
    expect(markdown).toContain('[S1, S9]');
    expect(markdown).toContain('## Suggested figures');
  });
});
