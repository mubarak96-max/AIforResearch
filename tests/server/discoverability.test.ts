import { describe, expect, it } from 'vitest';
import { FEATURE_CATEGORIES, FEATURE_PAGES, featuresForText, getFeaturePage, relatedFeatures, signupHref } from '../../lib/features.js';
import { TOOLS, getTool, relatedTools, toolsForText } from '../../lib/tools.js';
import { CITATION_STYLES } from '../../lib/citationStyles.js';
import { apa, bibtex, chicago, harvard, initials, mla, parseName, shortRange, type CiteRecord } from '../../lib/scholarly/cite.js';
import { toAuthorRecord, toPaperRecord, workToCsl } from '../../lib/server/lib/directory.js';
import { DOCUMENT_TEMPLATES } from '../../components/editor/lib/aiEditor/templates.js';

// ------------------------------------------------------------------ feature pages and tools

/** Routes a feature page's button may open: each one exists and does what the page says. */
const APP_ROUTE = /^\/(editor(\?(tool=(papers|library|chat)|new=1|template=[a-z-]+))?|matrix)$/;

describe('feature pages', () => {
  it('has unique slugs and known categories', () => {
    const slugs = FEATURE_PAGES.map((page) => page.slug);
    expect(new Set(slugs).size).toBe(slugs.length);
    for (const page of FEATURE_PAGES) expect(FEATURE_CATEGORIES.some((category) => category.id === page.category)).toBe(true);
  });

  it('links only to pages and tools that exist', () => {
    for (const page of FEATURE_PAGES) {
      expect(relatedFeatures(page).length, page.slug).toBe(page.related.length);
      expect(page.related).not.toContain(page.slug);
      for (const slug of page.tools) expect(getTool(slug), `${page.slug} -> ${slug}`).toBeDefined();
    }
  });

  it('sends every button to a working app route', () => {
    for (const page of FEATURE_PAGES) expect(page.cta.href, page.slug).toMatch(APP_ROUTE);
    const templates = new Set<string>(DOCUMENT_TEMPLATES.map((template) => template.id));
    for (const page of FEATURE_PAGES) {
      const template = /template=([a-z-]+)/.exec(page.cta.href)?.[1];
      if (template) expect(templates.has(template), page.slug).toBe(true);
    }
  });

  it('never shares a slug with a tool (one meaning per name)', () => {
    const tools = new Set(TOOLS.map((tool) => tool.slug));
    for (const page of FEATURE_PAGES) expect(tools.has(page.slug), page.slug).toBe(false);
  });
});

describe('tools', () => {
  it('has unique slugs, real related links and a form for every AI tool', () => {
    const slugs = TOOLS.map((tool) => tool.slug);
    expect(new Set(slugs).size).toBe(slugs.length);
    for (const tool of TOOLS) {
      expect(relatedTools(tool).length, tool.slug).toBe(tool.related.length);
      for (const slug of tool.features) expect(getFeaturePage(slug), `${tool.slug} -> ${slug}`).toBeDefined();
      if (tool.kind === 'ai') expect(tool.fields?.length, tool.slug).toBeGreaterThan(0);
      if (tool.grounded) expect(tool.fields?.some((field) => field.name === 'topic'), tool.slug).toBe(true);
      for (const field of tool.fields ?? []) if (field.kind === 'select') expect(field.options?.length, `${tool.slug}.${field.name}`).toBeGreaterThan(0);
    }
  });

  it('states limits and questions on every page', () => {
    for (const tool of [...TOOLS, ...FEATURE_PAGES]) {
      expect(tool.limitations.length, tool.slug).toBeGreaterThan(0);
      expect(tool.faq.length, tool.slug).toBeGreaterThan(0);
    }
  });

  it('keeps titles and descriptions to a length search engines show', () => {
    for (const page of [...TOOLS, ...FEATURE_PAGES, ...CITATION_STYLES]) {
      expect(page.description.length, page.slug).toBeLessThanOrEqual(170);
      expect(page.seoTitle.length, page.slug).toBeLessThanOrEqual(66);
    }
  });

  it('finds tools and features for a blog post from its keywords', () => {
    expect(toolsForText('AI citation generator for APA').map((tool) => tool.slug)).toContain('citation-generator');
    expect(featuresForText('how to fact check an article').map((page) => page.slug)).toContain('citation-checker');
    expect(toolsForText('screenplay format')).toEqual([]);
  });

  it('sends signed-out visitors through sign-up and back', () => {
    expect(signupHref('/editor?tool=papers')).toBe('/signup?next=%2Feditor%3Ftool%3Dpapers');
  });
});

