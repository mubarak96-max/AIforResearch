'use client';

/**
 * Small SVG charts for Landscape and Data Lab: one hue (the brand) per chart, 3–5 faint
 * gridlines, round ticks above the maximum, no chart library.
 */
import { useState } from 'react';
import { quantile } from '@/lib/stats';

const W = 640;

/** Round, even ticks from 0 to just above the maximum. */
export function niceTicks(max: number, count = 4): number[] {
  if (!(max > 0)) return [0, 1];
  const raw = max / count;
  const power = 10 ** Math.floor(Math.log10(raw));
  const step = [1, 2, 2.5, 5, 10].map((m) => m * power).find((value) => value >= raw) ?? raw;
  const top = Math.ceil(max / step) * step;
  const ticks: number[] = [];
  for (let value = 0; value <= top + step / 2; value += step) ticks.push(Number(value.toFixed(10)));
  return ticks;
}

const fmt = (value: number) => (Math.abs(value) >= 1000 ? value.toLocaleString('en-US', { maximumFractionDigits: 0 }) : String(Number(value.toFixed(2))));

/** Vertical bars (works per year, histogram bins). One or two series (the second in grey). */
export function Columns({ data, second, label, height = 220, secondLabel, firstLabel }: {
  data: { label: string; value: number }[]; second?: number[]; label: string; height?: number; firstLabel?: string; secondLabel?: string;
}) {
  const max = Math.max(1, ...data.map((item) => item.value), ...(second ?? []));
  const ticks = niceTicks(max);
  const top = ticks.at(-1)!;
  const left = 44; const bottom = 26; const plot = height - bottom - 8;
  const slot = (W - left - 4) / Math.max(1, data.length);
  const bar = Math.max(2, slot * (second ? 0.38 : 0.72));
  const every = Math.ceil(data.length / 8);
  return (
    <figure>
      <svg viewBox={`0 0 ${W} ${height}`} role="img" aria-label={label} className="h-auto w-full">
        {ticks.map((tick) => {
          const y = 8 + plot - (tick / top) * plot;
          return (
            <g key={tick}>
              <line x1={left} x2={W} y1={y} y2={y} stroke="var(--color-line)" strokeWidth={tick === 0 ? 1.5 : 1} />
              <text x={left - 6} y={y + 4} textAnchor="end" fontSize="11" fill="var(--color-muted)">{fmt(tick)}</text>
            </g>
          );
        })}
        {data.map((item, index) => {
          const x = left + index * slot + (slot - (second ? bar * 2 + 2 : bar)) / 2;
          const h = (item.value / top) * plot;
          const h2 = second ? ((second[index] ?? 0) / top) * plot : 0;
          return (
            <g key={item.label}>
              <rect x={x} y={8 + plot - h} width={bar} height={h} fill="var(--color-brand)"><title>{`${item.label}: ${item.value.toLocaleString('en-US')}`}</title></rect>
              {second && <rect x={x + bar + 2} y={8 + plot - h2} width={bar} height={h2} fill="var(--color-subtle)"><title>{`${item.label}: ${(second[index] ?? 0).toLocaleString('en-US')}`}</title></rect>}
              {index % every === 0 && <text x={left + index * slot + slot / 2} y={height - 8} textAnchor="middle" fontSize="11" fill="var(--color-muted)">{item.label}</text>}
            </g>
          );
        })}
      </svg>
      {second && (
        <figcaption className="mt-1 flex gap-4 text-[12.5px] text-muted">
          <span className="inline-flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-sm bg-brand" />{firstLabel}</span>
          <span className="inline-flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-sm bg-subtle" />{secondLabel}</span>
        </figcaption>
      )}
    </figure>
  );
}

/** A ranked list with a thin bar under each label (top topics, journals, authors). */
export function RankedList({ rows, total }: { rows: { label: string; count: number }[]; total?: number }) {
  const max = Math.max(1, ...rows.map((row) => row.count));
  return (
    <ol className="space-y-2.5">
      {rows.map((row, index) => (
        <li key={`${row.label}-${index}`}>
          <div className="flex items-baseline gap-3 text-[14px]">
            <span className="min-w-0 flex-1 truncate text-ink">{row.label}</span>
            <span className="shrink-0 tabular-nums text-muted">{row.count.toLocaleString('en-US')}{total ? ` · ${((row.count / total) * 100).toFixed(1)}%` : ''}</span>
          </div>
          <div className="mt-1 h-[3px] rounded-full bg-line-2"><div className={`h-full rounded-full ${index === 0 ? 'bg-brand' : 'bg-subtle'}`} style={{ width: `${(row.count / max) * 100}%` }} /></div>
        </li>
      ))}
    </ol>
  );
}

/** Equal-width bins (Sturges' rule) for a histogram. */
export function bins(values: number[]): { label: string; value: number }[] {
  if (!values.length) return [];
  const min = Math.min(...values); const max = Math.max(...values);
  const k = Math.max(1, Math.min(30, Math.ceil(Math.log2(values.length) + 1)));
  const width = (max - min) / k || 1;
  const counts = new Array(k).fill(0);
  for (const value of values) counts[Math.min(k - 1, Math.floor((value - min) / width))] += 1;
  return counts.map((count, index) => ({ label: fmt(min + index * width), value: count }));
}

