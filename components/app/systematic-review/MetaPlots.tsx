'use client';

/**
 * Forest and funnel plots for a meta-analysis, drawn as SVG from lib/metaAnalysis.ts results so
 * they can be saved as SVG or PNG (downloadSvg in Prisma.tsx). Fixed black on white, like the
 * PRISMA diagram: they go into papers.
 */
import { forwardRef } from 'react';
import { MEASURE_LABELS, Z95, formatEffect, formatInterval, formatPValue, isRatio, type Analysis, type InputRow, type Measure, type Pooled } from '@/lib/metaAnalysis';

const INK = '#1c1917';
const MUTED = '#57534e';
const FONT = 'Arial, Helvetica, sans-serif';
const ROW = 21;
const RATIO_TICKS = [0.01, 0.02, 0.05, 0.1, 0.2, 0.5, 1, 2, 5, 10, 20, 50, 100];

function clip(text: string, max: number) {
  return text.length > max ? `${text.slice(0, max - 1)}…` : text;
}

/** An axis over [lo, hi] on the analysis scale, with ticks labelled on the natural scale. */
function axis(values: number[], measure: Measure) {
  const ratio = isRatio(measure);
  const finite = values.filter(Number.isFinite);
  let lo = Math.min(0, ...finite);
  let hi = Math.max(0, ...finite);
  if (ratio) { lo = Math.max(lo, Math.log(0.01)); hi = Math.min(hi, Math.log(100)); }
  if (hi - lo < 1e-9) { lo -= 1; hi += 1; }
  const pad = (hi - lo) * 0.05;
  lo -= pad; hi += pad;
  let ticks: number[];
  if (ratio) {
    let candidates = RATIO_TICKS.map(Math.log).filter((value) => value >= lo && value <= hi);
    if (candidates.length > 7) candidates = [0.01, 0.1, 1, 10, 100].map(Math.log).filter((value) => value >= lo && value <= hi);
    if (candidates.length < 3) candidates = [...new Set([...candidates, 0])];
    ticks = candidates;
  } else {
    const raw = (hi - lo) / 5;
    const power = 10 ** Math.floor(Math.log10(raw));
    const step = [1, 2, 2.5, 5, 10].map((m) => m * power).find((value) => value >= raw) ?? raw;
    ticks = [];
    for (let value = Math.ceil(lo / step) * step; value <= hi + 1e-12; value += step) ticks.push(Math.abs(value) < step / 1e6 ? 0 : value);
  }
  const label = (value: number) => {
    if (!ratio) return Number(value.toPrecision(6)).toString();
    const shown = Math.exp(value);
    return shown >= 1 ? String(Math.round(shown)) : String(Number(shown.toPrecision(2)));
  };
  return { lo, hi, ticks, label };
}

type Line = { kind: 'group'; name: string } | { kind: 'study'; index: number } | { kind: 'pooled'; name: string; pooled: Pooled; bold: boolean } | { kind: 'prediction'; pooled: Pooled } | { kind: 'note'; text: string };

