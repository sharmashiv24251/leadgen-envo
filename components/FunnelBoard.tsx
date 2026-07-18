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
import { useState } from "react";
import type { ChipTone } from "@/components/Chip";
import Chip from "@/components/Chip";
import { FunnelBoardSkeleton } from "@/components/Skeleton";
import type { ProspectListItem } from "@/lib/data";
import {
  FUNNEL_COLUMNS,
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

const DOT_BG: Record<ChipTone, string> = {
  success: "bg-success",
  pending: "bg-pending",
  neutral: "bg-ink-faint",
  danger: "bg-danger",
  accent: "bg-accent",
};

function FunnelCardContent({ prospect }: { prospect: ProspectListItem }) {
  const stageCol = getFunnelColumn(prospect.stage);
  return (
    <div className="flex flex-col gap-2 rounded-2xl border border-border bg-surface p-3.5 shadow-[var(--shadow-panel-sm)]">
      <div className="flex items-start justify-between gap-2">
        <span className="truncate text-sm font-medium text-ink">{prospect.name}</span>
        <Chip tone={statusTone[prospect.status]}>{prospect.status}</Chip>
      </div>
      <span className="truncate text-xs text-ink-muted">
        {prospect.title} · {prospect.company}
      </span>
      <div>
        <Chip tone={stageCol.tone}>{stageCol.label}</Chip>
      </div>
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
        <span className={`h-2 w-2 shrink-0 rounded-full ${DOT_BG[col.tone]}`} aria-hidden />
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
              <FunnelCardContent prospect={activeProspect} />
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
