import Link from "next/link";
import { activityFeed, dashboardStats, type ActivityTone } from "@/lib/data";

const toneDotClasses: Record<ActivityTone, string> = {
  success: "bg-accent",
  info: "bg-ink-faint",
  warning: "bg-pending",
};

function StatPanel({
  label,
  value,
  tone = "default",
  size = "default",
}: {
  label: string;
  value: string;
  tone?: "default" | "accent" | "muted";
  size?: "default" | "small";
}) {
  const valueClasses =
    tone === "accent"
      ? "text-accent"
      : tone === "muted"
        ? "text-ink-muted"
        : "text-ink";

  return (
    <div className="flex flex-col gap-3 rounded-[4px] border border-border bg-surface p-5">
      <span className="font-mono text-[11px] uppercase tracking-wider text-ink-muted">
        {label}
      </span>
      <span
        className={`font-mono tabular-nums ${size === "small" ? "text-xl" : "text-3xl"} ${valueClasses}`}
      >
        {value}
      </span>
    </div>
  );
}

export default function DashboardView() {
  return (
    <div className="mx-auto w-full max-w-5xl flex-1 px-6 py-10 sm:px-10">
      <div className="mb-8">
        <h1 className="text-lg font-semibold text-ink">Command Center</h1>
        <p className="mt-1 text-sm text-ink-muted">
          Live outreach performance across the current campaign.
        </p>
      </div>

      <div className="grid grid-cols-[repeat(auto-fit,minmax(180px,1fr))] gap-4">
        <StatPanel
          label="Emails Delivered"
          value={dashboardStats.emailsDelivered.toLocaleString("en-US")}
        />
        <StatPanel
          label="Bounce Rate"
          value={`${dashboardStats.bounceRatePct.toFixed(1)}%`}
          tone={dashboardStats.bounceRatePct < 3 ? "accent" : "default"}
        />
        <StatPanel
          label="Reply Rate"
          value={`${dashboardStats.replyRatePct.toFixed(1)}%`}
          tone="accent"
        />
        <StatPanel
          label="Total Drafted"
          value={dashboardStats.totalDrafted.toLocaleString("en-US")}
        />
      </div>

      <div className="mt-10">
        <h2 className="mb-3 font-mono text-[11px] uppercase tracking-wider text-ink-muted">
          Recent Activity
        </h2>
        <div className="overflow-hidden rounded-[4px] border border-border bg-surface">
          {activityFeed.map((event, i) => (
            <div
              key={event.id}
              className={`flex items-center gap-3 px-4 py-3 ${i !== 0 ? "border-t border-border" : ""}`}
            >
              <span
                className={`h-1.5 w-1.5 shrink-0 rounded-full ${toneDotClasses[event.tone]}`}
                aria-hidden
              />
              <span className="w-16 shrink-0 font-mono text-xs tabular-nums text-ink-faint">
                {event.timeAgo}
              </span>
              <span className="text-sm text-ink">{event.description}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="mt-8">
        <Link
          href="/emails"
          className="inline-flex items-center gap-2 font-mono text-sm text-accent transition-colors hover:text-ink"
        >
          View outreach feed →
        </Link>
      </div>
    </div>
  );
}
