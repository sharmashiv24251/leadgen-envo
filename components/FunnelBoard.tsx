"use client";

import {
  DndContext,
  DragOverlay,
  PointerSensor,
  useDraggable,
  useDroppable,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
} from "@dnd-kit/core";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import Chip from "@/components/Chip";
import { FunnelBoardSkeleton } from "@/components/Skeleton";
import { PencilIcon, StickyNoteCard } from "@/components/StickyNoteCard";
import type { ProspectListItem } from "@/lib/data";
import {
  FUNNEL_COLUMNS,
  FUNNEL_STAGE_CARD_BG,
  getFunnelColumn,
  LOST_REASONS,
  MANUAL_STAGES,
  type FunnelStage,
  type LostReason,
} from "@/lib/funnel";
import { setContactStage } from "@/lib/outreachApi";
import { queryKeys } from "@/lib/queryKeys";
import { statusTone } from "@/lib/status";
import { useAccountMode, useAllProspectsLean } from "@/lib/useAccountData";
import { useContactNotes } from "@/lib/useContactNotes";

const NOTES_POPOVER_WIDTH = 432;
const NOTES_POPOVER_PREFERRED_HEIGHT = 480;
const NOTES_POPOVER_GAP = 8;
const NOTES_POPOVER_MARGIN = 12;

type PopoverPosition = { left: number; maxHeight: number } & (
  | { anchor: "above"; bottom: number }
  | { anchor: "below"; top: number }
);

// Every card can sit anywhere on screen (top row, bottom row, left/right edge of a scrolled
// column), so the popover can't use a single fixed CSS rule -- it measures the trigger button's
// actual screen position and flips/clamps against the viewport instead. Anchoring from the edge
// that actually touches the button (bottom-edge-relative when opening upward, top-edge-relative
// when opening downward) instead of a precomputed height keeps it flush against the button no
// matter how tall its content renders -- computing a `top` from an assumed height (and only
// capping with `maxHeight`) let the box float away from the button whenever real content was
// shorter than that assumption, which looked like the popover belonged to some other card.
function computeNotesPopoverPosition(rect: DOMRect): PopoverPosition {
  const spaceAbove = Math.max(0, rect.top - NOTES_POPOVER_GAP - NOTES_POPOVER_MARGIN);
  const spaceBelow = Math.max(0, window.innerHeight - rect.bottom - NOTES_POPOVER_GAP - NOTES_POPOVER_MARGIN);
  const openUpward = spaceAbove >= spaceBelow;
  const maxHeight = Math.min(NOTES_POPOVER_PREFERRED_HEIGHT, openUpward ? spaceAbove : spaceBelow);

  const left = Math.min(
    Math.max(rect.right - NOTES_POPOVER_WIDTH, NOTES_POPOVER_MARGIN),
    window.innerWidth - NOTES_POPOVER_WIDTH - NOTES_POPOVER_MARGIN
  );

  return openUpward
    ? { anchor: "above", left, maxHeight, bottom: window.innerHeight - rect.top + NOTES_POPOVER_GAP }
    : { anchor: "below", left, maxHeight, top: rect.bottom + NOTES_POPOVER_GAP };
}

