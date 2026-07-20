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

export const FUNNEL_COLUMNS: { key: FunnelStage; label: string; tone: ChipTone }[] = [
  { key: "leads", label: "Leads", tone: "neutral" },
  { key: "intro_sent", label: "Intro sent", tone: "neutral" },
  { key: "follow_up_sent", label: "Follow-up sent", tone: "pending" },
  { key: "meeting_booked", label: "Meeting booked", tone: "accent" },
  { key: "contract", label: "Contract", tone: "success" },
  { key: "deal_lost", label: "Deal lost", tone: "danger" },
];

// Shared by any UI that needs to render a stage as a label + tone (sidebar row chip, Funnel
// card chip, detail-page chip) -- every FunnelStage has a matching FUNNEL_COLUMNS entry by
// construction, so the fallback here is just a defensive non-null guard, never real data.
export function getFunnelColumn(stage: FunnelStage): { key: FunnelStage; label: string; tone: ChipTone } {
  return FUNNEL_COLUMNS.find((c) => c.key === stage) ?? FUNNEL_COLUMNS[0];
}

// The Funnel Kanban card's full solid-fill background, one distinct color per stage (see the
// --stage-* tokens in app/globals.css for the WCAG/CVD tuning notes) -- deliberately separate
// from FUNNEL_COLUMNS' `tone` field above, which stays on the shared 5-value ChipTone system
// used by chips elsewhere (detail page, sidebar) that were never meant to carry 6 unique hues.
export const FUNNEL_STAGE_CARD_BG: Record<FunnelStage, string> = {
  leads: "bg-stage-leads",
  intro_sent: "bg-stage-intro",
  follow_up_sent: "bg-stage-followup",
  meeting_booked: "bg-stage-meeting",
  contract: "bg-stage-contract",
  deal_lost: "bg-stage-lost",
};

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
