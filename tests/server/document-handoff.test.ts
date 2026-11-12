// @vitest-environment jsdom
import { describe, expect, it } from 'vitest';
import { editorHtml, plainText, type ResultSource } from '../../components/tools/toolOutput';
import { prepareStudioHtmlForEditor } from '../../components/editor/lib/aiEditor/studioImport';

const source: ResultSource = { marker: 'S1', id: 'W123', title: 'Mémoire et apprentissage — 学習', authors: ['José García', '李 明'], moreAuthors: 0, year: 2024, venue: 'Research journal', volume: '5', issue: '2', firstPage: '10', lastPage: '18', doi: '10.1234/example', type: 'article' };
const report = '# Evidence overview\n\nRésumé: café, العربية, 日本語. [S1]\n\n## Findings\n\n| Measure | Observation |\n| --- | --- |\n| A \\| B | 0 |\n| علاج | Not reported |\n\n### References for review\n\nRead [the original](https://doi.org/10.1234/example).';

describe('research document handoff fidelity', () => {
  it('retains headings, multilingual table cells and escaped separators through the actual editor preprocessing', () => {
    const document = new DOMParser().parseFromString(prepareStudioHtmlForEditor(editorHtml(report, [source]), 'apa'), 'text/html');
    expect([...document.querySelectorAll('h1,h2,h3')].map((node) => [node.tagName, node.textContent])).toEqual([['H1', 'Evidence overview'], ['H2', 'Findings'], ['H3', 'References for review']]);
    expect([...document.querySelectorAll('tbody tr')].map((row) => [...row.querySelectorAll('td')].map((cell) => cell.textContent))).toEqual([['A | B', '0'], ['علاج', 'Not reported']]);
    expect(document.body.textContent).toContain('Résumé: café, العربية, 日本語.');
    expect(document.querySelector('a')?.getAttribute('href')).toBe('https://doi.org/10.1234/example');
  });

  it('carries original citation metadata into the native editor token and retains plain-text references', () => {
    const document = new DOMParser().parseFromString(prepareStudioHtmlForEditor(editorHtml(report, [source]), 'apa'), 'text/html');
    const citation = document.querySelector('[data-inline-content-type="aiCitation"]')!;
    expect(citation).not.toBeNull();
    const decoded = Buffer.from(citation.getAttribute('data-base64')!, 'base64').toString('utf8');
    expect(decoded).toContain('Mémoire et apprentissage');
    expect(decoded).toContain('García, José');
    expect(decoded).toContain('10.1234/example');
    expect(citation.getAttribute('data-style')).toBe('apa');
    const copy = plainText(report, [source]);
    expect(copy).toContain('References'); expect(copy).toContain(source.title); expect(copy).toContain('10.1234/example');
    expect(copy).not.toContain('[S1]');
  });
});
