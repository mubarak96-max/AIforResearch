/**
 * Builds the binary sample files from the Markdown and seeds in this folder:
 *   reviewer/*.docx and reviewer/*.pdf   from reviewer/*.md (Word and PDF upload tests)
 *   data-lab/green-space-wellbeing-survey.csv   a simulated survey (seeded, so it is the same every run)
 *
 * Run from the repository root: node samples/build.mjs
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { Document, HeadingLevel, Packer, Paragraph, Table, TableCell, TableRow, TextRun, WidthType } from 'docx';
import { PDFDocument, StandardFonts, rgb } from 'pdf-lib';

const here = dirname(fileURLToPath(import.meta.url));

// ------------------------------------------------------------------ Markdown, simply

/** Lines of a small Markdown subset: headings, paragraphs, list items, tables. */
function blocks(markdown) {
  const out = [];
  let paragraph = [];
  let table = null;
  const flush = () => {
    if (paragraph.length) out.push({ type: 'p', text: paragraph.join(' ') });
    paragraph = [];
    if (table) out.push(table);
    table = null;
  };
  for (const raw of markdown.split(/\r?\n/)) {
    const line = raw.trimEnd();
    if (!line.trim()) { flush(); continue; }
    const heading = line.match(/^(#{1,4})\s+(.*)$/);
    if (heading) { flush(); out.push({ type: 'h', level: heading[1].length, text: heading[2] }); continue; }
    if (/^\|/.test(line)) {
      if (paragraph.length) { out.push({ type: 'p', text: paragraph.join(' ') }); paragraph = []; }
      if (/^\|[\s:|-]+\|$/.test(line)) continue;
      table ??= { type: 'table', rows: [] };
      table.rows.push(line.split('|').slice(1, -1).map((cell) => cell.trim()));
      continue;
    }
    const item = line.match(/^(\d+\.|-)\s+(.*)$/);
    if (item) { flush(); out.push({ type: 'li', marker: item[1] === '-' ? '•' : item[1], text: item[2] }); continue; }
    paragraph.push(line.trim());
  }
  flush();
  return out;
}

/** **bold** and *italic* runs. */
function runs(text) {
  const parts = [];
  const pattern = /(\*\*[^*]+\*\*|\*[^*]+\*)/g;
  let last = 0;
  for (const match of text.matchAll(pattern)) {
    if (match.index > last) parts.push({ text: text.slice(last, match.index) });
    const token = match[0];
    parts.push(token.startsWith('**') ? { text: token.slice(2, -2), bold: true } : { text: token.slice(1, -1), italics: true });
    last = match.index + token.length;
  }
  if (last < text.length) parts.push({ text: text.slice(last) });
  return parts;
}
const plain = (text) => runs(text).map((part) => part.text).join('');

// ------------------------------------------------------------------ Word

async function toDocx(markdown, file) {
  const levels = [HeadingLevel.TITLE, HeadingLevel.HEADING_1, HeadingLevel.HEADING_2, HeadingLevel.HEADING_3];
  const children = [];
  for (const block of blocks(markdown)) {
    if (block.type === 'h') children.push(new Paragraph({ heading: levels[block.level - 1], children: runs(block.text).map((part) => new TextRun(part)) }));
    else if (block.type === 'li') children.push(new Paragraph({ children: [new TextRun(`${block.marker} `), ...runs(block.text).map((part) => new TextRun(part))], indent: { left: 360 } }));
    else if (block.type === 'table') {
      children.push(new Table({
        width: { size: 100, type: WidthType.PERCENTAGE },
        rows: block.rows.map((row, index) => new TableRow({ children: row.map((cell) => new TableCell({ children: [new Paragraph({ children: runs(cell).map((part) => new TextRun({ ...part, bold: part.bold || index === 0 })) })] })) })),
      }));
    } else children.push(new Paragraph({ children: runs(block.text).map((part) => new TextRun(part)), spacing: { after: 160 } }));
  }
  const doc = new Document({ styles: { default: { document: { run: { font: 'Times New Roman', size: 24 } } } }, sections: [{ children }] });
  writeFileSync(file, await Packer.toBuffer(doc));
}

// ------------------------------------------------------------------ PDF

async function toPdf(markdown, file, title) {
  const pdf = await PDFDocument.create();
  pdf.setTitle(title);
  pdf.setAuthor('AI for Research sample');
  const regular = await pdf.embedFont(StandardFonts.TimesRoman);
  const bold = await pdf.embedFont(StandardFonts.TimesRomanBold);
  const width = 595;
  const height = 842;
  const margin = 64;
  let page = pdf.addPage([width, height]);
  let y = height - margin;
  let pageNumber = 1;
  const footer = () => page.drawText(String(pageNumber), { x: width / 2 - 4, y: 32, size: 10, font: regular, color: rgb(0.3, 0.3, 0.3) });
  const newPage = () => { footer(); page = pdf.addPage([width, height]); pageNumber += 1; y = height - margin; };
  // The standard PDF fonts cannot draw some characters; swap them for close ones.
  const safe = (text) => text.replace(/[–—]/g, '-').replace(/[‘’]/g, "'").replace(/[“”]/g, '"').replace(/…/g, '...').replace(/[^\x20-\x7E -ÿ]/g, '');
  const write = (text, { font = regular, size = 11.5, indent = 0, gap = 6 } = {}) => {
    const words = safe(text).split(/\s+/);
    let line = '';
    const lines = [];
    for (const word of words) {
      const next = line ? `${line} ${word}` : word;
      if (font.widthOfTextAtSize(next, size) > width - margin * 2 - indent) { lines.push(line); line = word; } else line = next;
    }
    if (line) lines.push(line);
    for (const text of lines) {
      if (y < margin + size) newPage();
      page.drawText(text, { x: margin + indent, y, size, font });
      y -= size * 1.45;
    }
    y -= gap;
  };
  for (const block of blocks(markdown)) {
    if (block.type === 'h') { y -= 6; write(plain(block.text), { font: bold, size: [18, 15, 13, 12][block.level - 1], gap: 4 }); }
    else if (block.type === 'li') write(`${block.marker} ${plain(block.text)}`, { indent: 14, gap: 2 });
    else if (block.type === 'table') for (const row of block.rows) write(row.map(plain).join('    |    '), { gap: 1, font: row === block.rows[0] ? bold : regular });
    else write(plain(block.text));
  }
  footer();
  writeFileSync(file, await pdf.save());
}

// ------------------------------------------------------------------ the simulated survey

/** A small seeded random generator (mulberry32), so the file is the same on every run. */
function random(seed) {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let value = state;
    value = Math.imul(value ^ (value >>> 15), value | 1);
    value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
    return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
  };
}

function survey() {
  const next = random(2027);
  const normal = () => Math.sqrt(-2 * Math.log(next() || 1e-9)) * Math.cos(2 * Math.PI * next());
  const clamp = (value, low, high) => Math.min(high, Math.max(low, value));
  const campuses = [{ name: 'Main', ndvi: 0.42 }, { name: 'Parklands', ndvi: 0.31 }, { name: 'Kikuyu', ndvi: 0.55 }];
  const rows = [['participant_id', 'campus', 'age', 'gender', 'year_of_study', 'ndvi_500m', 'park_visits_per_week', 'minutes_outdoors_per_week', 'commute_minutes', 'feels_safe_in_parks', 'sleep_hours', 'wellbeing_wemwbs', 'stress_pss10']];
  for (let index = 1; index <= 240; index += 1) {
    const campus = campuses[Math.floor(next() * 3)];
    const gender = next() < 0.53 ? 'female' : next() < 0.97 ? 'male' : 'other';
    const year = 1 + Math.floor(next() * 4);
    const age = Math.round(clamp(18 + year + normal() * 1.4, 18, 34));
    const ndvi = clamp(campus.ndvi + normal() * 0.09, 0.05, 0.8);
    const safe = next() < 0.05 + ndvi * 1.2 ? 'yes' : 'no';
    const visits = Math.max(0, Math.round(0.6 + ndvi * 3 + (safe === 'yes' ? 1.1 : 0) + normal() * 1.1));
    const minutes = Math.max(0, Math.round(visits * (28 + normal() * 10) + normal() * 15));
    const commute = Math.max(5, Math.round(48 - ndvi * 20 + normal() * 18));
    const sleep = clamp(6.6 - commute / 120 + normal() * 0.9, 3.5, 9.5);
    // Planted relations: greener and more visits, better wellbeing; more commute, more stress; safety matters.
    const wellbeing = Math.round(clamp(38 + ndvi * 19 + visits * 0.9 + (safe === 'yes' ? 2 : 0) + (sleep - 6.5) * 1.6 + normal() * 6.5, 14, 70));
    const stress = Math.round(clamp(21 - ndvi * 9 - visits * 0.6 + commute / 18 + (gender === 'female' ? 3.2 : 0) - (sleep - 6.5) * 1.2 + normal() * 5, 0, 40));
    rows.push([`S${String(index).padStart(3, '0')}`, campus.name, age, gender, year, ndvi.toFixed(3), visits, minutes, commute, safe, sleep.toFixed(1), wellbeing, stress]);
  }
  // Two blanks, as in real survey data.
  rows[17][11] = '';
  rows[143][7] = '';
  return rows.map((row) => row.join(',')).join('\n') + '\n';
}

// ------------------------------------------------------------------ build

for (const name of ['thesis-chapter-2-sleep-memory', 'research-proposal-green-space-nairobi']) {
  const markdown = readFileSync(join(here, 'reviewer', `${name}.md`), 'utf8');
  await toDocx(markdown, join(here, 'reviewer', `${name}.docx`));
  await toPdf(markdown, join(here, 'reviewer', `${name}.pdf`), markdown.match(/^##\s+(.*)$/m)?.[1] ?? name);
  console.log(`reviewer/${name}.docx and .pdf`);
}
writeFileSync(join(here, 'data-lab', 'green-space-wellbeing-survey.csv'), survey());
console.log('data-lab/green-space-wellbeing-survey.csv');
