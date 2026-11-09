import { Fragment, type ReactNode } from 'react';

/**
 * Citation markup: *italic*, **bold**, ^^small caps^^. Everything else is plain text, so a
 * citation can be shown exactly as it should be typed.
 */
export function Formatted({ text }: { text: string }) {
  const parts: ReactNode[] = [];
  const pattern = /\*\*([^*]+)\*\*|\*([^*]+)\*|\^\^([^^]+)\^\^/g;
  let last = 0;
  let match: RegExpExecArray | null;
  while ((match = pattern.exec(text))) {
    if (match.index > last) parts.push(text.slice(last, match.index));
    if (match[1] !== undefined) parts.push(<strong key={match.index}>{match[1]}</strong>);
    else if (match[2] !== undefined) parts.push(<em key={match.index}>{match[2]}</em>);
    else parts.push(<span key={match.index} style={{ fontVariant: 'small-caps' }}>{match[3]}</span>);
    last = match.index + match[0].length;
  }
  if (last < text.length) parts.push(text.slice(last));
  return <>{parts.map((part, index) => <Fragment key={index}>{part}</Fragment>)}</>;
}

/** Citation markup without the marks, for meta tags and structured data. */
export function plainCitation(text: string) {
  return text.replace(/\*\*([^*]+)\*\*|\*([^*]+)\*|\^\^([^^]+)\^\^/g, (_, a, b, c) => a ?? b ?? c);
}
