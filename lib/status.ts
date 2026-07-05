import type { ChipTone } from "@/components/Chip";
import type { ProspectStatus } from "@/lib/data";

// RESPONDED is the only status on the bright accent green — it's the win.
// SENT/DELIVERED stay neutral so they don't compete with it for attention.
export const statusTone: Record<ProspectStatus, ChipTone> = {
  DRAFTED: "pending",
  SENT: "neutral",
  DELIVERED: "neutral",
  BOUNCED: "danger",
  RESPONDED: "accent",
};
