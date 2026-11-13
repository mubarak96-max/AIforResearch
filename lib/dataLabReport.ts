/**
 * The Data Lab PDF report as one self-contained HTML page: the dataset summary, every analysis
 * (its table, chart and APA sentence) and the AI-written results section if there is one.
 * The page prints it from a hidden frame, where the browser's "Save as PDF" makes the file, as
 * the editor's PDF export does. Charts are inline SVG, so they print without scripts. Pure.
 */
import type { AnalysisResult } from './dataLabReproducibility';
import type { SurvivalChart } from './statsMore';

export type ReportInput = {
  title: string; dataset: string; rows: number | null; question?: string;
  columns: { name: string; kind: string; summary: string }[];
  results: AnalysisResult[];
  /** The results section as HTML (escaped Markdown from markdownToHtml), or empty. */
  reportHtml?: string;
  software: string; datasetSha256?: string; generatedAt: string;
};

export const escapeHtml = (value: string) => value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');

const COLORS = ['#2f5bd3', '#d9622b', '#1f8a5b', '#9b3fb5', '#b8860b', '#c0392b', '#2c7a8c', '#555555'];
const tick = (value: number) => (Math.abs(value) >= 1000 ? value.toLocaleString('en-US', { maximumFractionDigits: 0 }) : String(Number(value.toFixed(2))));

function niceTop(max: number): number[] {
  if (!(max > 0)) return [0, 1];
  const raw = max / 4;
  const power = 10 ** Math.floor(Math.log10(raw));
  const step = [1, 2, 2.5, 5, 10].map((m) => m * power).find((value) => value >= raw) ?? raw;
  const ticks: number[] = [];
  for (let value = 0; value <= Math.ceil(max / step) * step + step / 2; value += step) ticks.push(Number(value.toFixed(10)));
  return ticks;
}

/** A survival (step) or ROC chart as standalone SVG, in print colours (the same layout as CurveChart). */
export function curveChartSvg(chart: SurvivalChart, label: string): string {
  const W = 640; const height = 300; const left = 48; const bottom = 40; const right = 12;
  const series = chart.series.slice(0, 8);
  const maxX = chart.kind === 'roc' ? 1 : Math.max(1e-9, ...series.flatMap((item) => item.points.map(([x]) => x)));
  const ticksX = chart.kind === 'roc' ? [0, 0.25, 0.5, 0.75, 1] : niceTop(maxX);
  const topX = ticksX[ticksX.length - 1];
  const px = (value: number) => (left + (value / topX) * (W - left - right)).toFixed(1);
  const py = (value: number) => (8 + (1 - value) * (height - bottom - 8)).toFixed(1);
  const path = (points: [number, number][]) => points.map(([x, y], i) => (i === 0 ? `M${px(x)},${py(y)}` : chart.kind === 'survival' ? `H${px(x)}V${py(y)}` : `L${px(x)},${py(y)}`)).join('');
  const parts = [
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${height}" role="img" aria-label="${escapeHtml(label)}" width="100%">`,
    ...[0, 0.25, 0.5, 0.75, 1].map((value) => `<line x1="${left}" x2="${W - right}" y1="${py(value)}" y2="${py(value)}" stroke="#e3e3e3"/><text x="${left - 6}" y="${Number(py(value)) + 4}" text-anchor="end" font-size="11" fill="#666">${value}</text>`),
    ...ticksX.map((value) => `<text x="${px(value)}" y="${height - bottom + 16}" text-anchor="middle" font-size="11" fill="#666">${tick(value)}</text>`),
    `<line x1="${left}" x2="${W - right}" y1="${py(0)}" y2="${py(0)}" stroke="#999" stroke-width="1.5"/>`,
    ...(chart.kind === 'roc' ? [`<line x1="${px(0)}" y1="${py(0)}" x2="${px(1)}" y2="${py(1)}" stroke="#aaa" stroke-dasharray="4 4"/>`] : []),
    ...series.map((item, i) => `<path d="${path(item.points)}" fill="none" stroke="${COLORS[i]}" stroke-width="2" stroke-linejoin="round"/>`),
    `<text x="${(W + left) / 2}" y="${height - 6}" text-anchor="middle" font-size="12" fill="#666">${escapeHtml(chart.x)}</text>`,
    `<text x="12" y="${(height - bottom) / 2}" text-anchor="middle" font-size="12" fill="#666" transform="rotate(-90 12 ${(height - bottom) / 2})">${escapeHtml(chart.y)}</text>`,
    '</svg>',
  ];
  const legend = series.length > 1
    ? `<p class="legend">${series.map((item, i) => `<span><i style="background:${COLORS[i]}"></i>${escapeHtml(item.name)}</span>`).join('')}</p>`
    : '';
  return `<figure>${legend}${parts.join('')}</figure>`;
}