// Card-level notes entry point: a small pencil button in the bottom-right corner that opens a
// hover popover with the same contact_notes CRUD used on the prospect detail page's floating
// widget (see ContactNotes.tsx / lib/useContactNotes.ts). The popover is portaled to
// document.body and positioned with `fixed` + a measured rect (computeNotesPopoverPosition)
// rather than `absolute` inside the card, so it's never clipped by the card/column and always
// flips to whichever side of the button actually has room. The card sits inside a draggable
// (dnd-kit) Next.js Link, so the trigger's own click/pointerdown must stopPropagation /
// preventDefault to keep it from navigating to the detail page or kicking off a drag.
function CardNotesButton({ contactId }: { contactId: string }) {
  const [open, setOpen] = useState(false);
  const [position, setPosition] = useState<PopoverPosition | null>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const { notes, draft, setDraft, addMutation, updateMutation, deleteMutation } = useContactNotes(contactId, {
    enabled: open,
  });

  useEffect(() => () => {
    if (closeTimer.current) clearTimeout(closeTimer.current);
  }, []);

  useEffect(() => {
    if (!open) return;
    function reposition() {
      if (buttonRef.current) setPosition(computeNotesPopoverPosition(buttonRef.current.getBoundingClientRect()));
    }
    window.addEventListener("scroll", reposition, true);
    window.addEventListener("resize", reposition);
    return () => {
      window.removeEventListener("scroll", reposition, true);
      window.removeEventListener("resize", reposition);
    };
  }, [open]);

  function openNow() {
    if (closeTimer.current) {
      clearTimeout(closeTimer.current);
      closeTimer.current = null;
    }
    if (buttonRef.current) setPosition(computeNotesPopoverPosition(buttonRef.current.getBoundingClientRect()));
    setOpen(true);
  }

  function closeSoon() {
    closeTimer.current = setTimeout(() => setOpen(false), 150);
  }

  return (
    <>
      <div
        className="absolute bottom-2 right-2"
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
        }}
        onPointerDown={(e) => e.stopPropagation()}
      >
        <button
          ref={buttonRef}
          type="button"
          aria-label="Edit notes"
          onMouseEnter={openNow}
          onMouseLeave={closeSoon}
          onClick={() => (open ? setOpen(false) : openNow())}
          className="flex h-7 w-7 items-center justify-center rounded-full border border-white/20 bg-black/20 text-accent-ink shadow-[var(--shadow-panel-sm)] transition-colors hover:bg-black/35"
        >
          <PencilIcon className="h-3.5 w-3.5" />
        </button>
      </div>

      {open &&
        position &&
        createPortal(
          <div
            onMouseEnter={openNow}
            onMouseLeave={closeSoon}
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
            }}
            onPointerDown={(e) => e.stopPropagation()}
            style={{
              ...(position.anchor === "above" ? { bottom: position.bottom } : { top: position.top }),
              left: position.left,
              width: NOTES_POPOVER_WIDTH,
              maxHeight: position.maxHeight,
            }}
            className="fixed z-modal flex flex-col overflow-hidden rounded-xl border border-border bg-surface shadow-[var(--shadow-panel)]"
          >
            <div className="flex items-center justify-between border-b border-border px-3 py-2">
              <span className="text-xs font-medium text-ink">Notes</span>
              <span className="rounded-full border border-border px-2 py-0.5 text-xs text-ink-muted">
                {notes.length}
              </span>
            </div>

            <div className="flex flex-1 flex-col gap-2 overflow-y-auto p-2">
              {notes.length === 0 && <p className="px-1 py-1 text-xs text-ink-muted">No notes yet.</p>}
              {notes.map((note) => (
                <StickyNoteCard
                  key={note.id}
                  note={note}
                  onSave={(text) => updateMutation.mutate({ id: note.id, text })}
                  onDelete={() => deleteMutation.mutate(note.id)}
                />
              ))}
            </div>

            <div className="flex flex-col gap-1.5 border-t border-border p-2">
              <textarea
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                rows={2}
                placeholder="Add a note…"
                className="w-full resize-y rounded-lg border border-border bg-bg px-2 py-1.5 text-xs leading-relaxed text-ink outline-none focus:border-accent"
              />
              {addMutation.error && (
                <p className="rounded-lg border border-danger/30 bg-danger-dim px-2 py-1.5 text-xs text-danger">
                  {addMutation.error.message || "Failed to save note."}
                </p>
              )}
              <button
                type="button"
                onClick={() => addMutation.mutate()}
                disabled={addMutation.isPending || !draft.trim()}
                className="w-fit rounded-full bg-accent-strong px-3 py-1.5 text-xs font-medium text-accent-ink transition-opacity hover:opacity-90 disabled:opacity-50 active:scale-[0.97]"
              >
                {addMutation.isPending ? "Saving…" : "Add note"}
              </button>
            </div>
          </div>,
          document.body
        )}
    </>
  );
}

