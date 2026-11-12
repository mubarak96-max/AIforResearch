/**
 * A word-level difference between two paragraphs, for the Improve document view: which words
 * were kept, removed or added. Longest common subsequence over words; paragraphs are short, so
 * the quadratic table is small. Pure, for tests.
 */
export type DiffPart = { kind: 'same' | 'removed' | 'added'; text: string };

export function wordDiff(before: string, after: string): DiffPart[] {
  const a = before.split(/(\s+)/).filter(Boolean);
  const b = after.split(/(\s+)/).filter(Boolean);
  // Very long paragraphs: show them as replaced rather than build a huge table.
  if (a.length * b.length > 400_000) return [{ kind: 'removed', text: before }, { kind: 'added', text: after }];
  const table: number[][] = Array.from({ length: a.length + 1 }, () => new Array(b.length + 1).fill(0));
  for (let i = a.length - 1; i >= 0; i -= 1) {
    for (let j = b.length - 1; j >= 0; j -= 1) table[i][j] = a[i] === b[j] ? table[i + 1][j + 1] + 1 : Math.max(table[i + 1][j], table[i][j + 1]);
  }
  const parts: DiffPart[] = [];
  const push = (kind: DiffPart['kind'], text: string) => {
    const previous = parts[parts.length - 1];
    if (previous?.kind === kind) previous.text += text;
    else parts.push({ kind, text });
  };
  let i = 0;
  let j = 0;
  while (i < a.length && j < b.length) {
    if (a[i] === b[j]) { push('same', a[i]); i += 1; j += 1; }
    else if (table[i + 1][j] >= table[i][j + 1]) { push('removed', a[i]); i += 1; }
    else { push('added', b[j]); j += 1; }
  }
  while (i < a.length) push('removed', a[i++]);
  while (j < b.length) push('added', b[j++]);
  return parts;
}
