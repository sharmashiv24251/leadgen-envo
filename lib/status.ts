import type { ChipTone } from "@/components/Chip";
import type { ProspectStatus } from "@/lib/data";

export const statusTone: Record<ProspectStatus, ChipTone> = {
  DRAFTED: "pending",
  SENT: "accent",
  DELIVERED: "accent",
  BOUNCED: "danger",
  RESPONDED: "info",
};
