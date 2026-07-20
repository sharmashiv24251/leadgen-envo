"use client";

import { useLayoutEffect, useState } from "react";
import { useContextMenu } from "@/components/ContextMenu";
import { copySelectionOr } from "@/lib/clipboard";
import { formatRelativeTime, type ContactNote } from "@/lib/data";

export function PencilIcon({ className }: { className?: string }) {
  return (
    <svg width="18" height="18" viewBox="0 0 16 16" fill="none" aria-hidden className={className}>
      <path
        d="M11.3 2.3 13.7 4.7 5.4 13H3v-2.4L11.3 2.3Z"
        stroke="currentColor"
        strokeWidth="1.3"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function XIcon({ className }: { className?: string }) {
  return (
    <svg width="12" height="12" viewBox="0 0 16 16" fill="none" aria-hidden className={className}>
      <path d="M3 3l10 10M13 3 3 13" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  );
}

export function CheckIcon({ className }: { className?: string }) {
  return (
    <svg width="12" height="12" viewBox="0 0 16 16" fill="none" aria-hidden className={className}>
      <path d="M3 8.4 6.3 12 13 4.5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export const ICON_BUTTON_BASE =
  "flex h-6 w-6 shrink-0 items-center justify-center rounded-full transition-colors active:scale-[0.9]";

export function StickyNoteCard({
  note,
  onSave,
  onDelete,
}: {
  note: ContactNote;
  onSave: (text: string) => void;
  onDelete: () => void;
}) {
  const [isEditing, setIsEditing] = useState(false);
  const [text, setText] = useState(note.text);
  const showContextMenu = useContextMenu();

  useLayoutEffect(() => {
    setText(note.text);
    setIsEditing(false);
  }, [note.id, note.text]);

  function handleSave() {
    const trimmed = text.trim();
    if (trimmed && trimmed !== note.text) onSave(trimmed);
    setIsEditing(false);
  }

  return (
    <div
      className="relative flex flex-col gap-1.5 rounded-xl border border-border bg-surface-raised p-3 pr-14 shadow-[var(--shadow-panel-sm)]"
      onContextMenu={(e) =>
        !isEditing && showContextMenu(e, [{ label: "Copy", onSelect: () => copySelectionOr(note.text) }])
      }
    >
      <div className="absolute right-2 top-2 flex items-center gap-1">
        {isEditing ? (
          <>
            <button
              type="button"
              aria-label="Save"
              onClick={handleSave}
              className={`${ICON_BUTTON_BASE} text-accent hover:bg-accent-dim`}
            >
              <CheckIcon />
            </button>
            <button
              type="button"
              aria-label="Cancel"
              onClick={() => {
                setText(note.text);
                setIsEditing(false);
              }}
              className={`${ICON_BUTTON_BASE} text-ink-muted hover:bg-surface hover:text-ink`}
            >
              <XIcon />
            </button>
          </>
        ) : (
          <>
            <button
              type="button"
              aria-label="Edit note"
              onClick={() => setIsEditing(true)}
              className={`${ICON_BUTTON_BASE} text-ink-muted hover:bg-surface hover:text-ink`}
            >
              <PencilIcon className="h-3 w-3" />
            </button>
            <button
              type="button"
              aria-label="Delete note"
              onClick={onDelete}
              className={`${ICON_BUTTON_BASE} text-danger hover:bg-danger-dim`}
            >
              <XIcon />
            </button>
          </>
        )}
      </div>

      <span className="text-xs text-ink-muted">{formatRelativeTime(note.createdAt)}</span>

      {isEditing ? (
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          rows={3}
          autoFocus
          className="select-text w-full resize-y rounded-lg border border-accent/40 bg-bg px-2 py-1.5 text-sm leading-relaxed text-ink outline-none focus:border-accent"
        />
      ) : (
        <p className="select-text whitespace-pre-wrap text-sm leading-relaxed text-ink">{note.text}</p>
      )}
    </div>
  );
}