// ------------------------------------------------------------------ citation formatting

const watsonCrick: CiteRecord = {
  title: 'Molecular structure of nucleic acids: A structure for deoxyribose nucleic acid',
  authors: ['James D. Watson', 'Francis H. C. Crick'],
  year: 1953,
  venue: 'Nature',
  volume: '171',
  issue: '4356',
  firstPage: '737',
  lastPage: '738',
  doi: '10.1038/171737a0',
  type: 'article',
};

describe('names', () => {
  it('splits given and family names', () => {
    expect(parseName('James D. Watson')).toEqual({ family: 'Watson', given: 'James D.' });
    expect(parseName('Watson, James D.')).toEqual({ family: 'Watson', given: 'James D.' });
    expect(parseName('Ludwig van Beethoven')).toEqual({ family: 'van Beethoven', given: 'Ludwig' });
    expect(parseName('Martin Luther King Jr.')).toEqual({ family: 'King Jr.', given: 'Martin Luther' });
    expect(parseName('Plato')).toEqual({ family: 'Plato', given: '' });
  });

  it('makes initials', () => {
    expect(initials('Francis H. C.')).toBe('F. H. C.');
    expect(initials('Jean-Paul')).toBe('J.-P.');
    expect(initials('Francis H. C.', { spaced: false })).toBe('F.H.C.');
  });

  it('shortens page ranges the Chicago way', () => {
    expect(shortRange('737', '738')).toBe('38');
    expect(shortRange('1250', '1259')).toBe('59');
    expect(shortRange('98', '102')).toBe('102');
  });
});

describe('cite this paper', () => {
  // Match the style pages (lib/citationStyles.ts), except that the index gives full given
  // names where the style pages use initials.
  it('formats APA 7', () => {
    expect(apa(watsonCrick)).toBe('Watson, J. D., & Crick, F. H. C. (1953). Molecular structure of nucleic acids: A structure for deoxyribose nucleic acid. *Nature*, *171*(4356), 737–738. https://doi.org/10.1038/171737a0');
  });

  it('formats MLA 9', () => {
    expect(mla(watsonCrick)).toBe('Watson, James D., and Francis H. C. Crick. “Molecular structure of nucleic acids: A structure for deoxyribose nucleic acid.” *Nature*, vol. 171, no. 4356, 1953, pp. 737–38, https://doi.org/10.1038/171737a0.');
    expect(mla({ ...watsonCrick, authors: ['A B', 'C D', 'E F'] })).toMatch(/^B, A, et al\. /);
  });

  it('formats Chicago author-date', () => {
    expect(chicago(watsonCrick)).toBe('Watson, James D., and Francis H. C. Crick. 1953. “Molecular structure of nucleic acids: A structure for deoxyribose nucleic acid.” *Nature* 171 (4356): 737–38. https://doi.org/10.1038/171737a0.');
  });

  it('formats Harvard', () => {
    expect(harvard(watsonCrick)).toBe('Watson, J.D. and Crick, F.H.C. (1953) ‘Molecular structure of nucleic acids: A structure for deoxyribose nucleic acid’, *Nature*, 171(4356), pp. 737–738. Available at: https://doi.org/10.1038/171737a0.');
  });

  it('copes with missing details', () => {
    const bare: CiteRecord = { title: 'Notes', authors: [], year: null, venue: null };
    expect(apa(bare)).toBe('(n.d.). Notes.');
    expect(mla(bare)).toBe('“Notes.”');
  });

  it('writes BibTeX', () => {
    expect(bibtex(watsonCrick)).toBe([
      '@article{watson1953molecular,',
      '  title = {{Molecular structure of nucleic acids: A structure for deoxyribose nucleic acid}},',
      '  author = {Watson, James D. and Crick, Francis H. C.},',
      '  journal = {Nature},',
      '  volume = {171},',
      '  number = {4356},',
      '  pages = {737--738},',
      '  year = {1953},',
      '  doi = {10.1038/171737a0}',
      '}',
    ].join('\n'));
  });
});

