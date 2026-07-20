"use client";

import { AnimatePresence, motion } from "motion/react";
import { useState } from "react";
import { PencilIcon, StickyNoteCard, XIcon } from "@/components/StickyNoteCard";
import { useContactNotes } from "@/lib/useContactNotes";

export default function ContactNotes({ contactId }: { contactId: string }) {
  const [open, setOpen] = useState(false);
  const { notes, draft, setDraft, addMutation, updateMutation, deleteMutation } = useContactNotes(contactId);

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
              {notes.map((note) => (
                <StickyNoteCard
                  key={note.id}
                  note={note}
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
