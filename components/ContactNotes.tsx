"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { AnimatePresence, motion } from "motion/react";
import { useLayoutEffect, useState } from "react";
import { useContextMenu } from "@/components/ContextMenu";
import { copySelectionOr } from "@/lib/clipboard";
import { formatRelativeTime, type ContactNote } from "@/lib/data";
import { addContactNote, deleteContactNote, fetchContactNotes, updateContactNote } from "@/lib/outreachApi";
import { queryKeys } from "@/lib/queryKeys";
import { useAccountMode } from "@/lib/useAccountData";

// No per-user identity anywhere in this app (both logins are account-level, not personal) --
// notes just need *a* non-null author for the schema, not a real one.
const DEFAULT_AUTHOR = "You";

function PencilIcon({ className }: { className?: string }) {
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

function XIcon({ className }: { className?: string }) {
  return (
    <svg width="12" height="12" viewBox="0 0 16 16" fill="none" aria-hidden className={className}>
      <path d="M3 3l10 10M13 3 3 13" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  );
}

function CheckIcon({ className }: { className?: string }) {
  return (
    <svg width="12" height="12" viewBox="0 0 16 16" fill="none" aria-hidden className={className}>
      <path d="M3 8.4 6.3 12 13 4.5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

const ICON_BUTTON_BASE =
  "flex h-6 w-6 shrink-0 items-center justify-center rounded-full transition-colors active:scale-[0.9]";

// Alternating tilt gives the "scattered sticky notes" read without hijacking a semantic
// color (success/pending/danger are reserved for actual meaning elsewhere in the app).
function tiltFor(index: number): string {
  return index % 2 === 0 ? "-rotate-1" : "rotate-1";
}

function StickyNoteCard({
  note,
  index,
  onSave,
  onDelete,
}: {
  note: ContactNote;
  index: number;
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
      className={`relative flex flex-col gap-1.5 rounded-xl border border-border bg-surface-raised p-3 pr-14 shadow-[var(--shadow-panel-sm)] ${tiltFor(index)}`}
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

export default function ContactNotes({ contactId }: { contactId: string }) {
  const account = useAccountMode();
  const keys = queryKeys.forAccount(account);
  const queryClient = useQueryClient();

  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState("");

  const { data: notes = [] } = useQuery({
    queryKey: keys.contactNotes(contactId),
    queryFn: () => fetchContactNotes(contactId),
  });

  function invalidate() {
    queryClient.invalidateQueries({ queryKey: keys.contactNotes(contactId) });
  }

  const addMutation = useMutation<void, Error, void>({
    mutationFn: () => addContactNote(contactId, DEFAULT_AUTHOR, draft.trim()),
    onSuccess: () => {
      setDraft("");
      invalidate();
    },
  });

  const updateMutation = useMutation<void, Error, { id: string; text: string }>({
    mutationFn: ({ id, text }) => updateContactNote(id, text),
    onSuccess: invalidate,
  });

  const deleteMutation = useMutation<void, Error, string>({
    mutationFn: (id) => deleteContactNote(id),
    onSuccess: invalidate,
  });

  return (
    <div className="fixed bottom-6 right-6 z-modal flex flex-col items-end gap-3">
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: 16, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 16, scale: 0.95 }}
            transition={{ duration: 0.15, ease: "easeOut" }}
            className="flex h-[32rem] w-[26rem] max-w-[calc(100vw-3rem)] flex-col rounded-2xl border border-border bg-surface shadow-[var(--shadow-panel)]"
          >
            <div className="flex items-center justify-between gap-2 border-b border-border px-4 py-3">
              <h2 className="text-sm font-medium text-ink">Notes</h2>
              <span className="rounded-full border border-border px-2 py-0.5 text-xs text-ink-muted">
                {notes.length}
              </span>
            </div>

            <div className="flex flex-1 flex-col gap-2.5 overflow-y-auto p-4">
              {notes.length === 0 && <p className="text-xs text-ink-muted">No notes yet.</p>}
              {notes.map((note, i) => (
                <StickyNoteCard
                  key={note.id}
                  note={note}
                  index={i}
                  onSave={(text) => updateMutation.mutate({ id: note.id, text })}
                  onDelete={() => deleteMutation.mutate(note.id)}
                />
              ))}
            </div>

            <div className="flex flex-col gap-2 border-t border-border p-3">
              <textarea
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                rows={2}
                placeholder="Jot down anything about this person…"
                className="w-full resize-y rounded-lg border border-border bg-bg px-3 py-2 text-sm leading-relaxed text-ink outline-none focus:border-accent"
              />
              {addMutation.error && (
                <p className="rounded-lg border border-danger/30 bg-danger-dim px-3 py-2 text-xs text-danger">
                  {addMutation.error.message || "Failed to save note."}
                </p>
              )}
              <button
                type="button"
                onClick={() => addMutation.mutate()}
                disabled={addMutation.isPending || !draft.trim()}
                className="w-fit rounded-full bg-accent-strong px-4 py-2 text-xs font-medium text-accent-ink transition-opacity hover:opacity-90 disabled:opacity-50 active:scale-[0.97]"
              >
                {addMutation.isPending ? "Saving…" : "Add note"}
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-label={open ? "Close notes" : "Open notes"}
        className="relative flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-accent-strong text-accent-ink shadow-[var(--shadow-panel)] transition-transform active:scale-[0.93]"
      >
        {open ? <XIcon className="h-5 w-5" /> : <PencilIcon />}
        {!open && notes.length > 0 && (
          <span className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full border border-border bg-surface-raised text-[10px] font-medium text-ink-muted">
            {notes.length}
          </span>
        )}
      </button>
    </div>
  );
}
