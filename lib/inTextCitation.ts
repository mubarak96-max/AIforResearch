/**
 * In-text citations for the in-text citation generator (/tools/in-text-citation-generator).
 * Pure functions, no DOM: authors, year and an optional page or paragraph in; the parenthetical
 * and narrative forms out, with each style's et al. threshold, "&" or "and", n.d. and a/b suffixes.
 */

export type InTextStyle = 'apa' | 'mla' | 'chicago' | 'harvard' | 'numeric';

export const IN_TEXT_STYLES: { id: InTextStyle; name: string }[] = [
  { id: 'apa', name: 'APA 7' },
  { id: 'mla', name: 'MLA 9' },
  { id: 'chicago', name: 'Chicago author-date (17th ed.)' },
  { id: 'harvard', name: 'Harvard (Cite Them Right)' },
  { id: 'numeric', name: 'Numeric (IEEE-style)' },
];

export type InTextInput = {
  /** One author per entry: "Smith, J.", "Jane Smith", "Smith" or, for a group, the full name. */
  authors: string[];
  /** Every author is an organisation: names are used exactly as typed. */
  group?: boolean;
  /** APA: an abbreviation for a group author, shown in brackets the first time. */
  groupAbbr?: string;
  /** True for the first citation of a group author with an abbreviation (APA). */
  first?: boolean;
  /** "2020", or empty for no date. */
  year?: string;
  /** "a", "b"… for two works by the same author(s) in the same year. */
  suffix?: string;
  /** Page or paragraph. */
  locator?: { type: 'page' | 'paragraph'; value: string };
  /** MLA: a short title, used to tell two works by the same author apart. */
  shortTitle?: string;
  /** Numeric styles: the reference number. */
  number?: number;
};

export type InTextResult = { parenthetical: string; narrative: string; notes: string[] };

/** The name used in the text: the family name of a person, the full name of a group. */
export function surname(raw: string, group = false): string {
  const name = raw.trim().replace(/\s+/g, ' ');
  if (!name) return '';
  if (group) return name;
  if (name.includes(',')) return name.split(',')[0].trim();
  const parts = name.split(' ').filter((part) => !/^[A-Z]\.?$/.test(part) && !/^([A-Z]\.){2,}$/.test(part));
  return (parts.length ? parts : name.split(' ')).slice(-1)[0];
}

/** How many names a style lists before it switches to "et al.", and the word between the last two. */
const RULES: Record<InTextStyle, { maxListed: number; parenAnd: string; narrAnd: string; serialComma: boolean }> = {
  // APA 7: one or two authors in full, three or more "et al." from the first citation; "&" inside parentheses.
  apa: { maxListed: 2, parenAnd: '&', narrAnd: 'and', serialComma: false },
  // MLA 9: one or two authors; three or more "et al."
  mla: { maxListed: 2, parenAnd: 'and', narrAnd: 'and', serialComma: false },
  // Chicago 17 author-date: up to three authors; four or more "et al."
  chicago: { maxListed: 3, parenAnd: 'and', narrAnd: 'and', serialComma: true },
  // Cite Them Right Harvard: up to three authors; four or more "et al."
  harvard: { maxListed: 3, parenAnd: 'and', narrAnd: 'and', serialComma: false },
  // IEEE-style numeric: names only in the sentence; three or more "et al."
  numeric: { maxListed: 2, parenAnd: 'and', narrAnd: 'and', serialComma: false },
};

/** The author part of a citation in a style: "Smith & Jones", "Smith, Jones, and Lee", "Smith et al." */
export function authorPart(style: InTextStyle, names: string[], mode: 'parenthetical' | 'narrative'): string {
  const list = names.map((name) => name.trim()).filter(Boolean);
  if (!list.length) return '';
  const rule = RULES[style];
  if (list.length > rule.maxListed) return `${list[0]} et al.`;
  if (list.length === 1) return list[0];
  const and = mode === 'parenthetical' ? rule.parenAnd : rule.narrAnd;
  if (list.length === 2) return `${list[0]} ${and} ${list[1]}`;
  return `${list.slice(0, -1).join(', ')}${rule.serialComma ? ',' : ''} ${and} ${list[list.length - 1]}`;
}

const dash = (value: string) => value.trim().replace(/\s*(?:-{1,2}|–|—)\s*/g, '–');
const isRange = (value: string) => /[–,-]/.test(value) || /\s(?:and|&)\s/.test(value);

