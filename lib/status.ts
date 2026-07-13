import type { ChipTone } from "@/components/Chip";
import type { ProspectStatus } from "@/lib/data";

// RESPONDED is the only status on success green — it's the win.
// DELIVERED stays neutral so it doesn't compete with it for attention.
// SENDING is deliberately not "pending" (that reads as "needs your attention"
// like DRAFTED) — it's already moving, just not confirmed dispatched yet.
export const statusTone: Record<ProspectStatus, ChipTone> = {
  DRAFTED: "pending",
  SENDING: "neutral",
  DELIVERED: "neutral",
  BOUNCED: "danger",
  RESPONDED: "success",
};
