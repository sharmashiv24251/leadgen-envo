"use client";

import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { type ProspectStatus } from "@/lib/data";
import { useProspects } from "@/lib/useAccountData";
import EmailsAutoOpen from "@/components/EmailsAutoOpen";

const VALID_STATUSES: ProspectStatus[] = [
  "DRAFTED",
  "DELIVERED",
  "BOUNCED",
  "RESPONDED",
];

function EmailsIndexContent() {
  const searchParams = useSearchParams();
  const status = searchParams.get("status");
  const { prospects, loading } = useProspects();

  if (loading || prospects.length === 0) return null;

  const activeStatus = VALID_STATUSES.find((s) => s === status?.toUpperCase());
  const target = activeStatus
    ? (prospects.find((p) => p.status === activeStatus) ?? prospects[0])
    : prospects[0];

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
