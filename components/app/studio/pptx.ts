'use client';

/**
 * A deck as a PowerPoint file, made in the browser with pptxgenjs: a title slide, then one
 * slide per item with its bullets, an optional table or bar chart and the speaker notes, in the
 * app's ink-and-paper colours. Citation markers become the cited source's short label, and a
 * References slide closes the deck.
 */
import type { Source } from '@/components/app/research/parts';

export type Slide = { title: string; bullets: string[]; notes: string; table?: { headers: string[]; rows: string[][] } | null; chart?: { type: 'bar'; label: string; labels: string[]; values: number[] } | null };
export type Deck = { title: string; subtitle: string; slides: Slide[] };

const INK = '1C1917';
const BRAND = '1E3A5F';
const ACCENT = 'C2410C';
const PAPER = 'FFFDF9';
const MUTED = '78716C';

/** "Smith et al., 2020" for a source, for in-slide citations. */
export function shortCite(source: Source): string {
  const family = (name: string) => name.trim().split(/\s+/).pop() || name;
  const authors = source.authors.length ? (source.authors.length > 2 ? `${family(source.authors[0])} et al.` : source.authors.map(family).join(' & ')) : source.venue || source.title.slice(0, 30);
  return `${authors}, ${source.year ?? 'n.d.'}`;
}

/** Bullet text with [S1] markers as (Smith et al., 2020). */
export function citeText(text: string, sources: Source[]): string {
  const byMarker = new Map(sources.map((source) => [source.marker, source]));
  return text.replace(/\s*\[(S\d+(?:\s*[,;]\s*S?\d+)*)\]/g, (_, group: string) => {
    const cited = [...group.matchAll(/S?(\d+)/g)].map((match) => byMarker.get(`S${match[1]}`)).filter((source): source is Source => Boolean(source));
    return cited.length ? ` (${cited.map(shortCite).join('; ')})` : '';
  });
}

export async function downloadPptx(deck: Deck, sources: Source[]) {
  const { default: PptxGenJS } = await import('pptxgenjs');
  const pptx = new PptxGenJS();
  pptx.layout = 'LAYOUT_WIDE';
  pptx.title = deck.title;
  pptx.defineSlideMaster({
    title: 'CONTENT', background: { color: PAPER },
    objects: [{ rect: { x: 0, y: 0, w: 13.33, h: 0.12, fill: { color: BRAND } } }],
    slideNumber: { x: 12.3, y: 7.0, color: MUTED, fontSize: 10 },
  });

  const cover = pptx.addSlide();
  cover.background = { color: BRAND };
  cover.addText(deck.title, { x: 0.8, y: 2.4, w: 11.7, h: 1.6, fontFace: 'Georgia', fontSize: 40, bold: true, color: 'FFFFFF' });
  if (deck.subtitle) cover.addText(deck.subtitle, { x: 0.8, y: 4.1, w: 11.7, h: 0.8, fontSize: 20, color: 'DBE3EE' });

  for (const item of deck.slides) {
    const slide = pptx.addSlide({ masterName: 'CONTENT' });
    slide.addText(item.title, { x: 0.6, y: 0.35, w: 12.1, h: 0.9, fontFace: 'Georgia', fontSize: 28, bold: true, color: INK });
    const hasVisual = Boolean(item.table || item.chart);
    if (item.bullets.length) {
      slide.addText(item.bullets.map((bullet) => ({ text: citeText(bullet, sources), options: { bullet: { code: '25A0' }, paraSpaceAfter: 10 } })), {
        x: 0.7, y: 1.45, w: hasVisual ? 5.9 : 11.9, h: 5.3, fontSize: hasVisual ? 17 : 20, color: INK, valign: 'top',
      });
    }
    if (item.table) {
      const rows = [item.table.headers.map((cell) => ({ text: cell, options: { bold: true, color: 'FFFFFF', fill: { color: BRAND } } })), ...item.table.rows.map((row) => row.map((cell) => ({ text: cell })))];
      slide.addTable(rows, { x: item.bullets.length ? 6.9 : 0.7, y: 1.5, w: item.bullets.length ? 5.8 : 11.9, fontSize: 12, color: INK, border: { type: 'solid', pt: 0.5, color: 'D6D0C7' } });
    } else if (item.chart) {
      slide.addChart(pptx.ChartType.bar, [{ name: item.chart.label || 'Value', labels: item.chart.labels, values: item.chart.values }], {
        x: item.bullets.length ? 6.9 : 0.7, y: 1.5, w: item.bullets.length ? 5.8 : 11.9, h: 5, chartColors: [ACCENT], showValue: true, catAxisLabelColor: MUTED, valAxisLabelColor: MUTED, showLegend: false,
      });
    }
    if (item.notes) slide.addNotes(item.notes);
  }

  const cited = sources.filter((source) => deck.slides.some((slide) => slide.bullets.some((bullet) => new RegExp(`\\b${source.marker}\\b`).test(bullet))));
  if (cited.length) {
    const references = pptx.addSlide({ masterName: 'CONTENT' });
    references.addText('References', { x: 0.6, y: 0.35, w: 12.1, h: 0.9, fontFace: 'Georgia', fontSize: 28, bold: true, color: INK });
    references.addText(cited.slice(0, 14).map((source) => ({
      text: `${source.authors.slice(0, 3).join(', ')}${source.authors.length > 3 ? ' et al.' : ''} (${source.year ?? 'n.d.'}). ${source.title}.${source.venue ? ` ${source.venue}.` : ''}${source.doi ? ` https://doi.org/${source.doi}` : ''}`,
      options: { paraSpaceAfter: 6 },
    })), { x: 0.7, y: 1.4, w: 11.9, h: 5.6, fontSize: 12, color: INK, valign: 'top' });
  }
  const name = deck.title.replace(/[^\p{L}\p{N} _-]+/gu, '').trim().slice(0, 80) || 'slides';
  await pptx.writeFile({ fileName: `${name}.pptx` });
}
