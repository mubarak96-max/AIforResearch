'use client';

/**
 * The figures in a Deep Research report, drawn with the app's own tokens (no chart library):
 * the flow of sources (PRISMA style), bar charts, stance-by-design bars and a forest plot.
 * Every number comes from the server's computed figure data (lib/server/lib/researchFigures.ts);
 * "Show data" opens the same numbers as a table.
 */
import { useState } from 'react';
import { LuArrowDown, LuArrowRight, LuTable2 } from 'react-icons/lu';
import {
  STANCE_LABELS, STANCE_ORDER, figureTable, formatEffect,
  type BarsData, type ForestData, type PrismaData, type ResearchFigure, type Stance, type StackedData,
} from '@/lib/server/lib/researchFigures';

export type { ResearchFigure } from '@/lib/server/lib/researchFigures';

const STANCE_COLOR: Record<Stance, string> = { supports: 'bg-green-600', mixed: 'bg-amber-400', against: 'bg-red-500', unclear: 'bg-line' };
const num = (value: number) => value.toLocaleString('en-US');

export function FigureView({ figure, onCite }: { figure: ResearchFigure | undefined; onCite?: (n: number) => void }) {
  const [table, setTable] = useState(false);
  if (!figure) return <div className="my-6 h-40 animate-pulse rounded-xl bg-soft" aria-label="Figure loading" />;
  return (
    <figure className="not-prose my-6 rounded-xl border border-line bg-surface px-4 py-3.5">
      <div className="flex items-start gap-3">
        <p className="min-w-0 flex-1 text-[14.5px] font-semibold leading-snug text-ink">{figure.title}</p>
        <button type="button" onClick={() => setTable(!table)} aria-pressed={table}
          className="inline-flex h-7 shrink-0 items-center gap-1 rounded-md px-2 text-[12.5px] font-semibold text-brand hover:bg-brand-50">
          <LuTable2 className="h-3.5 w-3.5" aria-hidden="true" />{table ? 'Show chart' : 'Show data'}
        </button>
      </div>
      <div className="mt-3">
        {table ? <DataTable figure={figure} /> : (
          figure.kind === 'prisma' ? <Prisma data={figure.data} />
            : figure.kind === 'bars' ? (figure.data.orientation === 'vertical' ? <ColumnChart data={figure.data} /> : <BarChart data={figure.data} />)
              : figure.kind === 'stacked' ? <StanceChart data={figure.data} />
                : <ForestPlot data={figure.data} onCite={onCite} />
        )}
      </div>
      <figcaption className="mt-3 text-[12.5px] leading-relaxed text-muted">{figure.caption}</figcaption>
    </figure>
  );
}