export const ForestPlot = forwardRef<SVGSVGElement, { analysis: Analysis; rows: InputRow[]; outcome: string; favours: { left: string; right: string }; arms?: [string, string] }>(function ForestPlot({ analysis, rows, outcome, favours, arms = ['Intervention', 'Comparison'] }, ref) {
  const { setup, studies, pooled } = analysis;
  const m = setup.measure;
  const byIndex = new Map(studies.map((study, at) => [study.index, { study, weight: pooled?.weights[at] ?? 0 }]));
  const armColumns = setup.data_type === 'generic' ? 0 : 2;
  const armWidth = setup.data_type === 'continuous' ? 128 : 84;
  const labelX = 12;
  const armX = 250;
  const plotX = armX + armColumns * armWidth + 16;
  const plotW = 300;
  const weightX = plotX + plotW + 64;
  const effectX = weightX + 14;
  const W = effectX + 170;

  const lines: Line[] = [];
  if (analysis.subgroups) {
    for (const group of analysis.subgroups.groups) {
      lines.push({ kind: 'group', name: group.name });
      for (const index of group.studies) lines.push({ kind: 'study', index });
      lines.push({ kind: 'pooled', name: `Subtotal${group.pooled.k > 1 ? ` (I² = ${group.pooled.I2.toFixed(0)}%)` : ''}`, pooled: group.pooled, bold: false });
    }
  } else {
    for (const study of studies) lines.push({ kind: 'study', index: study.index });
  }
  if (pooled) {
    lines.push({ kind: 'pooled', name: `Total (${pooled.model === 'fixed' ? 'fixed effect' : 'random effects'}, ${pooled.method}${pooled.hksj ? ', HKSJ' : ''})`, pooled, bold: true });
    if (pooled.prediction) lines.push({ kind: 'prediction', pooled });
  }

  const values = [
    ...studies.flatMap((study) => [study.yi - Z95 * study.se, study.yi + Z95 * study.se]),
    ...(pooled ? [pooled.lower, pooled.upper, ...(pooled.prediction ?? [])] : []),
    ...(analysis.subgroups?.groups.flatMap((group) => [group.pooled.lower, group.pooled.upper]) ?? []),
  ];
  const scale = axis(values, m);
  const x = (value: number) => plotX + ((Math.min(scale.hi, Math.max(scale.lo, value)) - scale.lo) / (scale.hi - scale.lo)) * plotW;
  const top = 58;
  const bodyEnd = top + lines.length * ROW;
  const axisY = bodyEnd + 6;
  const notes: string[] = [];
  if (pooled && pooled.k > 1) notes.push(`Heterogeneity: ${pooled.model === 'random' ? `tau² = ${pooled.tau2.toFixed(pooled.tau2 < 0.01 ? 4 : 2)}; ` : ''}Q = ${pooled.Q.toFixed(2)}, df = ${pooled.df} (${formatPValue(pooled.pQ)}); I² = ${pooled.I2.toFixed(0)}%`);
  if (pooled) notes.push(`Test for overall effect: ${pooled.df_test ? `t(${pooled.df_test})` : 'z'} = ${pooled.statistic.toFixed(2)} (${formatPValue(pooled.p)})`);
  if (analysis.subgroups) notes.push(`Test for subgroup differences: Q = ${analysis.subgroups.Q.toFixed(2)}, df = ${analysis.subgroups.df} (${formatPValue(analysis.subgroups.p)})`);
  if (analysis.excluded.some((item) => item.reason.includes('arm'))) notes.push('Studies with no events (or all events) in both arms are not estimable for a ratio and are left out.');
  const notesY = axisY + 56;
  const H = notesY + notes.length * 17 + 12;

  const ciLine = (lower: number, upper: number, y: number) => (
    <g>
      <line x1={x(lower)} x2={x(upper)} y1={y} y2={y} stroke={INK} strokeWidth="1.2" />
      {lower < scale.lo && <path d={`M${plotX} ${y} l6 -4 v8z`} fill={INK} />}
      {upper > scale.hi && <path d={`M${plotX + plotW} ${y} l-6 -4 v8z`} fill={INK} />}
    </g>
  );
  const arm = (index: number, which: 1 | 2) => {
    const row = rows[index];
    if (!row) return '';
    const n = which === 1 ? row.n1 : row.n2;
    if (setup.data_type === 'binary') return `${which === 1 ? row.e1 : row.e2}/${n}`;
    const shown = (value: number | null | undefined) => (value === null || value === undefined ? '' : Number(value.toPrecision(4)).toString());
    return `${shown(which === 1 ? row.m1 : row.m2)} (${shown(which === 1 ? row.sd1 : row.sd2)}), ${n}`;
  };

  return (
    <svg ref={ref} xmlns="http://www.w3.org/2000/svg" viewBox={`0 0 ${W} ${H}`} width="100%" role="img" aria-label={`Forest plot: ${outcome}`} style={{ background: '#ffffff', fontFamily: FONT }}>
      <rect width={W} height={H} fill="#ffffff" />
      <text x={labelX} y={22} fontSize="14" fontWeight="700" fill={INK}>{clip(outcome || 'Outcome', 90)}</text>
      <text x={labelX} y={top - 10} fontSize="12" fontWeight="700" fill={INK}>Study</text>
      {armColumns > 0 && arms.map((name, at) => (
        <g key={name}>
          <text x={armX + at * armWidth + armWidth / 2} y={top - 24} fontSize="12" fontWeight="700" fill={INK} textAnchor="middle">{clip(name, 16)}</text>
          <text x={armX + at * armWidth + armWidth / 2} y={top - 10} fontSize="11" fill={MUTED} textAnchor="middle">{setup.data_type === 'binary' ? 'Events/Total' : 'Mean (SD), n'}</text>
        </g>
      ))}
      <text x={plotX + plotW / 2} y={top - 10} fontSize="12" fontWeight="700" fill={INK} textAnchor="middle">{MEASURE_LABELS[m].replace(/ \(.*\)$/, '')} (95% CI)</text>
      <text x={weightX} y={top - 10} fontSize="12" fontWeight="700" fill={INK} textAnchor="end">Weight</text>
      <text x={effectX} y={top - 10} fontSize="12" fontWeight="700" fill={INK}>{m === 'SMD' ? 'SMD' : m === 'GEN' ? 'Estimate' : m} [95% CI]</text>
      <line x1={labelX} x2={W - 12} y1={top - 4} y2={top - 4} stroke={INK} strokeWidth="0.8" />
      <line x1={x(0)} x2={x(0)} y1={top - 2} y2={bodyEnd} stroke={INK} strokeWidth="1" />
      {pooled && <line x1={x(pooled.estimate)} x2={x(pooled.estimate)} y1={top - 2} y2={bodyEnd} stroke={MUTED} strokeWidth="0.8" strokeDasharray="3 3" />}

      {lines.map((line, at) => {
        const y = top + at * ROW + ROW / 2;
        if (line.kind === 'group') return <text key={at} x={labelX} y={y + 4} fontSize="12" fontWeight="700" fill={INK}>{clip(line.name, 40)}</text>;
        if (line.kind === 'note') return <text key={at} x={labelX} y={y + 4} fontSize="11" fill={MUTED}>{line.text}</text>;
        if (line.kind === 'study') {
          const item = byIndex.get(line.index);
          if (!item) return null;
          const { study, weight } = item;
          const lower = study.yi - Z95 * study.se;
          const upper = study.yi + Z95 * study.se;
          const half = Math.max(2, Math.min(8, 8 * Math.sqrt(weight / Math.max(...(pooled?.weights ?? [weight]), 1e-9))));
          return (
            <g key={at}>
              <text x={labelX + (analysis.subgroups ? 10 : 0)} y={y + 4} fontSize="12" fill={INK}>{clip(study.label, analysis.subgroups ? 32 : 34)}</text>
              {armColumns > 0 && ([1, 2] as const).map((which) => <text key={which} x={armX + (which - 1) * armWidth + armWidth / 2} y={y + 4} fontSize="11.5" fill={INK} textAnchor="middle">{arm(line.index, which)}</text>)}
              {ciLine(lower, upper, y)}
              {study.yi >= scale.lo && study.yi <= scale.hi && <rect x={x(study.yi) - half} y={y - half} width={half * 2} height={half * 2} fill="#475569" />}
              <text x={weightX} y={y + 4} fontSize="11.5" fill={INK} textAnchor="end">{weight.toFixed(1)}%</text>
              <text x={effectX} y={y + 4} fontSize="11.5" fill={INK}>{formatEffect(study.yi, m)} [{formatEffect(lower, m)}, {formatEffect(upper, m)}]</text>
            </g>
          );
        }
        if (line.kind === 'pooled') {
          const p = line.pooled;
          const points = `${x(p.lower)},${y} ${x(p.estimate)},${y - 6} ${x(p.upper)},${y} ${x(p.estimate)},${y + 6}`;
          return (
            <g key={at}>
              <text x={labelX} y={y + 4} fontSize="12" fontWeight={line.bold ? 700 : 400} fill={INK}>{clip(line.name, 44)}</text>
              <polygon points={points} fill={line.bold ? INK : '#ffffff'} stroke={INK} strokeWidth="1.2" />
              <text x={weightX} y={y + 4} fontSize="11.5" fontWeight={line.bold ? 700 : 400} fill={INK} textAnchor="end">{line.bold ? '100%' : ''}</text>
              <text x={effectX} y={y + 4} fontSize="11.5" fontWeight={line.bold ? 700 : 400} fill={INK}>{formatEffect(p.estimate, m)} [{formatEffect(p.lower, m)}, {formatEffect(p.upper, m)}]</text>
            </g>
          );
        }
        const [lo, hi] = line.pooled.prediction!;
        return (
          <g key={at}>
            <text x={labelX} y={y + 4} fontSize="12" fill={INK}>95% prediction interval</text>
            {ciLine(lo, hi, y)}
            <line x1={x(lo)} x2={x(lo)} y1={y - 4} y2={y + 4} stroke={INK} strokeWidth="1.2" />
            <line x1={x(hi)} x2={x(hi)} y1={y - 4} y2={y + 4} stroke={INK} strokeWidth="1.2" />
            <text x={effectX} y={y + 4} fontSize="11.5" fill={INK}>[{formatInterval(lo, hi, m).replace(' to ', ', ')}]</text>
          </g>
        );
      })}

      <line x1={plotX} x2={plotX + plotW} y1={axisY} y2={axisY} stroke={INK} strokeWidth="1" />
      {scale.ticks.map((tick) => (
        <g key={tick}>
          <line x1={x(tick)} x2={x(tick)} y1={axisY} y2={axisY + 5} stroke={INK} strokeWidth="1" />
          <text x={x(tick)} y={axisY + 18} fontSize="11" fill={INK} textAnchor="middle">{scale.label(tick)}</text>
        </g>
      ))}
      <text x={x(0) - 6} y={axisY + 36} fontSize="11.5" fill={INK} textAnchor="end">{clip(favours.left, 40)}</text>
      <text x={x(0) + 6} y={axisY + 36} fontSize="11.5" fill={INK}>{clip(favours.right, 40)}</text>
      {notes.map((note, at) => <text key={at} x={labelX} y={notesY + at * 17} fontSize="11.5" fill={MUTED}>{note}</text>)}
    </svg>
  );
});

