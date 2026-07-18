import type { ChipTone } from "@/components/Chip";

// Leads/intro_sent/follow_up_sent are always computed from contacts.status + email_messages --
// never stored, never drift out of sync. meeting_booked/contract/deal_lost are the only stages a
// rep sets manually (contacts.stage / contacts.lost_reason).
export type FunnelStage =
  | "leads"
  | "intro_sent"
  | "follow_up_sent"
  | "meeting_booked"
  | "contract"
  | "deal_lost";

export type LostReason = "no_response" | "no_interest" | "not_a_match";

// The three stages a rep can drag a card into directly (vs. the computed ones, which only clear
// back to via a null override).
export const MANUAL_STAGES: FunnelStage[] = ["meeting_booked", "contract", "deal_lost"];

export const FUNNEL_COLUMNS: { key: FunnelStage; label: string; tone: ChipTone | "accent" }[] = [
  { key: "leads", label: "Leads", tone: "neutral" },
  { key: "intro_sent", label: "Intro sent", tone: "neutral" },
  { key: "follow_up_sent", label: "Follow-up sent", tone: "pending" },
  { key: "meeting_booked", label: "Meeting booked", tone: "accent" },
  { key: "contract", label: "Contract", tone: "success" },
  { key: "deal_lost", label: "Deal lost", tone: "danger" },
];

export const LOST_REASONS: { key: LostReason; label: string }[] = [
  { key: "no_response", label: "No response" },
  { key: "no_interest", label: "No interest" },
  { key: "not_a_match", label: "Not a match" },
];

// Shared between the sidebar's filter dropdown and the detail page -- see the parallel
// parseStatusFilter in lib/data.ts for why this needs to be one shared implementation.
export function parseStageFilter(raw: string | null | undefined): FunnelStage | null {
  return FUNNEL_COLUMNS.find((c) => c.key === raw)?.key ?? null;
}

// manualStage is the raw contacts.stage override, if any -- it always wins. Otherwise the stage
// is derived from whether an intro/follow-up message has actually gone out.
export function computeEffectiveStage(args: {
  manualStage: FunnelStage | null;
  introSent: boolean;
  followUpSent: boolean;
}): FunnelStage {
  if (args.manualStage) return args.manualStage;
  if (args.followUpSent) return "follow_up_sent";
  if (args.introSent) return "intro_sent";
  return "leads";
}
