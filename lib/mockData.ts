"use client";

import {
  computeDashboardStats,
  activityFeed as seedActivity,
  prospects as seedProspects,
  type ActivityEvent,
  type ContactNote,
  type DashboardStats,
  type Prospect,
  type ProspectListItem,
  type ProspectStatus,
  type ThreadMessage,
} from "@/lib/data";
import { computeEffectiveStage, type FunnelStage, type LostReason } from "@/lib/funnel";
import type { ProspectPage, RunRequest, SenderOption } from "@/lib/workenvoData";

// In-memory store for the thehrcompany account — there's no backend behind this login,
// so edits/sends need to persist for the session somewhere. Seeded once from the static
// mock dataset; every mutation below updates this array so the UI reflects what the user
// just did instead of snapping back to the seed data on the next fetch.
let mockProspects: Prospect[] = seedProspects.map((p) => ({ ...p }));

// Manual funnel-stage overrides for this account, same model as the real one (lib/funnel.ts) --
// there's no follow-up concept in mock data, so followUpSent is always false here.
const mockStageOverrides = new Map<string, { stage: FunnelStage; lostReason: LostReason | null }>();

export async function setContactStage(
  contactId: string,
  stage: FunnelStage | null,
  lostReason: LostReason | null
): Promise<void> {
  if (stage) mockStageOverrides.set(contactId, { stage, lostReason });
  else mockStageOverrides.delete(contactId);

  mockProspects = mockProspects.map((p) => {
    if (p.id !== contactId) return p;
    const override = mockStageOverrides.get(contactId) ?? null;
    const effectiveStage = computeEffectiveStage({
      manualStage: override?.stage ?? null,
      introSent: p.status !== "DRAFTED",
      followUpSent: false,
    });
    return {
      ...p,
      stage: effectiveStage,
      lostReason: effectiveStage === "deal_lost" ? (override?.lostReason ?? null) : null,
    };
  });
}

// Same append-only model as the real account's contact_notes table -- no edit/delete here either.
let mockNoteIdCounter = 0;
const mockContactNotes = new Map<string, ContactNote[]>();

export async function fetchContactNotes(contactId: string): Promise<ContactNote[]> {
  return mockContactNotes.get(contactId) ?? [];
}

export async function addContactNote(contactId: string, author: string, text: string): Promise<void> {
  const list = mockContactNotes.get(contactId) ?? [];
  const note: ContactNote = {
    id: `mock-note-${mockNoteIdCounter++}`,
    author,
    text,
    createdAt: new Date().toISOString(),
  };
  mockContactNotes.set(contactId, [note, ...list]);
}

export async function updateContactNote(noteId: string, text: string): Promise<void> {
  for (const [contactId, list] of mockContactNotes) {
    if (list.some((n) => n.id === noteId)) {
      mockContactNotes.set(
        contactId,
        list.map((n) => (n.id === noteId ? { ...n, text } : n))
      );
      return;
    }
  }
}

export async function deleteContactNote(noteId: string): Promise<void> {
  for (const [contactId, list] of mockContactNotes) {
    if (list.some((n) => n.id === noteId)) {
      mockContactNotes.set(contactId, list.filter((n) => n.id !== noteId));
      return;
    }
  }
}

// Sender identities lifted from the mock email sign-offs (Sana Whitfield / Niall / Sean
// already appear as the "From" name in lib/data.ts's drafted bodies) so the sender picker
// matches who the emails claim to be from.
const HR_SENDER_OPTIONS: SenderOption[] = [
  { name: "Sana Whitfield", email: "sana.whitfield@thehrcompany.com" },
  { name: "Niall Byrne", email: "niall.byrne@thehrcompany.com" },
  { name: "Sean Doyle", email: "sean.doyle@thehrcompany.com" },
];

const AUTO_SEND_KEY = "thc-mock-auto-send";
const DEFAULT_SENDER_KEY = "thc-mock-default-sender";

function readLocalBool(key: string, fallback: boolean): boolean {
  if (typeof window === "undefined") return fallback;
  const raw = window.localStorage.getItem(key);
  return raw === null ? fallback : raw === "true";
}

function readLocalString(key: string, fallback: string): string {
  if (typeof window === "undefined") return fallback;
  return window.localStorage.getItem(key) || fallback;
}

function matchesFilters(
  p: Prospect,
  status: ProspectStatus | null,
  stage: FunnelStage | null
): boolean {
  if (status && p.status !== status) return false;
  if (stage && p.stage !== stage) return false;
  return true;
}

