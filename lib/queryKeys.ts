// Central query key factory for the Workenvo (real-data) account. Every key is a
// descendant of `workenvo.all`, so `invalidateQueries({ queryKey: workenvo.all })`
// can nuke the whole namespace (e.g. on account switch/logout) while individual
// leaves (senderOptions, autoSend, ...) can be invalidated on their own.
export const queryKeys = {
  workenvo: {
    all: ["workenvo"] as const,
    data: () => [...queryKeys.workenvo.all, "data"] as const,
    senderOptions: () => [...queryKeys.workenvo.all, "sender-options"] as const,
    autoSend: () => [...queryKeys.workenvo.all, "auto-send"] as const,
    defaultSender: () => [...queryKeys.workenvo.all, "default-sender"] as const,
    emailStatus: (contactId: string) =>
      [...queryKeys.workenvo.all, "email-status", contactId] as const,
    latestRunRequest: () => [...queryKeys.workenvo.all, "run-request", "latest"] as const,
  },
};