function FunnelCardContent({
  prospect,
  showNotes = true,
}: {
  prospect: ProspectListItem;
  showNotes?: boolean;
}) {
  const stageCol = getFunnelColumn(prospect.stage);
  return (
    <div
      className={`relative flex flex-col gap-2 rounded-2xl p-3.5 shadow-[var(--shadow-panel-sm)] ${FUNNEL_STAGE_CARD_BG[prospect.stage]}`}
    >
      <div className="flex items-start justify-between gap-2">
        <span className="truncate text-sm font-medium text-accent-ink">{prospect.name}</span>
        <Chip tone={statusTone[prospect.status]} onColor>
          {prospect.status}
        </Chip>
      </div>
      <span className="truncate text-xs text-accent-ink">
        {prospect.title} · {prospect.company}
      </span>
      <div>
        <Chip tone={stageCol.tone} onColor>
          {stageCol.label}
        </Chip>
      </div>
      {showNotes && <CardNotesButton contactId={prospect.id} />}
    </div>
  );
}

// A plain click (no meaningful pointer movement) navigates to the prospect's detail page; a
// real drag is captured by dnd-kit instead -- the sensor's activationConstraint below (6px)
// is what lets both coexist on the same element without one blocking the other.
function FunnelCard({ prospect }: { prospect: ProspectListItem }) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({ id: prospect.id });

  return (
    <Link
      href={`/emails/${prospect.id}`}
      ref={setNodeRef}
      {...listeners}
      {...attributes}
      className={`block touch-none transition-opacity active:cursor-grabbing ${isDragging ? "opacity-30" : ""}`}
    >
      <FunnelCardContent prospect={prospect} />
    </Link>
  );
}

function FunnelColumn({
  col,
  items,
}: {
  col: (typeof FUNNEL_COLUMNS)[number];
  items: ProspectListItem[];
}) {
  const { setNodeRef, isOver } = useDroppable({ id: col.key });

  return (
    <div className="flex w-72 shrink-0 flex-col gap-3">
      <div className="flex items-center gap-2 px-1">
        <span className={`h-2 w-2 shrink-0 rounded-full ${FUNNEL_STAGE_CARD_BG[col.key]}`} aria-hidden />
        <h3 className="text-sm font-medium text-ink">{col.label}</h3>
        <span className="rounded-full border border-border px-2 py-0.5 text-xs text-ink-muted">
          {items.length}
        </span>
      </div>
      <div
        ref={setNodeRef}
        className={`flex min-h-32 flex-1 flex-col gap-2 rounded-2xl border p-2 transition-colors ${
          isOver ? "border-accent/40 bg-accent-dim" : "border-border/60 bg-transparent"
        }`}
      >
        {items.map((p) => (
          <FunnelCard key={p.id} prospect={p} />
        ))}
        {items.length === 0 && (
          <p className="px-2 py-6 text-center text-xs text-ink-faint">No prospects</p>
        )}
      </div>
    </div>
  );
}

