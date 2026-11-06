/**
 * The WriteOrbit logo: a navy tile with a monoline W over a line ending in a full stop.
 * With the name shown, the tile doubles as the "W" of "Write", so it reads [W]riteOrbit.
 * Decorative: every link that wraps it carries its own "WriteOrbit home" label.
 */
export function Logo({ size = 32, showName = true }: { size?: number; showName?: boolean }) {
  return (
    <span className="inline-flex items-center text-ink" style={{ gap: Math.max(2, Math.round(size * 0.08)) }} aria-hidden="true">
      <span
        className="grid shrink-0 place-items-center rounded-[22%] bg-gradient-to-br from-primary-500 to-brand-600 shadow-[0_4px_12px_-4px_rgba(var(--brand-rgb),.6)]"
        style={{ width: size, height: size }}
      >
        <svg viewBox="0 0 24 24" width={size * 0.62} height={size * 0.62} fill="none" stroke="var(--color-on-brand)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="M4 4.5 L8 14.5 L12 7.5 L16 14.5 L20 4.5" />
          <path d="M4 19.8 H13" />
          <circle cx="17.6" cy="19.8" r="1.95" fill="var(--color-on-brand)" stroke="none" />
        </svg>
      </span>
      {showName && (
        <span className="font-extrabold tracking-[-0.02em] leading-none" style={{ fontSize: Math.round(size * 0.86) }}>
          rite<span className="text-brand">Orbit</span>
        </span>
      )}
    </span>
  );
}
