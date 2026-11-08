'use client';

/** An on/off switch (role="switch"). */
export function Switch({ checked, onChange, label, disabled }: { checked: boolean; onChange: (value: boolean) => void; label: string; disabled?: boolean }) {
  return (
    <button type="button" role="switch" aria-checked={checked} aria-label={label} disabled={disabled} onClick={() => onChange(!checked)}
      className={`relative h-6 w-10 shrink-0 rounded-full transition-colors disabled:opacity-50 ${checked ? 'bg-brand' : 'bg-line-3'}`}>
      <span className={`absolute top-0.5 h-5 w-5 rounded-full bg-surface shadow transition-[left] ${checked ? 'left-[18px]' : 'left-0.5'}`} />
    </button>
  );
}
