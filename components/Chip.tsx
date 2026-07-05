export type ChipTone = "accent" | "pending" | "neutral" | "danger" | "info";

const toneClasses: Record<ChipTone, string> = {
  accent: "border-accent/40 bg-accent-dim text-accent",
  pending: "border-pending/40 bg-pending-dim text-pending",
  neutral: "border-border text-ink-muted",
  danger: "border-danger/40 bg-danger-dim text-danger",
  info: "border-info/40 bg-info-dim text-info",
};

export default function Chip({
  tone = "neutral",
  children,
}: {
  tone?: ChipTone;
  children: React.ReactNode;
}) {
  return (
    <span
      className={`inline-flex shrink-0 items-center rounded-[3px] border px-1.5 py-0.5 font-mono text-[10px] uppercase tracking-wider ${toneClasses[tone]}`}
    >
      {children}
    </span>
  );
}
