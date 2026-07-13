const agents = [
  { label: "Researching", tone: "success" },
  { label: "Finding lead", tone: "pending" },
  { label: "Drafting email", tone: "accent" },
] as const;

const dotClasses: Record<(typeof agents)[number]["tone"], string> = {
  success: "bg-success",
  pending: "bg-pending",
  accent: "bg-accent",
};

export default function AgentsBanner() {
  return (
    <div className="mb-8 flex flex-wrap items-center justify-between gap-x-6 gap-y-3 rounded-2xl border border-accent/25 bg-accent-dim px-5 py-4">
      <div className="flex flex-wrap items-center gap-3">
        <span className="relative flex h-2 w-2 shrink-0" aria-hidden>
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-accent opacity-75" />
          <span className="relative inline-flex h-2 w-2 rounded-full bg-accent" />
        </span>
        <span className="text-sm font-medium text-ink">Agents live</span>
        <span className="text-ink-faint" aria-hidden>
          ·
        </span>
        <span className="text-sm text-ink-muted">10 emails / day</span>
      </div>

      <div className="flex flex-wrap items-center gap-4">
        {agents.map((agent, i) => (
          <span key={agent.label} className="flex items-center gap-1.5 text-xs text-ink-muted">
            <span
              className={`h-1.5 w-1.5 shrink-0 rounded-full ${dotClasses[agent.tone]}`}
              style={{ animation: `agent-breathe 2.2s ease-in-out ${i * 0.3}s infinite` }}
              aria-hidden
            />
            {agent.label}
          </span>
        ))}
      </div>
    </div>
  );
}
