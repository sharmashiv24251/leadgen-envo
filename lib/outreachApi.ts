"use client";

// Thin dispatcher so components (EmailDetail, AutoSendToggle, RunTrigger) don't need to
// know which account is active — workenvo keeps hitting real Supabase exactly as before,
// thehrcompany gets a same-shaped in-memory simulation (lib/mockData.ts). Every export here
// mirrors workenvoData.ts's signatures 1:1.
import { getAccount } from "@/lib/auth";
import * as mock from "@/lib/mockData";
import * as workenvo from "@/lib/workenvoData";

export type { RunRequest, RunRequestStatus, SenderOption } from "@/lib/workenvoData";

function isWorkenvo(): boolean {
  return getAccount() === "workenvo";
}

export async function updateEmailDraft(
  contactId: string,
  updates: { subject: string; body: string }
): Promise<void> {
  return isWorkenvo()
    ? workenvo.updateEmailDraft(contactId, updates)
    : mock.updateEmailDraft(contactId, updates);
}

export async function approveEmail(contactId: string, sendFrom?: string): Promise<void> {
  return isWorkenvo() ? workenvo.approveEmail(contactId, sendFrom) : mock.approveEmail(contactId);
}

export async function fetchEmailStatus(contactId: string): Promise<string | null> {
  return isWorkenvo() ? workenvo.fetchEmailStatus(contactId) : mock.fetchEmailStatus(contactId);
}

export async function fetchSenderOptions() {
  return isWorkenvo() ? workenvo.fetchSenderOptions() : mock.fetchSenderOptions();
}

export async function fetchAutoSend(): Promise<boolean> {
  return isWorkenvo() ? workenvo.fetchAutoSend() : mock.fetchAutoSend();
}

export async function setAutoSend(value: boolean): Promise<void> {
  return isWorkenvo() ? workenvo.setAutoSend(value) : mock.setAutoSend(value);
}

export async function fetchDefaultSender(): Promise<string> {
  return isWorkenvo() ? workenvo.fetchDefaultSender() : mock.fetchDefaultSender();
}

export async function setDefaultSender(email: string): Promise<void> {
  return isWorkenvo() ? workenvo.setDefaultSender(email) : mock.setDefaultSender(email);
}

export async function enqueueRun(count: number): Promise<void> {
  return isWorkenvo() ? workenvo.enqueueRun(count) : mock.enqueueRun(count);
}

export async function fetchLatestRunRequest() {
  return isWorkenvo() ? workenvo.fetchLatestRunRequest() : mock.fetchLatestRunRequest();
}
