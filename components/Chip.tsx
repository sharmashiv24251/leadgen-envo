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
  // app's usual neutral dark surface -- the tone-tinted styles below assume a dark
  // neutral backdrop, so on-color chips get a translucent scrim instead. Darkening any of
  // the six stage fills with a black overlay only raises contrast against white text, so
  // this one treatment is safe on all of them without per-tone/per-stage checking.
  onColor?: boolean;
  children: React.ReactNode;
}) {
  const className = onColor ? "border-white/20 bg-black/20 text-accent-ink" : toneClasses[tone];
  return (
    <span
      className={`inline-flex shrink-0 items-center rounded-full border px-2 py-0.5 text-[11px] font-medium ${className}`}
    >
      {children}
    </span>
  );
}