function toListItem(p: Prospect): ProspectListItem {
  return {
    id: p.id,
    name: p.name,
    title: p.title,
    company: p.company,
    subject: p.subject,
    status: p.status,
    stage: p.stage,
    daysAgo: p.daysAgo,
  };
}

// Mock data never exceeds PAGE_SIZE (11 seed prospects), so this is always "page 1, no more" --
// still wired through the same paginated interface the real account uses so both accounts share
// hook code (lib/useAccountData.ts). Full Prospect objects (not the lean list item) -- mock
// prospects already carry everything, and the real account's list is rich too now (bounded to
// the page size), so the detail page can reuse an already-loaded row instantly either way.
export async function fetchProspectsPage(args: {
  cursor: string | null;
  status: ProspectStatus | null;
  stage: FunnelStage | null;
}): Promise<ProspectPage> {
  const items = mockProspects.filter((p) => matchesFilters(p, args.status, args.stage));
  return { items, nextCursor: null };
}

// Mirrors fetchProspectsPage's real-account counterpart -- the Funnel board needs everything
// at once regardless of account.
export async function fetchAllProspectsLean(): Promise<ProspectListItem[]> {
  return mockProspects.map(toListItem);
}

export async function fetchLatestProspectId(args: {
  status: ProspectStatus | null;
  stage: FunnelStage | null;
}): Promise<string | null> {
  const filtered = mockProspects.filter((p) => matchesFilters(p, args.status, args.stage));
  if (filtered.length === 0) return null;
  // Lower daysAgo = more recent -- the mock equivalent of "order by created_at desc".
  return filtered.reduce((latest, p) => (p.daysAgo < latest.daysAgo ? p : latest)).id;
}

export async function fetchProspectById(contactId: string): Promise<Prospect | null> {
  return mockProspects.find((p) => p.id === contactId) ?? null;
}

export async function fetchDashboardStats(): Promise<DashboardStats> {
  return {
    ...computeDashboardStats(mockProspects),
    icpHealthPct: 88,
    icpHealthNote: "Steady sourcing across this week's runs.",
  };
}

export async function fetchRecentActivity(): Promise<ActivityEvent[]> {
  return seedActivity;
}

// Synthetic thread built from this account's flat Prospect fields (subject/body/response) --
// there's no email_messages table behind this account, so "the thread" is just those fields
// reshaped into the same ordered-message form the real account's ThreadView expects. Message
// ids encode which Prospect field they came from (`${contactId}::intro`/`::reply`), so the
// mutation functions below can parse them back without a second store to keep in sync.
const MOCK_THREAD_ID = "mock-thread";

function introStatusFor(prospect: Prospect): ThreadMessage["status"] {
  if (prospect.status === "SENDING") return "approved";
  if (prospect.status === "DELIVERED" || prospect.status === "RESPONDED") return "sent";
  if (prospect.status === "BOUNCED") return "failed";
  return "draft";
}

type MockCustomReply = { id: string; body: string; sentAt: string };
const mockCustomReplies = new Map<string, MockCustomReply[]>();

export async function fetchThreadMessages(contactId: string): Promise<ThreadMessage[]> {
  const prospect = mockProspects.find((p) => p.id === contactId);
  if (!prospect) return [];

  const introStatus = introStatusFor(prospect);
  const baseTime = Date.now() - prospect.daysAgo * 86_400_000;
  const messages: ThreadMessage[] = [
    {
      id: `${contactId}::intro`, type: "intro", direction: "outbound",
      subject: prospect.subject, body: prospect.body, status: introStatus,
      gmailThreadId: introStatus === "sent" ? MOCK_THREAD_ID : null,
      occurredAt: new Date(baseTime).toISOString(),
    },
  ];

  if (prospect.response) {
    messages.push({
      id: `${contactId}::reply`, type: "reply", direction: "inbound",
      subject: `Re: ${prospect.subject}`, body: prospect.response, status: "received",
      gmailThreadId: MOCK_THREAD_ID, occurredAt: new Date(baseTime + 3_600_000).toISOString(),
    });
  }

  for (const custom of mockCustomReplies.get(contactId) ?? []) {
    messages.push({
      id: custom.id, type: "custom", direction: "outbound",
      subject: `Re: ${prospect.subject}`, body: custom.body, status: "sent",
      gmailThreadId: MOCK_THREAD_ID, occurredAt: custom.sentAt,
    });
  }

  return messages.sort((a, b) => new Date(a.occurredAt).getTime() - new Date(b.occurredAt).getTime());
}

