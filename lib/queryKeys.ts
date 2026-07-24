import type { Account } from "@/lib/auth";

// Central query key factory. Every key is a descendant of `<account>.all`, so
// `invalidateQueries({ queryKey: workenvo.all })` can nuke a whole namespace (e.g. on
// account switch/logout) while individual leaves (senderOptions, autoSend, ...) can be
// invalidated on their own. workenvo and thehrcompany are separate namespaces so the two
// accounts' query-cache entries never collide, even if both were ever mounted in the same
// session.
export const queryKeys = {
  workenvo: {
    all: ["workenvo"] as const,
    // Prefix only (no filter suffix) -- pass to invalidateQueries to match every filter
    // combination at once (react-query invalidates by prefix match by default).
    prospectsListPrefix: () => [...queryKeys.workenvo.all, "prospects-list"] as const,
    prospectsList: (status: string | null, stage: string | null) =>
      [...queryKeys.workenvo.prospectsListPrefix(), status ?? "all", stage ?? "all"] as const,
    prospectDetail: (contactId: string) =>
      [...queryKeys.workenvo.all, "prospect-detail", contactId] as const,
    latestProspectId: (status: string | null, stage: string | null) =>
      [...queryKeys.workenvo.all, "latest-prospect-id", status ?? "all", stage ?? "all"] as const,
    allProspectsLean: () => [...queryKeys.workenvo.all, "all-prospects-lean"] as const,
    dashboardStats: () => [...queryKeys.workenvo.all, "dashboard-stats"] as const,
    recentActivity: () => [...queryKeys.workenvo.all, "recent-activity"] as const,
    senderOptions: () => [...queryKeys.workenvo.all, "sender-options"] as const,
    autoSend: () => [...queryKeys.workenvo.all, "auto-send"] as const,
    defaultSender: () => [...queryKeys.workenvo.all, "default-sender"] as const,
    threadMessages: (contactId: string) =>
      [...queryKeys.workenvo.all, "thread-messages", contactId] as const,
    messageStatus: (messageId: string) =>
      [...queryKeys.workenvo.all, "message-status", messageId] as const,
    latestRunRequest: () => [...queryKeys.workenvo.all, "run-request", "latest"] as const,
    contactNotes: (contactId: string) =>
      [...queryKeys.workenvo.all, "contact-notes", contactId] as const,
  },
  thehrcompany: {
    all: ["thehrcompany"] as const,
    prospectsListPrefix: () => [...queryKeys.thehrcompany.all, "prospects-list"] as const,
    prospectsList: (status: string | null, stage: string | null) =>
      [...queryKeys.thehrcompany.prospectsListPrefix(), status ?? "all", stage ?? "all"] as const,
    prospectDetail: (contactId: string) =>
      [...queryKeys.thehrcompany.all, "prospect-detail", contactId] as const,
    latestProspectId: (status: string | null, stage: string | null) =>
      [...queryKeys.thehrcompany.all, "latest-prospect-id", status ?? "all", stage ?? "all"] as const,
    allProspectsLean: () => [...queryKeys.thehrcompany.all, "all-prospects-lean"] as const,
    dashboardStats: () => [...queryKeys.thehrcompany.all, "dashboard-stats"] as const,
    recentActivity: () => [...queryKeys.thehrcompany.all, "recent-activity"] as const,
    senderOptions: () => [...queryKeys.thehrcompany.all, "sender-options"] as const,
    autoSend: () => [...queryKeys.thehrcompany.all, "auto-send"] as const,
    defaultSender: () => [...queryKeys.thehrcompany.all, "default-sender"] as const,
    threadMessages: (contactId: string) =>
      [...queryKeys.thehrcompany.all, "thread-messages", contactId] as const,
    messageStatus: (messageId: string) =>
      [...queryKeys.thehrcompany.all, "message-status", messageId] as const,
    latestRunRequest: () => [...queryKeys.thehrcompany.all, "run-request", "latest"] as const,
    contactNotes: (contactId: string) =>
      [...queryKeys.thehrcompany.all, "contact-notes", contactId] as const,
  },
  forAccount(account: Account) {
    return account === "workenvo" ? queryKeys.workenvo : queryKeys.thehrcompany;
  },
};
