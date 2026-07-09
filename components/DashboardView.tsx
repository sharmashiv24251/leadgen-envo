"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import AgentsBanner from "@/components/AgentsBanner";
import RunTrigger from "@/components/RunTrigger";
import { getAccount, isAuthenticated } from "@/lib/auth";
import { type ActivityTone } from "@/lib/data";
import { useDashboardData } from "@/lib/useAccountData";

const toneDotClasses: Record<ActivityTone, string> = {
  success: "bg-accent",
  info: "bg-ink-faint",
  warning: "bg-pending",
};

function StatPanel({
  label,
  value,
  tone = "default",
  emphasis = "default",
}: {
  label: string;
  value: string;
  tone?: "default" | "accent" | "muted";
  emphasis?: "hero" | "default" | "quiet";
}) {
  const valueClasses =
    tone === "accent"
      ? "text-accent"
      : tone === "muted"
        ? "text-ink-muted"
        : "text-ink";

  const valueSizeClasses =
    emphasis === "hero" ? "text-5xl font-semibold" : emphasis === "quiet" ? "text-xl" : "text-3xl";

  const labelClasses = emphasis === "quiet" ? "text-ink-faint" : "text-ink-muted";

  const containerClasses =
    emphasis === "hero"
      ? "border-accent/30 bg-accent-dim"
      : "border-border bg-surface shadow-[var(--shadow-panel-sm)]";

  return (
    <div className={`flex flex-col gap-3 rounded-xl border p-5 ${containerClasses}`}>
      <span className={`text-xs font-medium uppercase tracking-wide ${labelClasses}`}>
        {label}
      </span>
      <span className={`font-mono tabular-nums ${valueSizeClasses} ${valueClasses}`}>
        {value}
      </span>
    </div>
  );
}

export default function DashboardView() {
  const { stats: dashboardStats, activity: activityFeed, loading } = useDashboardData();
  const [isWorkenvo, setIsWorkenvo] = useState(false);

  useEffect(() => {
    setIsWorkenvo(isAuthenticated() && getAccount() === "workenvo");
  }, []);

  return (
    <div className="mx-auto w-full max-w-5xl flex-1 px-6 py-10 sm:px-10">
      <AgentsBanner />

      <div className="mb-8 flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-lg font-semibold text-ink">Command Center</h1>
          <p className="mt-1 text-sm text-ink-muted">
            Live outreach performance across the current campaign.
          </p>
        </div>
        {isWorkenvo && <RunTrigger />}
      </div>

      {loading && (
        <p className="mb-6 animate-pulse text-xs font-medium uppercase tracking-wide text-ink-muted">
          loading Workenvo data…
        </p>
      )}

      <div className="grid grid-cols-[repeat(auto-fit,minmax(180px,1fr))] gap-4">
        <StatPanel
          label="Reply Rate"
          value={`${dashboardStats.replyRatePct.toFixed(1)}%`}
          tone="accent"
          emphasis="hero"
        />
        <StatPanel
          label="Bounce Rate"
          value={`${dashboardStats.bounceRatePct.toFixed(1)}%`}
          tone={dashboardStats.bounceRatePct < 3 ? "accent" : "default"}
          emphasis="quiet"
        />
        <StatPanel
          label="Emails Delivered"
          value={dashboardStats.emailsDelivered.toLocaleString("en-US")}
          tone="muted"
          emphasis="quiet"
        />
        <StatPanel
          label="Total Drafted"
          value={dashboardStats.totalDrafted.toLocaleString("en-US")}
          tone="muted"
          emphasis="quiet"
        />
      </div>

      <div className="mt-10">
        <h2 className="mb-3 text-xs font-medium uppercase tracking-wide text-ink-muted">
          Recent Activity
        </h2>
        <div className="overflow-hidden rounded-xl border border-border bg-surface shadow-[var(--shadow-panel-sm)]">
          {activityFeed.length === 0 && !loading && (
            <p className="px-4 py-3 text-xs text-ink-faint">No activity yet</p>
          )}
          {activityFeed.map((event, i) => (
            <Link
              key={event.id}
              href={`/emails/${event.prospectId}`}
              className={`flex items-center gap-3 px-4 py-3 transition-colors hover:bg-surface-raised ${i !== 0 ? "border-t border-border" : ""}`}
            >
              <span
                className={`h-1.5 w-1.5 shrink-0 rounded-full ${toneDotClasses[event.tone]}`}
                aria-hidden
              />
              <span className="w-16 shrink-0 font-mono text-xs tabular-nums text-ink-faint">
                {event.timeAgo}
              </span>
              <span className="text-sm text-ink">{event.description}</span>
            </Link>
          ))}
        </div>
      </div>

      <div className="mt-8">
        <Link
          href="/emails"
          className="inline-flex items-center gap-2 text-sm font-medium text-accent transition-colors hover:text-ink"
        >
          View outreach feed →
        </Link>
      </div>
    </div>
  );
}
