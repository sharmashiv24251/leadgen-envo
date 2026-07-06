const agents = [
  { tooltip: "Researching", color: "var(--accent)" },
  { tooltip: "Finding lead", color: "var(--pending)" },
  { tooltip: "Drafting email", color: "#8ab4f8" },
] as const;

function PixelAgent({ color }: { color: string }) {
  const eyeClass =
    "origin-center transition-transform duration-200 group-hover:scale-[1.9]";
  const eyeStyle: React.CSSProperties = { transformBox: "fill-box" };

  return (
    <svg viewBox="0 0 8 8" width={18} height={18} shapeRendering="crispEdges" aria-hidden>
      <rect x="3" y="0" width="1" height="1" fill={color} />
      <rect x="1" y="1" width="6" height="5" fill={color} />
      <rect x="2" y="3" width="1" height="1" fill="#0b0b0b" className={eyeClass} style={eyeStyle} />
      <rect x="5" y="3" width="1" height="1" fill="#0b0b0b" className={eyeClass} style={eyeStyle} />
      <rect x="1" y="6" width="1" height="1" fill={color} />
      <rect x="6" y="6" width="1" height="1" fill={color} />
    </svg>
  );
}

export default function AgentsBanner() {
  return (
    <div className="mb-8 rounded-xl border border-accent/25 bg-accent-dim px-5 py-4">
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

      <div className="mt-3 flex items-center justify-end gap-2">
        {agents.map((agent) => (
          <div key={agent.tooltip} className="group relative" title={agent.tooltip}>
            <div className="pointer-events-none absolute bottom-full right-0 mb-2 whitespace-nowrap rounded-lg border border-border bg-surface-raised px-2.5 py-1.5 text-xs text-ink opacity-0 shadow-[var(--shadow-panel)] transition-opacity group-hover:opacity-100">
              {agent.tooltip}
            </div>
            <PixelAgent color={agent.color} />
          </div>
        ))}
      </div>
    </div>
  );
}
