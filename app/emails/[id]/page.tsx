"use client";

import { Suspense } from "react";
import { useParams, useSearchParams } from "next/navigation";
import EmailDetail from "@/components/EmailDetail";
import { EmailDetailSkeleton } from "@/components/Skeleton";
import { parseStatusFilter } from "@/lib/data";
import { parseStageFilter } from "@/lib/funnel";
import { useProspectDetail } from "@/lib/useAccountData";

function EmailPageContent() {
  const params = useParams<{ id: string }>();
  const searchParams = useSearchParams();
  const status = searchParams.get("status") ?? undefined;
  const stage = searchParams.get("stage") ?? undefined;
  // Same filter the sidebar link that led here was showing -- lets useProspectDetail seed
  // itself instantly from that already-loaded page instead of a second round-trip.
  const { prospect, loading } = useProspectDetail(params.id, {
    status: parseStatusFilter(status),
    stage: parseStageFilter(stage),
  });

  if (!prospect) {
    if (loading) return <EmailDetailSkeleton />;
    return (
      <div className="flex flex-1 items-center justify-center p-6">
        <p className="text-sm text-ink-muted">Prospect not found.</p>
      </div>
    );
  }

  return <EmailDetail prospect={prospect} status={status} stage={stage} />;
}

export default function EmailPage() {
  return (
    <Suspense fallback={null}>
      <EmailPageContent />
    </Suspense>
  );
}
