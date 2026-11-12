'use client';

/**
 * The citation map as a picture: years across, the seed papers on the middle line, what they
 * cite above (older, mostly left) and what cites them below (newer, mostly right). Circle size is
 * citations; a deterministic layout, so the same map always looks the same.
 */
export type GraphNode = { id: string; title: string; year: number | null; cited_by_count: number; inSet?: boolean };

const W = 900; const H = 420; const PAD = 30;

/** A stable 0–1 number from an id, for vertical spread. */
function spread(id: string) {
  let hash = 2166136261;
  for (let i = 0; i < id.length; i += 1) hash = Math.imul(hash ^ id.charCodeAt(i), 16777619);
  return ((hash >>> 0) % 1000) / 1000;
}

export function MapGraph({ seeds, references, citations, selected, onSelect }: {
  seeds: GraphNode[]; references: GraphNode[]; citations: GraphNode[]; selected: string | null; onSelect: (id: string) => void;
}) {
  const all = [...seeds, ...references, ...citations];
  const years = all.map((node) => node.year).filter((year): year is number => typeof year === 'number');
  if (!years.length) return null;
  const y0 = Math.min(...years) - 1; const y1 = Math.max(...years) + 1;
  const x = (year: number | null) => PAD + (((year ?? y1) - y0) / Math.max(1, y1 - y0)) * (W - PAD * 2);
  const maxCited = Math.max(1, ...all.map((node) => node.cited_by_count));
  const r = (node: GraphNode) => 4 + Math.sqrt(node.cited_by_count / maxCited) * 14;
  const mid = H / 2;
  const place = (node: GraphNode, band: 'up' | 'mid' | 'down', index: number) => ({
    node, cx: x(node.year), cy: band === 'mid' ? mid + (index - (seeds.length - 1) / 2) * 24 : band === 'up' ? PAD + spread(node.id) * (mid - PAD * 2.2) : mid + PAD * 1.4 + spread(node.id) * (mid - PAD * 2.4),
  });
  const placed = [
    ...references.map((node, index) => ({ ...place(node, 'up', index), band: 'up' as const })),
    ...citations.map((node, index) => ({ ...place(node, 'down', index), band: 'down' as const })),
  ];
  const seedPlaced = seeds.map((node, index) => place(node, 'mid', index));
  const ticks: number[] = [];
  const step = Math.max(1, Math.ceil((y1 - y0) / 8));
  for (let year = Math.ceil(y0 / step) * step; year <= y1; year += step) ticks.push(year);
  return (
    <svg viewBox={`0 0 ${W} ${H + 20}`} role="img" aria-label="Citation map: references above, citing papers below, years across" className="h-auto w-full">
      {ticks.map((year) => (
        <g key={year}>
          <line x1={x(year)} x2={x(year)} y1={PAD / 2} y2={H} stroke="var(--color-line-2)" />
          <text x={x(year)} y={H + 14} textAnchor="middle" fontSize="11" fill="var(--color-muted)">{year}</text>
        </g>
      ))}
      <text x={PAD} y={PAD / 2 + 4} fontSize="12" fill="var(--color-muted)">References (what the seed cites)</text>
      <text x={PAD} y={H - 4} fontSize="12" fill="var(--color-muted)">Citing papers</text>
      {placed.map(({ node, cx, cy }) => seedPlaced.slice(0, 3).map((seed) => (
        <line key={`${node.id}-${seed.node.id}`} x1={seed.cx} y1={seed.cy} x2={cx} y2={cy} stroke="var(--color-line)" strokeWidth={0.8} />
      )))}
      {[...placed, ...seedPlaced.map((item) => ({ ...item, band: 'mid' as const }))].map(({ node, cx, cy, band }) => {
        const on = selected === node.id;
        return (
          <g key={`${band}-${node.id}`} role="button" tabIndex={0} aria-label={`${node.title}${node.year ? `, ${node.year}` : ''}`} onClick={() => onSelect(node.id)} onKeyDown={(event) => { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); onSelect(node.id); } }} className="cursor-pointer outline-none">
            <circle cx={cx} cy={cy} r={band === 'mid' ? Math.max(9, r(node)) : r(node)}
              fill={band === 'mid' ? 'var(--color-accent)' : node.inSet ? 'var(--color-brand)' : 'var(--color-brand-100)'}
              stroke={on ? 'var(--color-ink)' : band === 'mid' ? 'var(--color-accent-600)' : 'var(--color-brand)'} strokeWidth={on ? 2.5 : 1} />
            <title>{`${node.title} (${node.year ?? 'n.d.'}) · ${node.cited_by_count.toLocaleString('en-US')} citations`}</title>
          </g>
        );
      })}
    </svg>
  );
}
