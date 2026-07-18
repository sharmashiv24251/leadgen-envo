// Base shimmer block — compose these into layout-accurate placeholders
// (see StatPanelSkeleton, ActivityRowSkeleton, etc. below) instead of
// showing spinners or "Loading…" text in place of real content.
export function Skeleton({ className = "" }: { className?: string }) {
  return <div className={`skeleton rounded-md ${className}`} aria-hidden />;
}

export function StatPanelSkeleton({ hero = false }: { hero?: boolean }) {
  return (
    <div
      className={`flex flex-col gap-4 rounded-2xl border p-5 ${
        hero ? "border-transparent bg-surface" : "border-border bg-surface shadow-[var(--shadow-panel-sm)]"
      }`}
    >
      <div className="flex items-center gap-2.5">
        <Skeleton className="h-8 w-8 shrink-0 rounded-[9px]" />
        <Skeleton className="h-3.5 w-24" />
      </div>
      <Skeleton className="h-9 w-20" />
    </div>
  );
}

export function ActivityRowSkeleton({ isFirst = false }: { isFirst?: boolean }) {
  return (
    <div className={`flex items-center gap-3 px-4 py-3 ${!isFirst ? "border-t border-border" : ""}`}>
      <Skeleton className="h-1.5 w-1.5 shrink-0 rounded-full" />
      <Skeleton className="h-3 w-14 shrink-0" />
      <Skeleton className="h-3.5 w-2/3" />
    </div>
  );
}

export function ProspectRowSkeleton() {
  return (
    <div className="flex w-full flex-col gap-2 rounded-lg px-3 py-3">
      <div className="flex items-center justify-between gap-2">
        <Skeleton className="h-4 w-28" />
        <Skeleton className="h-4 w-16 rounded-full" />
      </div>
      <Skeleton className="h-3 w-36" />
      <Skeleton className="h-3 w-44" />
    </div>
  );
}

export function DashboardSkeleton() {
  return (
    <div className="w-full flex-1 px-6 py-8 sm:px-10">
      <div className="mb-8 flex flex-wrap items-start justify-between gap-4">
        <div className="flex flex-col gap-2">
          <Skeleton className="h-7 w-48" />
          <Skeleton className="h-3.5 w-72" />
        </div>
      </div>

      <div className="grid grid-cols-[repeat(auto-fit,minmax(200px,1fr))] gap-4">
        <StatPanelSkeleton hero />
        <StatPanelSkeleton />
        <StatPanelSkeleton />
        <StatPanelSkeleton />
      </div>

      <div className="mt-10">
        <Skeleton className="mb-3 h-3.5 w-28" />
        <div className="overflow-hidden rounded-2xl border border-border bg-surface shadow-[var(--shadow-panel-sm)]">
          <ActivityRowSkeleton isFirst />
          <ActivityRowSkeleton />
          <ActivityRowSkeleton />
          <ActivityRowSkeleton />
        </div>
      </div>
    </div>
  );
}

export function FunnelBoardSkeleton() {
  return (
    <div className="w-full flex-1 px-6 py-8 sm:px-10">
      <div className="mb-6 flex flex-col gap-2">
        <Skeleton className="h-7 w-32" />
        <Skeleton className="h-3.5 w-96" />
      </div>
      <div className="flex gap-4 overflow-x-auto pb-4">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="flex w-72 shrink-0 flex-col gap-3">
            <div className="flex items-center gap-2 px-1">
              <Skeleton className="h-2 w-2 rounded-full" />
              <Skeleton className="h-3.5 w-24" />
            </div>
            <div className="flex flex-col gap-2 rounded-2xl border border-border/60 p-2">
              <Skeleton className="h-20 w-full rounded-2xl" />
              <Skeleton className="h-20 w-full rounded-2xl" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export function EmailDetailSkeleton() {
  return (
    <section className="min-h-0 flex-1 overflow-y-auto">
      <div className="mx-auto flex max-w-5xl flex-col gap-6 px-6 py-8 sm:px-8">
        <div className="rounded-2xl border border-border bg-surface p-5 shadow-[var(--shadow-panel-sm)]">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="flex flex-col gap-2.5">
              <Skeleton className="h-5 w-40" />
              <Skeleton className="h-3.5 w-56" />
              <Skeleton className="h-3 w-32" />
            </div>
            <div className="flex flex-col items-end gap-2">
              <div className="flex items-center gap-2">
                <Skeleton className="h-5 w-16 rounded-full" />
                <Skeleton className="h-5 w-20 rounded-full" />
              </div>
              <Skeleton className="h-7 w-44 rounded-full" />
              <Skeleton className="h-7 w-32 rounded-full" />
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-6 md:grid-cols-[minmax(0,2fr)_minmax(0,3fr)]">
          <div className="rounded-2xl border border-border bg-surface p-5 shadow-[var(--shadow-panel-sm)]">
            <Skeleton className="mb-4 h-3.5 w-28" />
            <div className="flex flex-col gap-4">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="flex gap-3">
                  <Skeleton className="mt-1 h-5 w-5 shrink-0 rounded-full" />
                  <Skeleton className="h-3.5 w-full" />
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-2xl border border-border bg-surface p-5 shadow-[var(--shadow-panel-sm)]">
            <div className="mb-4 flex items-center justify-between gap-4">
              <Skeleton className="h-3.5 w-24" />
              <Skeleton className="h-7 w-32 rounded-full" />
            </div>
            <Skeleton className="mb-1.5 h-3 w-16" />
            <Skeleton className="mb-4 h-9 w-full rounded-lg" />
            <Skeleton className="mb-1.5 h-3 w-12" />
            <div className="flex flex-col gap-2">
              {Array.from({ length: 6 }).map((_, i) => (
                <Skeleton key={i} className={`h-3.5 ${i === 5 ? "w-2/3" : "w-full"}`} />
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
