"use client";

import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { type Prospect, type ProspectStatus } from "@/lib/data";
import { useProspects } from "@/lib/useAccountData";
import EmailsAutoOpen from "@/components/EmailsAutoOpen";

const VALID_STATUSES: ProspectStatus[] = [
  "DRAFTED",
  "DELIVERED",
  "BOUNCED",
  "RESPONDED",
];

/** Most recent prospect in the list — lowest daysAgo, not array order (source order isn't guaranteed recency-sorted). */
function latestOf(list: Prospect[]): Prospect {
  return list.reduce((latest, p) => (p.daysAgo < latest.daysAgo ? p : latest));
}

function EmailsIndexContent() {
  const searchParams = useSearchParams();
  const status = searchParams.get("status");
  const { prospects, loading } = useProspects();

  if (loading || prospects.length === 0) return null;

  const activeStatus = VALID_STATUSES.find((s) => s === status?.toUpperCase());
  const matching = activeStatus ? prospects.filter((p) => p.status === activeStatus) : prospects;
  const target = latestOf(matching.length > 0 ? matching : prospects);

  const targetHref = `/emails/${target.id}${activeStatus ? `?status=${status}` : ""}`;

  return <EmailsAutoOpen targetHref={targetHref} />;
}

export default function EmailsIndexPage() {
  return (
    <Suspense fallback={null}>
      <EmailsIndexContent />
    </Suspense>
  );
}