/** One box per group: median, quartiles, whiskers to 1.5 IQR, outliers as dots. */
export function BoxPlot({ groups, label }: { groups: { name: string; values: number[] }[]; label: string }) {
  const all = groups.flatMap((group) => group.values);
  if (!all.length) return null;
  const min = Math.min(...all); const max = Math.max(...all);
  const pad = (max - min) * 0.05 || 1;
  const lo = min - pad; const hi = max + pad;
  const height = 60 + groups.length * 44;
  const left = 120;
  const x = (value: number) => left + ((value - lo) / (hi - lo)) * (W - left - 10);
  return (
    <svg viewBox={`0 0 ${W} ${height}`} role="img" aria-label={label} className="h-auto w-full">
      {groups.map((group, index) => {
        const sorted = [...group.values].sort((a, b) => a - b);
        if (!sorted.length) return null;
        const q1 = quantile(sorted, 0.25); const q3 = quantile(sorted, 0.75); const median = quantile(sorted, 0.5);
        const iqr = q3 - q1;
        const lowW = sorted.find((value) => value >= q1 - 1.5 * iqr) ?? sorted[0];
        const highW = [...sorted].reverse().find((value) => value <= q3 + 1.5 * iqr) ?? sorted.at(-1)!;
        const y = 20 + index * 44;
        return (
          <g key={group.name}>
            <text x={left - 10} y={y + 18} textAnchor="end" fontSize="12" fill="var(--color-ink-2)">{group.name.slice(0, 18)}</text>
            <line x1={x(lowW)} x2={x(highW)} y1={y + 14} y2={y + 14} stroke="var(--color-muted)" />
            <rect x={x(q1)} y={y + 2} width={Math.max(1, x(q3) - x(q1))} height={24} fill="var(--color-brand-50)" stroke="var(--color-brand)" />
            <line x1={x(median)} x2={x(median)} y1={y + 2} y2={y + 26} stroke="var(--color-brand)" strokeWidth={2.5} />
            {sorted.filter((value) => value < lowW || value > highW).map((value, at) => <circle key={at} cx={x(value)} cy={y + 14} r={3} fill="var(--color-muted)" />)}
          </g>
        );
      })}
      {niceTicks(hi - lo).map((tick) => lo + tick).filter((value) => value <= hi).map((value) => (
        <text key={value} x={x(value)} y={height - 8} textAnchor="middle" fontSize="11" fill="var(--color-muted)">{fmt(value)}</text>
      ))}
    </svg>
  );
}

/** Scatter of two numeric columns, with the least-squares line. */
export function Scatter({ x, y, label, names }: { x: (number | null)[]; y: (number | null)[]; label: string; names: [string, string] }) {
  const points = x.map((value, index) => [value, y[index]] as const).filter((point): point is readonly [number, number] => point[0] !== null && point[1] !== null).slice(0, 5000);
  if (points.length < 2) return null;
  const xs = points.map((point) => point[0]); const ys = points.map((point) => point[1]);
  const [x0, x1] = [Math.min(...xs), Math.max(...xs)]; const [y0, y1] = [Math.min(...ys), Math.max(...ys)];
  const height = 280; const left = 48; const bottom = 34;
  const px = (value: number) => left + ((value - x0) / (x1 - x0 || 1)) * (W - left - 12);
  const py = (value: number) => 8 + (1 - (value - y0) / (y1 - y0 || 1)) * (height - bottom - 8);
  const mx = xs.reduce((a, b) => a + b, 0) / xs.length; const my = ys.reduce((a, b) => a + b, 0) / ys.length;
  const sxx = xs.reduce((sum, value) => sum + (value - mx) ** 2, 0);
  const slope = sxx ? xs.reduce((sum, value, index) => sum + (value - mx) * (ys[index] - my), 0) / sxx : 0;
  const intercept = my - slope * mx;
  return (
    <svg viewBox={`0 0 ${W} ${height}`} role="img" aria-label={label} className="h-auto w-full">
      <line x1={left} x2={W} y1={height - bottom} y2={height - bottom} stroke="var(--color-line)" strokeWidth={1.5} />
      {points.map(([a, b], index) => <circle key={index} cx={px(a)} cy={py(b)} r={3} fill="var(--color-brand)" fillOpacity={0.55} />)}
      {sxx > 0 && <line x1={px(x0)} y1={py(intercept + slope * x0)} x2={px(x1)} y2={py(intercept + slope * x1)} stroke="var(--color-accent)" strokeWidth={2} />}
      <text x={(W + left) / 2} y={height - 6} textAnchor="middle" fontSize="12" fill="var(--color-muted)">{names[0]} ({fmt(x0)} to {fmt(x1)})</text>
      <text x={12} y={height / 2} textAnchor="middle" fontSize="12" fill="var(--color-muted)" transform={`rotate(-90 12 ${height / 2})`}>{names[1]}</text>
    </svg>
  );
}

