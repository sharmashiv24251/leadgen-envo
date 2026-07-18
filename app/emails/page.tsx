"use client";

import { useQuery } from "@tanstack/react-query";
import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { type ProspectStatus } from "@/lib/data";
import { FUNNEL_COLUMNS, type FunnelStage } from "@/lib/funnel";
import { fetchLatestProspectId } from "@/lib/outreachApi";
import { queryKeys } from "@/lib/queryKeys";
import { useAccountMode } from "@/lib/useAccountData";
import EmailsAutoOpen from "@/components/EmailsAutoOpen";

const VALID_STATUSES: ProspectStatus[] = [
  "DRAFTED",
  "DELIVERED",
  "BOUNCED",
  "RESPONDED",
];

type LatestMatch = { id: string; matchedFilter: boolean };

function EmailsIndexContent() {
  const searchParams = useSearchParams();
  const status = searchParams.get("status");
  const stage = searchParams.get("stage");
  const account = useAccountMode();
  const keys = queryKeys.forAccount(account);

  const activeStatus = VALID_STATUSES.find((s) => s === status?.toUpperCase()) ?? null;
  const activeStage: FunnelStage | null = FUNNEL_COLUMNS.find((c) => c.key === stage)?.key ?? null;

  // Falls back to the unfiltered latest prospect if nothing matches the active filter --
  // same "always land somewhere" behavior the old array-filtering version had, just as one
  // small query instead of requiring the full prospect list to already be loaded.
  const { data: target, isLoading } = useQuery({
    queryKey: keys.latestProspectId(activeStatus, activeStage),
    queryFn: async (): Promise<LatestMatch | null> => {
      const filtered = await fetchLatestProspectId({ status: activeStatus, stage: activeStage });
      if (filtered) return { id: filtered, matchedFilter: true };
      if (!activeStatus && !activeStage) return null;
      const fallback = await fetchLatestProspectId({ status: null, stage: null });
      return fallback ? { id: fallback, matchedFilter: false } : null;
    },
  });

  if (isLoading || !target) return null;

  const params = new URLSearchParams();
  if (activeStatus && target.matchedFilter) params.set("status", status!);
  if (activeStage && target.matchedFilter) params.set("stage", stage!);
  const targetHref = `/emails/${target.id}${params.toString() ? `?${params.toString()}` : ""}`;

  return <EmailsAutoOpen targetHref={targetHref} />;
}

export default function EmailsIndexPage() {
  return (
    <Suspense fallback={null}>
      <EmailsIndexContent />
    </Suspense>
  );
}
