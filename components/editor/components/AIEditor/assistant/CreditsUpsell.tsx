'use client';

import React from 'react';
import { LuZap } from 'react-icons/lu';
import { useEditorConfig } from '../../../runtime';
import { lastPlanLimit } from '../../../lib/planLimit';

/** Shown inside an AI box when the plan's allowance is used up (HTTP 402). */
export default function CreditsUpsell({ feature = 'AI edits', onDismiss }: { feature?: string; onDismiss?: () => void; isMobile?: boolean }) {
  const config = useEditorConfig();
  const message = lastPlanLimit() || `Upgrade to keep using ${feature}.`;
  const upgrade = () => {
    if (config.onUpgrade) config.onUpgrade({ reason: 'plan_limit', message });
    else window.location.assign(config.navLinks?.pricing || '/pricing');
  };
  return (
    <div className="ce-credits-upsell rounded-[14px] border border-brand-100 bg-[linear-gradient(180deg,var(--color-surface),var(--color-brand-50))] p-[14px] text-[13px] text-ink-2">
      <div className="min-w-0">
        <b className="text-[14px] text-ink">Plan limit reached</b>
        <p className="mb-2.5 mt-1 text-[12.5px] leading-[1.45] text-muted">{message}</p>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={upgrade}
            className="inline-flex h-9 items-center gap-1.5 rounded-[10px] bg-[var(--theme-primary,var(--color-brand))] px-3.5 text-[13.5px] font-semibold text-white shadow-[0_6px_16px_-6px_rgba(var(--brand-rgb),0.7)] hover:bg-brand-600"
          >
            <LuZap className="h-4 w-4" aria-hidden="true" /> Upgrade
          </button>
          {onDismiss ? (
            <button type="button" onClick={onDismiss} className="inline-flex h-9 items-center rounded-[10px] px-2.5 text-[13px] font-medium text-muted hover:text-ink">
              Not now
            </button>
          ) : null}
        </div>
      </div>
    </div>
  );
}