function DataTable({ figure }: { figure: ResearchFigure }) {
  const { head, rows } = figureTable(figure);
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-[13px]">
        <thead><tr>{head.map((cell, index) => <th key={index} className={`px-2 py-1.5 font-semibold text-ink-2 ${index ? 'text-right' : 'text-left'}`}>{cell}</th>)}</tr></thead>
        <tbody>
          {rows.map((row, at) => (
            <tr key={at} className="border-t border-line-2">
              {row.map((cell, index) => <td key={index} className={`px-2 py-1.5 align-top ${index ? 'text-right tabular-nums' : 'text-ink'}`}>{typeof cell === 'number' ? num(cell) : cell}</td>)}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ------------------------------------------------------------------ flow of sources

function Box({ label, value, detail, tone = 'main' }: { label: string; value: number; detail?: React.ReactNode; tone?: 'main' | 'side' | 'final' }) {
  const style = tone === 'final' ? 'border-brand bg-brand-50' : tone === 'side' ? 'border-dashed border-line bg-soft' : 'border-line bg-surface';
  return (
    <div className={`rounded-lg border px-3 py-2 ${style}`}>
      <p className={`text-[12.5px] ${tone === 'side' ? 'text-muted' : 'text-ink-2'}`}>{label}</p>
      <p className={`text-[17px] font-bold tabular-nums ${tone === 'final' ? 'text-brand' : 'text-ink'}`}>{num(value)}</p>
      {detail && <div className="mt-0.5 text-[12px] leading-snug text-muted">{detail}</div>}
    </div>
  );
}

function FlowRow({ main, side }: { main: React.ReactNode; side?: React.ReactNode }) {
  return (
    <div className="grid items-center gap-2 sm:grid-cols-[minmax(0,1fr)_20px_minmax(0,0.85fr)]">
      {main}
      {side ? <LuArrowRight className="hidden h-4 w-4 justify-self-center text-subtle sm:block" aria-hidden="true" /> : <span className="hidden sm:block" />}
      {side ? <div className="pl-6 sm:pl-0">{side}</div> : <span className="hidden sm:block" />}
    </div>
  );
}

const Down = () => (
  <div className="grid sm:grid-cols-[minmax(0,1fr)_20px_minmax(0,0.85fr)]" aria-hidden="true">
    <LuArrowDown className="my-1 h-4 w-4 justify-self-center text-subtle" />
  </div>
);

function Prisma({ data }: { data: PrismaData }) {
  const distinct = data.identified - data.duplicates;
  const strongest = data.included - data.gap_added;
  const notKept = Math.max(0, data.relevant - strongest);
  const also = [data.files ? `${num(data.files)} of your files` : null, data.web ? `${num(data.web)} web pages` : null].filter(Boolean).join(' and ');
  return (
    <div role="group" aria-label={`Of ${num(data.identified)} records found, ${num(data.included)} papers were included`}>
      <FlowRow
        main={<Box label="Records found" value={data.identified} detail={data.chased ? `${num(data.identified - data.chased)} by searching, ${num(data.chased)} by citation chasing` : undefined} />}
        side={<Box tone="side" label="Duplicates removed" value={data.duplicates} />}
      />
      <Down />
      <FlowRow
        main={<Box label="Distinct records" value={distinct} />}
        side={data.unscreened ? <Box tone="side" label="Lower in the search ranking, not screened" value={data.unscreened} /> : undefined}
      />
      <Down />
      <FlowRow
        main={<Box label="Screened by title and abstract" value={data.screened} />}
        side={<Box tone="side" label="Excluded" value={data.excluded} detail={data.reasons.length ? data.reasons.map((reason) => `${reason.label} ${num(reason.count)}`).join(' · ') : undefined} />}
      />
      <Down />
      <FlowRow
        main={<Box label="Relevant" value={data.relevant} />}
        side={notKept ? <Box tone="side" label="Relevant but not among the strongest" value={notKept} /> : undefined}
      />
      <Down />
      <FlowRow
        main={<Box tone="final" label="Papers in the report" value={data.included} detail={`${num(data.full_text)} read in full text${also ? ` · also ${also}` : ''}`} />}
        side={data.gap_added ? <Box tone="side" label="Of these, added by the gap searches" value={data.gap_added} /> : undefined}
      />
    </div>
  );
}

// ------------------------------------------------------------------ bars

function ColumnChart({ data }: { data: BarsData }) {
  const most = Math.max(1, ...data.bars.map((bar) => bar.value));
  const every = Math.max(1, Math.ceil(data.bars.length / 8));
  return (
    <div role="img" aria-label={data.bars.map((bar) => `${bar.title || bar.label}: ${bar.value}`).join(', ')}>
      <div className="flex h-40 items-end gap-[3px] border-b border-line pb-px">
        {data.bars.map((bar) => (
          <div key={bar.label} className="flex h-full min-w-0 flex-1 flex-col items-center justify-end" title={`${bar.title || bar.label}: ${bar.value}`}>
            {bar.value > 0 && data.bars.length <= 20 && <span className="mb-0.5 text-[10.5px] tabular-nums text-muted">{bar.value}</span>}
            <span className="w-full max-w-10 rounded-t-[3px] bg-brand" style={{ height: `${(bar.value / most) * 100}%`, minHeight: bar.value ? 2 : 0 }} />
          </div>
        ))}
      </div>
      <div className="mt-1 flex gap-[3px]" aria-hidden="true">
        {data.bars.map((bar, index) => (
          <span key={bar.label} className="min-w-0 flex-1 truncate text-center text-[10.5px] tabular-nums text-muted">{index % every === 0 ? bar.label : ''}</span>
        ))}
      </div>
    </div>
  );
}

function BarChart({ data }: { data: BarsData }) {
  const most = Math.max(1, ...data.bars.map((bar) => bar.value));
  return (
    <ul className="space-y-1.5">
      {data.bars.map((bar) => (
        <li key={bar.label} className="grid grid-cols-[minmax(0,9rem)_minmax(0,1fr)_2.5rem] items-center gap-2 sm:grid-cols-[minmax(0,14rem)_minmax(0,1fr)_2.5rem]" title={bar.title || bar.label}>
          <span className="truncate text-[13px] text-ink-2">{bar.label}</span>
          <span className="h-3.5 overflow-hidden rounded-[3px] bg-line-2"><span className="block h-full rounded-[3px] bg-brand" style={{ width: `${(bar.value / most) * 100}%` }} /></span>
          <span className="text-right text-[13px] font-semibold tabular-nums text-ink">{num(bar.value)}</span>
        </li>
      ))}
    </ul>
  );
}

function StanceChart({ data }: { data: StackedData }) {
  const totals = data.rows.map((row) => STANCE_ORDER.reduce((sum, stance) => sum + row.values[stance], 0));
  const most = Math.max(1, ...totals);
  return (
    <>
      <p className="mb-2 flex flex-wrap gap-x-3 gap-y-1 text-[12.5px] text-muted">
        {STANCE_ORDER.map((stance) => <span key={stance} className="inline-flex items-center gap-1"><span className={`h-2.5 w-2.5 rounded-sm ${STANCE_COLOR[stance]}`} aria-hidden="true" />{STANCE_LABELS[stance]}</span>)}
      </p>
      <ul className="space-y-1.5">
        {data.rows.map((row, index) => (
          <li key={row.label} className="grid grid-cols-[minmax(0,9rem)_minmax(0,1fr)_2.5rem] items-center gap-2 sm:grid-cols-[minmax(0,14rem)_minmax(0,1fr)_2.5rem]"
            title={STANCE_ORDER.map((stance) => `${STANCE_LABELS[stance]} ${row.values[stance]}`).join(', ')}>
            <span className="truncate text-[13px] text-ink-2">{row.label}</span>
            <span className="flex h-3.5 overflow-hidden rounded-[3px]" style={{ width: `${(totals[index] / most) * 100}%` }}
              role="img" aria-label={`${row.label}: ${STANCE_ORDER.map((stance) => `${row.values[stance]} ${STANCE_LABELS[stance].toLowerCase()}`).join(', ')}`}>
              {STANCE_ORDER.map((stance) => row.values[stance] ? <span key={stance} className={STANCE_COLOR[stance]} style={{ width: `${(row.values[stance] / totals[index]) * 100}%` }} /> : null)}
            </span>
            <span className="text-right text-[13px] font-semibold tabular-nums text-ink">{totals[index]}</span>
          </li>
        ))}
      </ul>
    </>
  );
}

// ------------------------------------------------------------------ forest plot

/** Round tick values across [low, high]: 0.1, 0.2, 0.5, 1, 2, 5… on a log scale; 1-2-5 steps otherwise. */
function ticks(low: number, high: number, log: boolean): number[] {
  if (log) {
    const out: number[] = [];
    for (let power = -3; power <= 3; power += 1) for (const base of [1, 2, 5]) {
      const value = base * 10 ** power;
      if (value >= low && value <= high) out.push(Number(value.toPrecision(3)));
    }
    return out.length > 7 ? out.filter((value) => /^1|^5/.test(String(value).replace(/^0\.0*/, ''))) : out;
  }
  const raw = (high - low) / 5;
  const magnitude = 10 ** Math.floor(Math.log10(raw));
  const step = [1, 2, 5, 10].map((base) => base * magnitude).find((value) => value >= raw) ?? raw;
  const out: number[] = [];
  for (let value = Math.ceil(low / step) * step; value <= high + 1e-9; value += step) out.push(Number(value.toPrecision(6)));
  return out;
}

function ForestPlot({ data, onCite }: { data: ForestData; onCite?: (n: number) => void }) {
  const scale = (value: number) => (data.log ? Math.log10(value) : value);
  const values = [...data.rows.flatMap((row) => [row.low, row.high]), data.null_value].filter((value) => !data.log || value > 0);
  let low = Math.min(...values.map(scale));
  let high = Math.max(...values.map(scale));
  const pad = (high - low) * 0.06 || 0.1;
  low -= pad;
  high += pad;
  const at = (value: number) => `${((scale(value) - low) / (high - low)) * 100}%`;
  const marks = ticks(data.log ? 10 ** low : low, data.log ? 10 ** high : high, data.log);
  const grid = 'grid grid-cols-[minmax(0,7.5rem)_minmax(0,1fr)_6.5rem] items-center gap-2 sm:grid-cols-[minmax(0,10rem)_minmax(0,1fr)_7.5rem]';
  return (
    <div role="group" aria-label={`Forest plot of ${data.rows.length} studies`}>
      <div className={`${grid} pb-1 text-[11.5px] font-semibold text-muted`}>
        <span>Study</span><span className="text-center">{data.measure} and 95% CI{data.log ? ' (log scale)' : ''}</span><span className="text-right">{data.measure} (95% CI)</span>
      </div>
      <ul>
        {data.rows.map((row) => (
          <li key={row.n} className={`${grid} py-1`} title={row.outcome ?? undefined}>
            <span className="min-w-0 text-[13px] leading-tight text-ink">
              <span className="block truncate">{row.label}
                <button type="button" onClick={() => onCite?.(row.n)} className="ml-1 inline-grid h-[16px] min-w-[16px] place-items-center rounded-[4px] bg-accent-50 px-1 align-middle text-[10.5px] font-bold text-accent-600 hover:bg-accent-100">{row.n}</button>
              </span>
              {row.outcome && <span className="block truncate text-[11.5px] text-muted">{row.outcome}</span>}
            </span>
            <span className="relative h-5" role="img" aria-label={`${row.label}: ${data.measure} ${formatEffect(row.value)}, 95% CI ${formatEffect(row.low)} to ${formatEffect(row.high)}`}>
              <span className="absolute inset-y-[-4px] border-l border-dashed border-subtle" style={{ left: at(data.null_value) }} aria-hidden="true" />
              <span className="absolute top-1/2 h-[1.5px] -translate-y-1/2 bg-ink-2" style={{ left: at(row.low), right: `calc(100% - ${at(row.high)})` }} aria-hidden="true" />
              <span className="absolute top-1/2 h-2.5 w-2.5 -translate-x-1/2 -translate-y-1/2 rotate-45 bg-brand" style={{ left: at(row.value) }} aria-hidden="true" />
            </span>
            <span className="text-right text-[12.5px] tabular-nums text-ink-2">{formatEffect(row.value)} <span className="text-muted">({formatEffect(row.low)}–{formatEffect(row.high)})</span></span>
          </li>
        ))}
      </ul>
      <div className={`${grid} border-t border-line pt-1`} aria-hidden="true">
        <span />
        <span className="relative h-4">
          {marks.map((mark) => <span key={mark} className="absolute -translate-x-1/2 text-[11px] tabular-nums text-muted" style={{ left: at(mark) }}>{mark}</span>)}
        </span>
        <span />
      </div>
    </div>
  );
}