function resultSection(result: AnalysisResult, index: number): string {
  return [
    `<section class="analysis"><h3>${index + 1}. ${escapeHtml(result.title)}</h3>`,
    result.rows.length ? `<table><tbody>${result.rows.map(([label, value]) => `<tr><td>${escapeHtml(label)}</td><td class="num">${escapeHtml(value)}</td></tr>`).join('')}</tbody></table>` : '',
    result.chart ? curveChartSvg(result.chart, result.title) : '',
    result.apa ? `<p class="apa">${escapeHtml(result.apa)}</p>` : '',
    ...result.warnings.map((warning) => `<p class="warning">${escapeHtml(warning)}</p>`),
    '</section>',
  ].join('');
}

export function dataLabReportHtml(input: ReportInput): string {
  const style = `
    @page { size: A4; margin: 18mm 16mm; }
    body { font: 11pt/1.45 Georgia, 'Times New Roman', serif; color: #111; background: #fff; margin: 0; }
    h1 { font-size: 18pt; margin: 0 0 4pt; } h2 { font-size: 14pt; margin: 18pt 0 6pt; border-bottom: 1px solid #ccc; padding-bottom: 3pt; }
    h3 { font-size: 12pt; margin: 12pt 0 4pt; } p { margin: 4pt 0; }
    .meta { color: #555; font-size: 9.5pt; } .num { text-align: right; font-variant-numeric: tabular-nums; }
    table { width: 100%; border-collapse: collapse; font-size: 10pt; margin: 4pt 0; } td, th { border-top: 1px solid #ddd; padding: 3pt 6pt 3pt 0; vertical-align: top; text-align: left; }
    th { font-weight: bold; } .apa { background: #f4f4f4; padding: 5pt 7pt; } .warning { color: #8a5300; font-size: 9.5pt; }
    figure { margin: 6pt 0; } .legend { font-size: 9pt; } .legend span { margin-right: 12pt; } .legend i { display: inline-block; width: 14pt; height: 2pt; margin-right: 4pt; vertical-align: middle; }
    section.analysis { break-inside: avoid; } svg { max-width: 100%; height: auto; }`;
  const summary = input.columns.length
    ? `<table><thead><tr><th>Variable</th><th>Type</th><th>Summary</th></tr></thead><tbody>${input.columns.map((column) => `<tr><td>${escapeHtml(column.name)}</td><td>${escapeHtml(column.kind)}</td><td>${escapeHtml(column.summary)}</td></tr>`).join('')}</tbody></table>`
    : '<p>The raw data is not loaded, so the variable summary is not included.</p>';
  return [
    '<!doctype html><html lang="en"><head><meta charset="utf-8">',
    `<title>${escapeHtml(input.title)}</title><style>${style}</style></head><body>`,
    `<h1>${escapeHtml(input.title)}</h1>`,
    `<p class="meta">Dataset: ${escapeHtml(input.dataset)}${input.rows !== null ? `, ${input.rows.toLocaleString('en-US')} rows` : ''} · ${escapeHtml(input.software)}${input.datasetSha256 ? ` · SHA-256 ${escapeHtml(input.datasetSha256)}` : ''} · ${escapeHtml(input.generatedAt)}</p>`,
    input.question ? `<p><strong>Research question:</strong> ${escapeHtml(input.question)}</p>` : '',
    '<h2>Dataset summary</h2>', summary,
    `<h2>Analyses (${input.results.length})</h2>`,
    input.results.length ? input.results.map(resultSection).join('') : '<p>No analyses were run.</p>',
    ...(input.reportHtml ? ['<h2>Results section</h2>', '<p class="meta">Written by AI from the calculated numbers above; check every number against the tables.</p>', `<div class="report">${input.reportHtml}</div>`] : []),
    '<p class="meta" style="margin-top:18pt">Statistics calculated in AI for Research Data Lab. The AI writes prose only; it never calculates or changes a number.</p>',
    '</body></html>',
  ].join('\n');
}

/** Prints the report from a hidden, script-free frame; the browser's print dialog saves it as PDF. */
export function printReport(html: string, title: string) {
  const frame = document.createElement('iframe');
  frame.setAttribute('sandbox', 'allow-same-origin allow-modals');
  frame.setAttribute('aria-hidden', 'true');
  frame.style.cssText = 'position:fixed;right:0;bottom:0;width:0;height:0;border:0;';
  frame.onload = () => {
    const tabTitle = document.title;
    document.title = title;
    try { frame.contentWindow?.focus(); frame.contentWindow?.print(); } finally {
      document.title = tabTitle;
      setTimeout(() => frame.remove(), 1000);
    }
  };
  frame.srcdoc = html;
  document.body.appendChild(frame);
}
