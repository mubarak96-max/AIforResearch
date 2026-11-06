/** The WriteOrbit wordmark: a blue tile with an open book, and the name beside it. */
export function Logo({ size = 32, showName = true }: { size?: number; showName?: boolean }) {
  return (
    <span className="inline-flex items-center gap-2.5 text-ink">
      <span
        className="grid shrink-0 place-items-center rounded-[9px] bg-gradient-to-br from-blue-500 to-blue-700 shadow-[0_4px_12px_-4px_rgba(37,99,235,.6)]"
        style={{ width: size, height: size }}
        aria-hidden="true"
      >
        <svg viewBox="0 0 24 24" width={size * 0.6} height={size * 0.6} fill="none" stroke="#fff" strokeWidth="2.1" strokeLinecap="round" strokeLinejoin="round">
          <path d="M3.5 6.5c2.8-1.2 5.8-1 8.5 1 2.7-2 5.7-2.2 8.5-1v11.5c-2.8-1.2-5.8-1-8.5 1-2.7-2-5.7-2.2-8.5-1z" />
          <path d="M12 7.5v11.5" />
        </svg>
      </span>
      {showName && (
        <span className="font-extrabold tracking-[-0.02em] leading-none" style={{ fontSize: Math.round(size * 0.56) }}>
          Research<span className="text-brand">Cove</span>
        </span>
      )}
    </span>
  );
}