const SERIES = Array.from({ length: 8 }, (_, i) => `var(--series-${i + 1})`);

/**
 * Survival curves (steps) or a ROC curve (lines, with the chance diagonal). Both axes run from 0;
 * the y axis from 0 to 1. A legend names every series; hovering shows each series' value.
 */
export function CurveChart({ chart, label }: { chart: { kind: 'survival' | 'roc'; x: string; y: string; series: { name: string; points: [number, number][] }[] }; label: string }) {
  const [hover, setHover] = useState<number | null>(null);
  const series = chart.series.slice(0, 8);
  const maxX = chart.kind === 'roc' ? 1 : Math.max(1e-9, ...series.flatMap((item) => item.points.map(([x]) => x)));
  const ticksX = chart.kind === 'roc' ? [0, 0.25, 0.5, 0.75, 1] : niceTicks(maxX);
  const topX = ticksX.at(-1)!;
  const height = 300; const left = 48; const bottom = 40; const right = 12;
  const px = (value: number) => left + (value / topX) * (W - left - right);
  const py = (value: number) => 8 + (1 - value) * (height - bottom - 8);
  const path = (points: [number, number][]) => points.map(([x, y], i) => {
    if (i === 0) return `M${px(x)},${py(y)}`;
    return chart.kind === 'survival' ? `H${px(x)}V${py(y)}` : `L${px(x)},${py(y)}`;
  }).join('');
  /** The value of a series at x: the last point at or before it. */
  const at = (points: [number, number][], x: number) => { let value = points[0]?.[1] ?? 0; for (const [px_, py_] of points) { if (px_ > x) break; value = py_; } return value; };
  const move = (event: React.MouseEvent<SVGSVGElement>) => {
    const box = event.currentTarget.getBoundingClientRect();
    const x = ((event.clientX - box.left) / box.width) * W;
    setHover(x < left ? null : Math.max(0, Math.min(topX, ((x - left) / (W - left - right)) * topX)));
  };
  return (
    <figure>
      {series.length > 1 && (
        <figcaption className="mb-2 flex flex-wrap gap-x-4 gap-y-1 text-[12.5px] text-ink-2">
          {series.map((item, i) => <span key={item.name} className="inline-flex items-center gap-1.5"><span className="inline-block h-0.5 w-4 rounded" style={{ background: SERIES[i] }} aria-hidden="true" />{item.name}</span>)}
        </figcaption>
      )}
      <div className="relative">
        <svg viewBox={`0 0 ${W} ${height}`} role="img" aria-label={label} className="h-auto w-full" onMouseMove={move} onMouseLeave={() => setHover(null)}>
          {[0, 0.25, 0.5, 0.75, 1].map((tick) => (
            <g key={tick}>
              <line x1={left} x2={W - right} y1={py(tick)} y2={py(tick)} stroke="var(--color-line-2)" />
              <text x={left - 6} y={py(tick) + 4} textAnchor="end" fontSize="11" fill="var(--color-muted)">{tick}</text>
            </g>
          ))}
          {ticksX.map((tick) => <text key={tick} x={px(tick)} y={height - bottom + 16} textAnchor="middle" fontSize="11" fill="var(--color-muted)">{fmt(tick)}</text>)}
          <line x1={left} x2={W - right} y1={py(0)} y2={py(0)} stroke="var(--color-line)" strokeWidth={1.5} />
          {chart.kind === 'roc' && <line x1={px(0)} y1={py(0)} x2={px(1)} y2={py(1)} stroke="var(--color-subtle)" strokeDasharray="4 4" />}
          {series.map((item, i) => <path key={item.name} d={path(item.points)} fill="none" stroke={SERIES[i]} strokeWidth={2} strokeLinejoin="round" />)}
          {hover !== null && <line x1={px(hover)} x2={px(hover)} y1={py(1)} y2={py(0)} stroke="var(--color-ink-3)" strokeDasharray="2 3" />}
          <text x={(W + left) / 2} y={height - 6} textAnchor="middle" fontSize="12" fill="var(--color-muted)">{chart.x}</text>
          <text x={12} y={(height - bottom) / 2} textAnchor="middle" fontSize="12" fill="var(--color-muted)" transform={`rotate(-90 12 ${(height - bottom) / 2})`}>{chart.y}</text>
        </svg>
        {hover !== null && (
          <div className="pointer-events-none absolute top-2 rounded-lg border border-line bg-surface px-2.5 py-1.5 text-[12.5px] shadow-sm" style={{ left: `${Math.min(70, (px(hover) / W) * 100)}%` }}>
            <p className="font-semibold text-ink">{chart.x}: {fmt(hover)}</p>
            {series.map((item, i) => <p key={item.name} className="flex items-center gap-1.5 text-ink-2"><span className="inline-block h-2 w-2 rounded-full" style={{ background: SERIES[i] }} aria-hidden="true" />{series.length > 1 ? `${item.name}: ` : ''}{at(item.points, hover).toFixed(2)}</p>)}
          </div>
        )}
      </div>
    </figure>
  );
}
