"use client";

import {
  computeDashboardStats,
  activityFeed as seedActivity,
  prospects as seedProspects,
  type ActivityEvent,
  type DashboardStats,
  type Prospect,
} from "@/lib/data";
import type { RunRequest, SenderOption } from "@/lib/workenvoData";

// In-memory store for the thehrcompany account — there's no backend behind this login,
// so edits/sends need to persist for the session somewhere. Seeded once from the static
// mock dataset; every mutation below updates this array so the UI reflects what the user
// just did instead of snapping back to the seed data on the next fetch.
let mockProspects: Prospect[] = seedProspects.map((p) => ({ ...p }));

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

export async function fetchMockData(): Promise<{
  prospects: Prospect[];
  stats: DashboardStats;
  activity: ActivityEvent[];
}> {
  return {
    prospects: mockProspects,
    stats: {
      ...computeDashboardStats(mockProspects),
      icpHealthPct: 88,
      icpHealthNote: "Steady sourcing across this week's runs.",
    },
    activity: seedActivity,
  };
}

export async function updateEmailDraft(
  id: string,
  updates: { subject: string; body: string }
): Promise<void> {
  mockProspects = mockProspects.map((p) => (p.id === id ? { ...p, ...updates } : p));
}

const pendingSendTimers = new Map<string, ReturnType<typeof setTimeout>>();

// Best-case send simulation: SENDING for a beat, then DELIVERED — no failure path,
// since this account has no real mail server to fail against.
export async function approveEmail(id: string): Promise<void> {
  mockProspects = mockProspects.map((p) => (p.id === id ? { ...p, status: "SENDING" } : p));

  const existing = pendingSendTimers.get(id);
  if (existing) clearTimeout(existing);

  const timer = setTimeout(() => {
    mockProspects = mockProspects.map((p) => (p.id === id ? { ...p, status: "DELIVERED" } : p));
    pendingSendTimers.delete(id);
  }, 1400);
  pendingSendTimers.set(id, timer);
}

// Mirrors the backend-status strings fetchEmailStatus's real counterpart returns, so
// EmailDetail's TERMINAL_SEND_STATUSES check works unchanged for this account too.
export async function fetchEmailStatus(id: string): Promise<string | null> {
  const prospect = mockProspects.find((p) => p.id === id);
  if (!prospect) return null;
  if (prospect.status === "SENDING") return "sending";
  if (prospect.status === "DELIVERED") return "sent";
  return "draft";
}

// No seed prospect in lib/data.ts carries a followUp, so these paths are never actually
// reachable from the demo UI -- exist only to satisfy outreachApi's dispatcher contract.
export async function updateFollowUpDraft(
  _contactId: string,
  _updates: { subject: string; body: string }
): Promise<void> {}

export async function approveFollowUp(_contactId: string): Promise<void> {}

export async function fetchFollowUpStatus(_contactId: string): Promise<string | null> {
  return null;
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