/** The year with its suffix, or the style's "no date" form. */
function dateLabel(style: InTextStyle, year: string, suffix: string): string {
  const clean = year.trim();
  if (clean) return `${clean}${suffix}`;
  if (style === 'harvard') return suffix ? `no date ${suffix}` : 'no date';
  return suffix ? `n.d.-${suffix}` : 'n.d.';
}

function locatorLabel(style: InTextStyle, locator: InTextInput['locator']): string {
  const value = locator?.value ? dash(locator.value) : '';
  if (!value || !locator) return '';
  if (locator.type === 'paragraph') return style === 'mla' ? `par. ${value}` : `para. ${value}`;
  if (style === 'mla' || style === 'chicago') return value;
  return `${isRange(value) ? 'pp.' : 'p.'} ${value}`;
}

export function inTextCitation(style: InTextStyle, input: InTextInput): InTextResult {
  const notes: string[] = [];
  const names = input.authors.map((author) => surname(author, input.group)).filter(Boolean);
  const suffix = (input.suffix || '').trim().toLowerCase();
  const year = (input.year || '').trim();
  const locator = locatorLabel(style, input.locator);

  // APA group author with an abbreviation: "World Health Organization [WHO], 2020" the first time, "WHO" after.
  const abbr = input.group && input.groupAbbr?.trim();
  let parenNames = names;
  let narrNames = names;
  if (style === 'apa' && abbr && names.length === 1) {
    parenNames = [input.first ? `${names[0]} [${abbr}]` : abbr];
    narrNames = [input.first ? `${names[0]} (${abbr})` : abbr];
  }
  const paren = authorPart(style, parenNames, 'parenthetical');
  const narr = authorPart(style, narrNames, 'narrative');
  const who = paren || 'Title of the work';
  if (!paren) notes.push('With no author, use the first few words of the title, in quotation marks or italics as the style requires.');

  const date = dateLabel(style, year, suffix);
  if (names.length > RULES[style].maxListed && style !== 'numeric') notes.push(`${names.length} authors: ${IN_TEXT_STYLES.find((s) => s.id === style)!.name} shortens to the first author and "et al." in the text.`);

  switch (style) {
    case 'apa':
    case 'harvard': {
      const tail = [date, locator].filter(Boolean).join(', ');
      const parenthetical = `(${who}, ${tail})`;
      let narrative = `${narr || who} (${date})`;
      if (locator) narrative = style === 'apa' ? `${narrative} … (${locator})` : `${narr || who} (${tail})`;
      if (style === 'apa' && locator) notes.push('APA: in a narrative citation, put the page or paragraph in parentheses after the quotation.');
      return { parenthetical, narrative, notes };
    }
    case 'chicago': {
      const head = year ? `${who} ${date}` : `${who}, ${date}`;
      const parenthetical = `(${[head, locator].filter(Boolean).join(', ')})`;
      const narrative = `${narr || who} (${[date, locator].filter(Boolean).join(', ')})`;
      return { parenthetical, narrative, notes };
    }
    case 'mla': {
      const title = input.shortTitle?.trim();
      if (suffix && !title) notes.push('MLA does not use a, b after the year. To tell two works by the same author apart, add a short title.');
      // "(Smith 12)", "(Smith, par. 4)", "(Smith, Short Title 12)": a comma before "par." but not before a page.
      const sep = input.locator?.type === 'paragraph' ? ', ' : ' ';
      const head = title ? `${who}, ${title}` : who;
      const parenthetical = `(${head}${locator ? `${sep}${locator}` : ''})`;
      const inProse = narr || who;
      const narrative = title
        ? `${inProse}, in ${title},${locator ? ` … (${locator})` : ''}`
        : `${inProse}${locator ? ` … (${locator})` : ''}`;
      if (!year) notes.push('MLA in-text citations do not include the year, so a missing date does not change them.');
      return { parenthetical, narrative, notes };
    }
    case 'numeric': {
      const n = input.number && input.number > 0 ? Math.floor(input.number) : 1;
      const ref = `[${n}${locator ? `, ${locator}` : ''}]`;
      return { parenthetical: ref, narrative: `${narr || who} ${ref}`, notes: ['Numeric styles number sources in the order you first cite them. Use the same number every time you cite that source.'] };
    }
  }
}

/** Every style at once, for the results table. */
export function allInTextCitations(input: InTextInput): { style: InTextStyle; name: string; result: InTextResult }[] {
  return IN_TEXT_STYLES.map(({ id, name }) => ({ style: id, name, result: inTextCitation(id, input) }));
}