function LostReasonPrompt({
  onPick,
  onCancel,
}: {
  onPick: (reason: LostReason) => void;
  onCancel: () => void;
}) {
  return (
    <div
      className="fixed inset-0 z-modal-backdrop flex items-center justify-center bg-black/40 px-4"
      onClick={onCancel}
    >
      <div
        className="w-full max-w-xs rounded-2xl border border-border bg-surface p-5 shadow-[var(--shadow-panel)]"
        onClick={(e) => e.stopPropagation()}
      >
        <h3 className="mb-1 text-sm font-medium text-ink">Mark as deal lost</h3>
        <p className="mb-4 text-xs text-ink-muted">Why didn&apos;t this one convert?</p>
        <div className="flex flex-col gap-2">
          {LOST_REASONS.map((r) => (
            <button
              key={r.key}
              type="button"
              onClick={() => onPick(r.key)}
              className="rounded-full border border-border bg-surface-raised px-4 py-2 text-left text-sm text-ink transition-colors hover:bg-accent-dim hover:text-accent active:scale-[0.98]"
            >
              {r.label}
            </button>
          ))}
        </div>
        <button
          type="button"
          onClick={onCancel}
          className="mt-4 w-full rounded-full border border-border bg-surface-raised px-3 py-1.5 text-xs font-medium text-ink-muted transition-colors hover:text-ink active:scale-[0.97]"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}

export default function FunnelBoard() {
  const { items: prospects, loading } = useAllProspectsLean();
  const account = useAccountMode();
  const keys = queryKeys.forAccount(account);
  const queryClient = useQueryClient();

  const [activeId, setActiveId] = useState<string | null>(null);
  const [pendingLostId, setPendingLostId] = useState<string | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } })
  );

  const stageMutation = useMutation<
    void,
    Error,
    { contactId: string; stage: FunnelStage | null; lostReason: LostReason | null },
    { previous?: ProspectListItem[] }
  >({
    mutationFn: ({ contactId, stage, lostReason }) => setContactStage(contactId, stage, lostReason),
    // Only the "assign a manual stage" direction is optimistic -- clearing back to a computed
    // stage (stage: null) depends on message data the client doesn't fully have here, so that
    // path just waits for the refetch (see lib/funnel.ts / the plan for why).
    onMutate: ({ contactId, stage }) => {
      if (!stage) return {};
      const previous = queryClient.getQueryData<ProspectListItem[]>(keys.allProspectsLean());
      if (previous) {
        queryClient.setQueryData<ProspectListItem[]>(
          keys.allProspectsLean(),
          previous.map((p) => (p.id === contactId ? { ...p, stage } : p))
        );
      }
      return { previous };
    },
    onError: (err, _vars, context) => {
      console.error("[FunnelBoard] failed to update stage:", err);
      if (context?.previous) queryClient.setQueryData(keys.allProspectsLean(), context.previous);
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: keys.allProspectsLean() });
      queryClient.invalidateQueries({ queryKey: keys.prospectsListPrefix() });
    },
  });

  if (loading) return <FunnelBoardSkeleton />;

  const columns = FUNNEL_COLUMNS.map((col) => ({
    ...col,
    items: prospects.filter((p) => p.stage === col.key),
  }));

  const activeProspect = activeId ? prospects.find((p) => p.id === activeId) ?? null : null;

  function handleDragStart(event: DragStartEvent) {
    setActiveId(event.active.id as string);
  }

  function handleDragEnd(event: DragEndEvent) {
    setActiveId(null);
    const { active, over } = event;
    if (!over) return;

    const contactId = active.id as string;
    const targetStage = over.id as FunnelStage;
    const prospect = prospects.find((p) => p.id === contactId);
    if (!prospect || prospect.stage === targetStage) return;

    if (targetStage === "deal_lost") {
      setPendingLostId(contactId);
      return;
    }
    if (MANUAL_STAGES.includes(targetStage)) {
      stageMutation.mutate({ contactId, stage: targetStage, lostReason: null });
    } else {
      stageMutation.mutate({ contactId, stage: null, lostReason: null });
    }
  }

  return (
    <div className="w-full flex-1 px-6 py-8 sm:px-10">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-ink">Funnel</h1>
        <p className="mt-1 text-sm text-ink-muted">
          Drag a prospect between stages. Leads, Intro sent, and Follow-up sent track themselves
          from outreach activity — Meeting booked, Contract, and Deal lost are calls you make.
        </p>
      </div>

      <DndContext
        sensors={sensors}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
        onDragCancel={() => setActiveId(null)}
      >
        <div className="flex gap-4 overflow-x-auto pb-4">
          {columns.map((col) => (
            <FunnelColumn key={col.key} col={col} items={col.items} />
          ))}
        </div>

        <DragOverlay>
          {activeProspect ? (
            <div className="w-72 rotate-1 opacity-95">
              <FunnelCardContent prospect={activeProspect} showNotes={false} />
            </div>
          ) : null}
        </DragOverlay>
      </DndContext>

      {pendingLostId && (
        <LostReasonPrompt
          onCancel={() => setPendingLostId(null)}
          onPick={(reason) => {
            stageMutation.mutate({ contactId: pendingLostId, stage: "deal_lost", lostReason: reason });
            setPendingLostId(null);
          }}
        />
      )}
    </div>
  );
}
