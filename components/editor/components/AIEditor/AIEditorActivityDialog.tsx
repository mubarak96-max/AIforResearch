'use client';

import React from 'react';
import { LuHistory, LuX } from 'react-icons/lu';
import type { AIEditorActivityEntry } from '../../types/ai-editor';

type AIEditorActivityDialogProps = {
  isOpen: boolean;
  onClose: () => void;
  activity: AIEditorActivityEntry[];
};

export default function AIEditorActivityDialog({
  isOpen,
  onClose,
  activity,
}: AIEditorActivityDialogProps) {
  if (!isOpen) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-[13000] flex items-center justify-center bg-[rgba(15,23,42,0.35)] p-4 backdrop-blur-[2px]">
      <div className="absolute inset-0" aria-hidden="true" onClick={onClose} />

      <div className="relative z-10 flex max-h-[80vh] w-full max-w-[680px] flex-col overflow-hidden rounded-[16px] border border-line bg-surface shadow-[0_22px_50px_-18px_rgba(15,23,42,0.35)]">
        <div className="flex items-start justify-between gap-4 border-b border-line-2 px-6 py-5">
          <div className="flex items-start gap-3">
            <div className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-[var(--theme-primary-soft)] text-[var(--theme-primary)]">
              <LuHistory className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-[18px] font-bold text-ink">Version history</h2>
              <p className="mt-1 text-sm text-muted">
                Recent document, comment, and sharing activity for this editor session.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Close version history"
            className="inline-flex h-10 w-10 items-center justify-center rounded-full text-muted transition-colors hover:bg-line-2"
          >
            <LuX className="h-5 w-5" />
          </button>
        </div>

        <div className="overflow-y-auto px-6 py-5">
          <div className="space-y-3">
            {activity.length > 0 ? (
              activity.map((entry) => (
                <div
                  key={entry.id}
                  className="rounded-[14px] border border-line-2 px-4 py-3"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="text-sm font-medium text-ink">
                      {entry.actorDisplayName}
                    </div>
                    <div className="text-xs text-subtle">
                      {new Date(entry.timestamp).toLocaleString()}
                    </div>
                  </div>
                  <div className="mt-1 text-sm text-muted">{entry.description}</div>
                </div>
              ))
            ) : (
              <div className="rounded-[14px] border border-dashed border-line bg-surface px-4 py-8 text-sm text-muted">
                Activity will appear here as people edit, comment, rename, and update sharing.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
