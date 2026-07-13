"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import AgentsBanner from "@/components/AgentsBanner";
import AutoSendToggle from "@/components/AutoSendToggle";
import RunTrigger from "@/components/RunTrigger";
import { getAccount, isAuthenticated } from "@/lib/auth";
import { type ActivityTone } from "@/lib/data";
import { useDashboardData } from "@/lib/useAccountData";

const toneDotClasses: Record<ActivityTone, string> = {
  success: "bg-success",
  info: "bg-ink-faint",
  warning: "bg-pending",
};

function TargetGlyph() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden>
      <circle cx="8" cy="8" r="6" stroke="white" strokeWidth="1.4" />
      <circle cx="8" cy="8" r="2.4" fill="white" />
    </svg>
  );
}

function ChatGlyph() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden>
      <path
        d="M2 4.5A1.5 1.5 0 0 1 3.5 3h9A1.5 1.5 0 0 1 14 4.5v5A1.5 1.5 0 0 1 12.5 11H8l-3 2.5V11H3.5A1.5 1.5 0 0 1 2 9.5v-5Z"
        stroke="white"
        strokeWidth="1.3"
        strokeLinejoin="round"
      />
      <path d="M5 6.5h6M5 8.7h3.5" stroke="white" strokeWidth="1.3" strokeLinecap="round" />
    </svg>
  );
}

function SendGlyph() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden>
      <path
        d="M13.8 2.2 2.4 6.7c-.5.2-.5.9.1 1.1l4 1.4 1.4 4c.2.6.9.6 1.1.1L13.5 2.5c.2-.4-.2-.8-.6-.6Z"
        stroke="white"
        strokeWidth="1.3"
        strokeLinejoin="round"
      />
      <path d="M6.5 9.2 13.4 2.5" stroke="white" strokeWidth="1.3" strokeLinecap="round" />
    </svg>
  );
}

function DraftGlyph() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden>
      <path
        d="M10.8 2.6 13.4 5.2 5.5 13 2 14l1-3.5 7.8-7.9Z"
        stroke="white"
        strokeWidth="1.3"
        strokeLinejoin="round"
      />
    </svg>
  );
}

const STAT_ICON_BG: Record<"success" | "accent" | "pending" | "muted", string> = {
  success: "bg-success",
  accent: "bg-accent",
  pending: "bg-pending",
  muted: "bg-ink-faint",
};

function StatPanel({
  label,
  value,
  icon,
  tone = "muted",
  hero = false,
}: {
  label: string;
  value: string;
  icon: "target" | "chat" | "send" | "draft";
  tone?: "success" | "muted";
  hero?: boolean;
}) {
  // target/chat are the "good news" metrics — their icon color follows whether
  // the number actually earns it (tone), not just its category. send/draft are
  // plain categorical facts, always the same color regardless of value. The
  // hero card overrides all of this with a fixed solid-blue treatment below.
  const iconBgTone: "success" | "accent" | "pending" | "muted" =
    icon === "send" ? "accent" : icon === "draft" ? "pending" : tone;

  const Glyph = icon === "target" ? TargetGlyph : icon === "chat" ? ChatGlyph : icon === "send" ? SendGlyph : DraftGlyph;

  const valueClasses = hero ? "text-accent-ink" : tone === "success" ? "text-success" : "text-ink";
  const labelClasses = hero ? "text-accent-ink/90" : "text-ink-muted";

  // All four cards carry equal visual weight — the hero card is set apart by
  // color (its solid-blue fill), not by making its number bigger than the rest.
  const valueSizeClasses = "text-4xl font-semibold";

  // --accent-strong (not --accent) is deep enough that white text/labels clear
  // WCAG AA 4.5:1 here — --accent itself is tuned for buttons/links, not for
  // small text sitting directly on top of it.
  const containerClasses = hero
    ? "border-transparent bg-accent-strong"
    : "border-border bg-surface shadow-[var(--shadow-panel-sm)]";

  const iconSwatchClasses = hero ? "bg-white/15" : STAT_ICON_BG[iconBgTone];

  return (
    <div className={`flex flex-col gap-4 rounded-2xl border p-5 ${containerClasses}`}>
      <div className="flex items-center gap-2.5">
        <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-[9px] ${iconSwatchClasses}`}>
          <Glyph />
        </span>
        <span className={`text-sm ${labelClasses}`}>{label}</span>
      </div>
      <span className={`tabular-nums ${valueSizeClasses} ${valueClasses}`}>{value}</span>
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
    <div className="w-full flex-1 px-6 py-8 sm:px-10">
      <AgentsBanner />

      <div className="mb-8 flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-ink">Command Center</h1>
          <p className="mt-1 text-sm text-ink-muted">
            Live outreach performance across the current campaign.
          </p>
        </div>
        {isWorkenvo && (
          <div className="flex flex-wrap items-center gap-3">
            <AutoSendToggle />
            <RunTrigger />
          </div>
        )}
      </div>

      {loading && (
        <p className="mb-6 animate-pulse text-sm text-ink-muted">Loading Workenvo data…</p>
      )}

      <div className="grid grid-cols-[repeat(auto-fit,minmax(200px,1fr))] gap-4">
        <StatPanel
          label="Total leads found"
          value={dashboardStats.totalDrafted.toLocaleString("en-US")}
          icon="target"
          hero
        />
        <StatPanel
          label="Reply rate"
          value={`${dashboardStats.replyRatePct.toFixed(1)}%`}
          icon="chat"
          tone={dashboardStats.replyRatePct > 0 ? "success" : "muted"}
        />
        <StatPanel
          label="Emails delivered"
          value={dashboardStats.emailsDelivered.toLocaleString("en-US")}
          icon="send"
        />
        <StatPanel
          label="Total drafted"
          value={dashboardStats.totalDrafted.toLocaleString("en-US")}
          icon="draft"
        />
      </div>

      <div className="mt-10">
        <h2 className="mb-3 text-sm font-medium text-ink-muted">Recent activity</h2>
        <div className="overflow-hidden rounded-2xl border border-border bg-surface shadow-[var(--shadow-panel-sm)]">
          {activityFeed.length === 0 && !loading && (
            <p className="px-4 py-3 text-sm text-ink-muted">No activity yet</p>
          )}
          {activityFeed.map((event, i) => (
            <Link
              key={event.id}
              href={`/emails/${event.prospectId}`}
              className={`flex items-center gap-3 px-4 py-3 transition-colors active:scale-[0.99] hover:bg-surface-raised ${i !== 0 ? "border-t border-border" : ""}`}
            >
              <span
                className={`h-1.5 w-1.5 shrink-0 rounded-full ${toneDotClasses[event.tone]}`}
                aria-hidden
              />
              <span className="w-16 shrink-0 text-xs tabular-nums text-ink-muted">
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
          className="inline-flex items-center gap-2 text-sm font-medium text-accent transition-colors hover:text-ink active:opacity-70"
        >
          View outreach feed →
        </Link>
      </div>
    </div>
  );
}
