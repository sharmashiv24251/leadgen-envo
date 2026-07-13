"use client";

import { Suspense } from "react";
import { useParams, useSearchParams } from "next/navigation";
import EmailDetail from "@/components/EmailDetail";
import { EmailDetailSkeleton } from "@/components/Skeleton";
import { useProspects } from "@/lib/useAccountData";

function EmailPageContent() {
  const params = useParams<{ id: string }>();
  const searchParams = useSearchParams();
  const status = searchParams.get("status") ?? undefined;
  const { prospects, loading } = useProspects();

  const prospect = prospects.find((p) => p.id === params.id);

  if (!prospect) {
    if (loading) return <EmailDetailSkeleton />;
    return (
      <div className="flex flex-1 items-center justify-center p-6">
        <p className="text-sm text-ink-muted">Prospect not found.</p>
      </div>
    );
  }

  return <EmailDetail prospect={prospect} status={status} />;
}

export default function EmailPage() {
  return (
    <Suspense fallback={null}>
      <EmailPageContent />
    </Suspense>
  );
}
