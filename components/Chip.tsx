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
  onColor = false,
  children,
}: {
  tone?: ChipTone;
  // For chips rendered on top of a full-color fill (e.g. Funnel cards) rather than the
  // app's usual neutral surface -- the tone-tinted styles below assume sitting on
  // --surface/--bg, so on-color chips get a translucent "glass tag" scrim instead, paired
  // with --ink (dark text on day's light stage fills, white-ish on night's dark ones --
  // see the --stage-scrim* tokens in globals.css for why each theme goes the opposite
  // direction).
  onColor?: boolean;
  children: React.ReactNode;
}) {
  const className = onColor
    ? "border-stage-scrim-border bg-stage-scrim text-stage-ink"
    : toneClasses[tone];
  return (
    <span
      className={`inline-flex shrink-0 items-center rounded-full border px-2 py-0.5 text-[11px] font-medium ${className}`}
    >
      {children}
    </span>
  );
}