// Only the intro is ever editable/approvable in this account -- no seed prospect carries a
// follow-up draft, so `::intro` is the only message-id shape these need to recognize.
function parseMockIntroId(messageId: string): string | null {
  const [contactId, kind] = messageId.split("::");
  return kind === "intro" ? contactId : null;
}

export async function updateMessageDraft(
  messageId: string,
  updates: { subject: string; body: string }
): Promise<void> {
  const contactId = parseMockIntroId(messageId);
  if (!contactId) return;
  mockProspects = mockProspects.map((p) => (p.id === contactId ? { ...p, ...updates } : p));
}

const pendingSendTimers = new Map<string, ReturnType<typeof setTimeout>>();

// Best-case send simulation: SENDING for a beat, then DELIVERED — no failure path,
// since this account has no real mail server to fail against.
export async function approveMessageDraft(messageId: string, _sendFrom?: string): Promise<void> {
  const contactId = parseMockIntroId(messageId);
  if (!contactId) return;
  mockProspects = mockProspects.map((p) => (p.id === contactId ? { ...p, status: "SENDING" } : p));

  const existing = pendingSendTimers.get(contactId);
  if (existing) clearTimeout(existing);

  const timer = setTimeout(() => {
    mockProspects = mockProspects.map((p) => (p.id === contactId ? { ...p, status: "DELIVERED" } : p));
    pendingSendTimers.delete(contactId);
  }, 1400);
  pendingSendTimers.set(contactId, timer);
}

// Mirrors the backend-status strings fetchMessageStatus's real counterpart returns, so
// ThreadView's terminal-status check works unchanged for this account too.
export async function fetchMessageStatus(messageId: string): Promise<string | null> {
  const contactId = parseMockIntroId(messageId);
  if (contactId) {
    const prospect = mockProspects.find((p) => p.id === contactId);
    if (!prospect) return null;
    if (prospect.status === "SENDING") return "sending";
    if (prospect.status === "DELIVERED") return "sent";
    return "draft";
  }
  // A custom reply: mock sends are synchronous (already appended as "sent" below), so
  // there's nothing to actually poll for.
  return "sent";
}

// Composing and sending are one action, same as the real account -- appended straight in as
// already "sent" since there's no real mail server here to simulate a delay against.
export async function sendCustomReply(contactId: string, body: string): Promise<{ messageId: string }> {
  const list = mockCustomReplies.get(contactId) ?? [];
  const id = `${contactId}::custom::${list.length}`;
  list.push({ id, body, sentAt: new Date().toISOString() });
  mockCustomReplies.set(contactId, list);
  return { messageId: id };
}

export async function fetchSenderOptions(): Promise<SenderOption[]> {
  return HR_SENDER_OPTIONS;
}

export async function fetchAutoSend(): Promise<boolean> {
  return readLocalBool(AUTO_SEND_KEY, false);
}

export async function setAutoSend(value: boolean): Promise<void> {
  if (typeof window !== "undefined") window.localStorage.setItem(AUTO_SEND_KEY, String(value));
}

export async function fetchDefaultSender(): Promise<string> {
  return readLocalString(DEFAULT_SENDER_KEY, HR_SENDER_OPTIONS[0].email);
}

export async function setDefaultSender(email: string): Promise<void> {
  if (typeof window !== "undefined") window.localStorage.setItem(DEFAULT_SENDER_KEY, email);
}

let currentRunRequest: RunRequest | null = null;
let runTimer: ReturnType<typeof setTimeout> | null = null;

// Simulates the real queued -> running -> done lifecycle RunTrigger polls for, without a
// VM behind it — always resolves "done", since there's nothing that can actually fail here.
export async function enqueueRun(count: number): Promise<void> {
  if (runTimer) clearTimeout(runTimer);

  currentRunRequest = {
    id: `mock-run-${mockProspects.length}-${count}-${Date.now()}`,
    requested_count: count,
    status: "pending",
    error: null,
    created_at: new Date().toISOString(),
  };

  runTimer = setTimeout(() => {
    if (!currentRunRequest) return;
    currentRunRequest = { ...currentRunRequest, status: "running" };

    runTimer = setTimeout(() => {
      if (!currentRunRequest) return;
      currentRunRequest = { ...currentRunRequest, status: "done" };
    }, 3000);
  }, 1500);
}

export async function fetchLatestRunRequest(): Promise<RunRequest | null> {
  return currentRunRequest;
}
