"use client";

// Thin dispatcher so components (EmailDetail, AutoSendToggle, RunTrigger) don't need to
// know which account is active — workenvo keeps hitting real Supabase exactly as before,
// thehrcompany gets a same-shaped in-memory simulation (lib/mockData.ts). Every export here
// mirrors workenvoData.ts's signatures 1:1.
import { getAccount } from "@/lib/auth";
import type { FunnelStage, LostReason } from "@/lib/funnel";
import * as mock from "@/lib/mockData";
import * as workenvo from "@/lib/workenvoData";
import type { ProspectStatus } from "@/lib/data";

export type { ProspectPage, RunRequest, RunRequestStatus, SenderOption } from "@/lib/workenvoData";
export type { FunnelStage, LostReason } from "@/lib/funnel";

function isWorkenvo(): boolean {
  return getAccount() === "workenvo";
}

export async function fetchThreadMessages(contactId: string) {
  return isWorkenvo() ? workenvo.fetchThreadMessages(contactId) : mock.fetchThreadMessages(contactId);
}

export async function updateMessageDraft(
  messageId: string,
  updates: { subject: string; body: string }
): Promise<void> {
  return isWorkenvo()
    ? workenvo.updateMessageDraft(messageId, updates)
    : mock.updateMessageDraft(messageId, updates);
}

export async function approveMessageDraft(messageId: string, sendFrom?: string): Promise<void> {
  return isWorkenvo()
    ? workenvo.approveMessageDraft(messageId, sendFrom)
    : mock.approveMessageDraft(messageId, sendFrom);
}

export async function fetchMessageStatus(messageId: string): Promise<string | null> {
  return isWorkenvo() ? workenvo.fetchMessageStatus(messageId) : mock.fetchMessageStatus(messageId);
}

export async function sendCustomReply(contactId: string, body: string) {
  return isWorkenvo() ? workenvo.sendCustomReply(contactId, body) : mock.sendCustomReply(contactId, body);
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

export async function setContactStage(
  contactId: string,
  stage: FunnelStage | null,
  lostReason: LostReason | null
): Promise<void> {
  return isWorkenvo()
    ? workenvo.setContactStage(contactId, stage, lostReason)
    : mock.setContactStage(contactId, stage, lostReason);
}

export async function fetchContactNotes(contactId: string) {
  return isWorkenvo() ? workenvo.fetchContactNotes(contactId) : mock.fetchContactNotes(contactId);
}

export async function addContactNote(contactId: string, author: string, text: string): Promise<void> {
  return isWorkenvo()
    ? workenvo.addContactNote(contactId, author, text)
    : mock.addContactNote(contactId, author, text);
}

export async function updateContactNote(noteId: string, text: string): Promise<void> {
  return isWorkenvo() ? workenvo.updateContactNote(noteId, text) : mock.updateContactNote(noteId, text);
}

export async function deleteContactNote(noteId: string): Promise<void> {
  return isWorkenvo() ? workenvo.deleteContactNote(noteId) : mock.deleteContactNote(noteId);
}

export async function fetchProspectsPage(args: {
  cursor: string | null;
  status: ProspectStatus | null;
  stage: FunnelStage | null;
}) {
  return isWorkenvo() ? workenvo.fetchProspectsPage(args) : mock.fetchProspectsPage(args);
}

export async function fetchLatestProspectId(args: {
  status: ProspectStatus | null;
  stage: FunnelStage | null;
}) {
  return isWorkenvo() ? workenvo.fetchLatestProspectId(args) : mock.fetchLatestProspectId(args);
}

export async function fetchProspectById(contactId: string) {
  return isWorkenvo() ? workenvo.fetchProspectById(contactId) : mock.fetchProspectById(contactId);
}

export async function fetchAllProspectsLean() {
  return isWorkenvo() ? workenvo.fetchAllProspectsLean() : mock.fetchAllProspectsLean();
}

export async function fetchDashboardStats() {
  return isWorkenvo() ? workenvo.fetchDashboardStats() : mock.fetchDashboardStats();
}

export async function fetchRecentActivity() {
  return isWorkenvo() ? workenvo.fetchRecentActivity() : mock.fetchRecentActivity();
}
