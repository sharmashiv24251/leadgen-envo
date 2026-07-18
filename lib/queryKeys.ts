import type { Account } from "@/lib/auth";

// Central query key factory. Every key is a descendant of `<account>.all`, so
// `invalidateQueries({ queryKey: workenvo.all })` can nuke a whole namespace (e.g. on
// account switch/logout) while individual leaves (senderOptions, autoSend, ...) can be
// invalidated on their own. workenvo and mock are separate namespaces so the two accounts'
// query-cache entries never collide, even if both were ever mounted in the same session.
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
  mock: {
    all: ["mock"] as const,
    prospectsListPrefix: () => [...queryKeys.mock.all, "prospects-list"] as const,
    prospectsList: (status: string | null, stage: string | null) =>
      [...queryKeys.mock.prospectsListPrefix(), status ?? "all", stage ?? "all"] as const,
    prospectDetail: (contactId: string) =>
      [...queryKeys.mock.all, "prospect-detail", contactId] as const,
    latestProspectId: (status: string | null, stage: string | null) =>
      [...queryKeys.mock.all, "latest-prospect-id", status ?? "all", stage ?? "all"] as const,
    allProspectsLean: () => [...queryKeys.mock.all, "all-prospects-lean"] as const,
    dashboardStats: () => [...queryKeys.mock.all, "dashboard-stats"] as const,
    recentActivity: () => [...queryKeys.mock.all, "recent-activity"] as const,
    senderOptions: () => [...queryKeys.mock.all, "sender-options"] as const,
    autoSend: () => [...queryKeys.mock.all, "auto-send"] as const,
    defaultSender: () => [...queryKeys.mock.all, "default-sender"] as const,
    threadMessages: (contactId: string) =>
      [...queryKeys.mock.all, "thread-messages", contactId] as const,
    messageStatus: (messageId: string) =>
      [...queryKeys.mock.all, "message-status", messageId] as const,
    latestRunRequest: () => [...queryKeys.mock.all, "run-request", "latest"] as const,
    contactNotes: (contactId: string) =>
      [...queryKeys.mock.all, "contact-notes", contactId] as const,
  },
  forAccount(account: Account) {
    return account === "workenvo" ? queryKeys.workenvo : queryKeys.mock;
  },
};