// ------------------------------------------------------------------ directory records

describe('directory records', () => {
  it('maps a work with every author and its related works', () => {
    const record = toPaperRecord({
      id: 'https://openalex.org/W2100837269',
      title: 'Molecular structure of nucleic acids',
      publication_year: 1953,
      authorships: Array.from({ length: 7 }, (_, i) => ({ author: { id: `https://openalex.org/A${i + 1}`, display_name: `Author ${i + 1}` } })),
      related_works: ['https://openalex.org/W1', 'not-an-id'],
      topics: [{ id: 'https://openalex.org/T1', display_name: 'DNA' }],
      referenced_works: ['W9', 'W8'],
    }, 'openalex');
    expect(record?.paper.id).toBe('W2100837269');
    expect(record?.authors).toHaveLength(7);
    expect(record?.authors[0]).toEqual({ id: 'A1', name: 'Author 1', institution: null });
    expect(record?.relatedIds).toEqual(['W1']);
    expect(record?.topics).toEqual([{ id: 'T1', name: 'DNA' }]);
    expect(record?.referenceCount).toBe(2);
    expect(toPaperRecord(null, 'openalex')).toBeNull();
  });

  it('maps an author', () => {
    const author = toAuthorRecord({
      id: 'https://openalex.org/A5023888391',
      display_name: 'Jane Doe',
      display_name_alternatives: ['J. Doe', 'Jane Doe'],
      orcid: 'https://orcid.org/0000-0002-1825-0097',
      works_count: 42,
      cited_by_count: 1000,
      summary_stats: { h_index: 15 },
      last_known_institutions: [{ display_name: 'University of Nairobi', country_code: 'KE' }],
      topics: [{ display_name: 'Microfinance' }],
    }, 'scholar');
    expect(author).toMatchObject({ id: 'A5023888391', orcid: '0000-0002-1825-0097', institution: 'University of Nairobi', hIndex: 15, otherNames: ['J. Doe'], topics: ['Microfinance'] });
    expect(toAuthorRecord({ id: 'W1' }, 'scholar')).toBeNull();
  });

  it('turns a work into CSL-JSON with every author', () => {
    expect(workToCsl({
      id: 'https://openalex.org/W2100837269', title: 'Molecular structure of nucleic acids', type: 'article', publication_date: '1953-04-25',
      authorships: [{ author: { display_name: 'James D. Watson' } }, { author: { display_name: 'Francis H. C. Crick' } }],
      primary_location: { source: { display_name: 'Nature' } }, doi: 'https://doi.org/10.1038/171737a0', biblio: { volume: '171', issue: '4356', first_page: '737', last_page: '738' },
    })).toEqual({
      id: 'W2100837269', type: 'article-journal', title: 'Molecular structure of nucleic acids',
      author: [{ family: 'Watson', given: 'James D.' }, { family: 'Crick', given: 'Francis H. C.' }],
      issued: { 'date-parts': [[1953, 4, 25]] }, 'container-title': 'Nature', volume: '171', issue: '4356', page: '737-738', DOI: '10.1038/171737a0',
    });
  });
});