export const FunnelPlot = forwardRef<SVGSVGElement, { analysis: Analysis; outcome: string }>(function FunnelPlot({ analysis, outcome }, ref) {
  const funnel = analysis.funnel;
  const m = analysis.setup.measure;
  const W = 600;
  const H = 420;
  const left = 64; const right = 20; const top = 40; const bottom = 56;
  if (!funnel) return null;
  const maxSe = (funnel.maxSe || 1) * 1.08;
  const scale = axis([...funnel.points.map((point) => point.yi), funnel.centre - Z95 * maxSe, funnel.centre + Z95 * maxSe], m);
  const x = (value: number) => left + ((Math.min(scale.hi, Math.max(scale.lo, value)) - scale.lo) / (scale.hi - scale.lo)) * (W - left - right);
  const y = (se: number) => top + (se / maxSe) * (H - top - bottom);
  const raw = maxSe / 4;
  const power = 10 ** Math.floor(Math.log10(raw));
  const step = [1, 2, 2.5, 5, 10].map((k) => k * power).find((value) => value >= raw) ?? raw;
  const seTicks: number[] = [];
  for (let value = 0; value <= maxSe + 1e-12; value += step) seTicks.push(value);
  return (
    <svg ref={ref} xmlns="http://www.w3.org/2000/svg" viewBox={`0 0 ${W} ${H}`} width="100%" role="img" aria-label={`Funnel plot: ${outcome}`} style={{ background: '#ffffff', fontFamily: FONT }}>
      <rect width={W} height={H} fill="#ffffff" />
      <text x={left} y={22} fontSize="14" fontWeight="700" fill={INK}>{clip(`Funnel plot: ${outcome || 'Outcome'}`, 70)}</text>
      <polygon points={`${x(funnel.centre)},${y(0)} ${x(funnel.centre - Z95 * maxSe)},${y(maxSe)} ${x(funnel.centre + Z95 * maxSe)},${y(maxSe)}`} fill="#f5f5f4" stroke={MUTED} strokeWidth="1" strokeDasharray="4 3" />
      <line x1={x(funnel.centre)} x2={x(funnel.centre)} y1={y(0)} y2={y(maxSe)} stroke={INK} strokeWidth="1" />
      {funnel.points.map((point) => <circle key={point.index} cx={x(point.yi)} cy={y(point.se)} r="4.5" fill="#ffffff" stroke={INK} strokeWidth="1.4"><title>{`${point.label}: ${formatEffect(point.yi, m)}`}</title></circle>)}
      <line x1={left} x2={W - right} y1={H - bottom} y2={H - bottom} stroke={INK} />
      <line x1={left} x2={left} y1={top} y2={H - bottom} stroke={INK} />
      {scale.ticks.map((tick) => (
        <g key={tick}>
          <line x1={x(tick)} x2={x(tick)} y1={H - bottom} y2={H - bottom + 5} stroke={INK} />
          <text x={x(tick)} y={H - bottom + 18} fontSize="11" fill={INK} textAnchor="middle">{scale.label(tick)}</text>
        </g>
      ))}
      {seTicks.map((tick) => (
        <g key={tick}>
          <line x1={left - 5} x2={left} y1={y(tick)} y2={y(tick)} stroke={INK} />
          <text x={left - 8} y={y(tick) + 4} fontSize="11" fill={INK} textAnchor="end">{Number(tick.toPrecision(3))}</text>
        </g>
      ))}
      <text x={(left + W - right) / 2} y={H - 14} fontSize="12" fill={INK} textAnchor="middle">{MEASURE_LABELS[m].replace(/ \(.*\)$/, '')}{isRatio(m) ? ' (log scale)' : ''}</text>
      <text x={16} y={(top + H - bottom) / 2} fontSize="12" fill={INK} textAnchor="middle" transform={`rotate(-90 16 ${(top + H - bottom) / 2})`}>Standard error</text>
    </svg>
  );
});
