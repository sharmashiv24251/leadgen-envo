export type ChipTone = "success" | "pending" | "neutral" | "danger" | "accent";

const toneClasses: Record<ChipTone, string> = {
  success: "border-success/40 bg-success-dim text-success",
  pending: "border-pending/40 bg-pending-dim text-pending",
  neutral: "border-border text-ink-muted",
  danger: "border-danger/40 bg-danger-dim text-danger",
  accent: "border-accent/40 bg-accent-dim text-accent",
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
      className={`inline-flex shrink-0 items-center rounded-full border px-2 py-0.5 text-[11px] font-medium ${toneClasses[tone]}`}
    >
      {children}
    </span>
  );
}
