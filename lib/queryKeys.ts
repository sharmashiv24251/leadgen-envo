import type { Account } from "@/lib/auth";

// Central query key factory. Every key is a descendant of `<account>.all`, so
// `invalidateQueries({ queryKey: workenvo.all })` can nuke a whole namespace (e.g. on
// account switch/logout) while individual leaves (senderOptions, autoSend, ...) can be
// invalidated on their own. workenvo and mock are separate namespaces so the two accounts'
// query-cache entries never collide, even if both were ever mounted in the same session.
export const queryKeys = {
  workenvo: {
    all: ["workenvo"] as const,
    data: () => [...queryKeys.workenvo.all, "data"] as const,
    senderOptions: () => [...queryKeys.workenvo.all, "sender-options"] as const,
    autoSend: () => [...queryKeys.workenvo.all, "auto-send"] as const,
    defaultSender: () => [...queryKeys.workenvo.all, "default-sender"] as const,
    emailStatus: (contactId: string) =>
      [...queryKeys.workenvo.all, "email-status", contactId] as const,
    followUpStatus: (contactId: string) =>
      [...queryKeys.workenvo.all, "follow-up-status", contactId] as const,
    latestRunRequest: () => [...queryKeys.workenvo.all, "run-request", "latest"] as const,
  },
  mock: {
    all: ["mock"] as const,
    data: () => [...queryKeys.mock.all, "data"] as const,
    senderOptions: () => [...queryKeys.mock.all, "sender-options"] as const,
    autoSend: () => [...queryKeys.mock.all, "auto-send"] as const,
    defaultSender: () => [...queryKeys.mock.all, "default-sender"] as const,
    emailStatus: (contactId: string) =>
      [...queryKeys.mock.all, "email-status", contactId] as const,
    followUpStatus: (contactId: string) =>
      [...queryKeys.mock.all, "follow-up-status", contactId] as const,
    latestRunRequest: () => [...queryKeys.mock.all, "run-request", "latest"] as const,
  },
  forAccount(account: Account) {
    return account === "workenvo" ? queryKeys.workenvo : queryKeys.mock;
  },
};
