"use client";

// Thin dispatcher so components (EmailDetail, AutoSendToggle, RunTrigger) don't need to
// know which account is active — both accounts hit real Supabase now, just scoped to a
// different client_id (lib/workenvoData.ts vs lib/thehrcompanyData.ts). Every export here
// mirrors both modules' signatures 1:1, which are themselves identical to each other.
import { getAccount } from "@/lib/auth";
import type { FunnelStage, LostReason } from "@/lib/funnel";
import * as thehrcompany from "@/lib/thehrcompanyData";
import * as workenvo from "@/lib/workenvoData";
import type { ProspectStatus } from "@/lib/data";

export type { ProspectPage, RunRequest, RunRequestStatus, SenderOption } from "@/lib/workenvoData";
export type { FunnelStage, LostReason } from "@/lib/funnel";

function backend() {
  return getAccount() === "workenvo" ? workenvo : thehrcompany;
}

export async function fetchThreadMessages(contactId: string) {
  return backend().fetchThreadMessages(contactId);
}

export async function updateMessageDraft(
  messageId: string,
  updates: { subject: string; body: string }
): Promise<void> {
  return backend().updateMessageDraft(messageId, updates);
}

export async function approveMessageDraft(messageId: string, sendFrom?: string): Promise<void> {
  return backend().approveMessageDraft(messageId, sendFrom);
}

export async function fetchMessageStatus(messageId: string): Promise<string | null> {
  return backend().fetchMessageStatus(messageId);
}

export async function sendCustomReply(contactId: string, body: string) {
  return backend().sendCustomReply(contactId, body);
}

export async function revealPhone(
  contactId: string
): Promise<{ phone: string | null; phoneStatus: string }> {
  return backend().revealPhone(contactId);
}

export async function fetchSenderOptions() {
  return backend().fetchSenderOptions();
}

export async function fetchAutoSend(): Promise<boolean> {
  return backend().fetchAutoSend();
}

export async function setAutoSend(value: boolean): Promise<void> {
  return backend().setAutoSend(value);
}

export async function fetchDefaultSender(): Promise<string> {
  return backend().fetchDefaultSender();
}

export async function setDefaultSender(email: string): Promise<void> {
  return backend().setDefaultSender(email);
}

export async function enqueueRun(count: number): Promise<void> {
  return backend().enqueueRun(count);
}

export async function fetchLatestRunRequest() {
  return backend().fetchLatestRunRequest();
}

export async function setContactStage(
  contactId: string,
  stage: FunnelStage | null,
  lostReason: LostReason | null
): Promise<void> {
  return backend().setContactStage(contactId, stage, lostReason);
}

export async function fetchContactNotes(contactId: string) {
  return backend().fetchContactNotes(contactId);
}

export async function addContactNote(contactId: string, author: string, text: string): Promise<void> {
  return backend().addContactNote(contactId, author, text);
}

export async function updateContactNote(noteId: string, text: string): Promise<void> {
  return backend().updateContactNote(noteId, text);
}

export async function deleteContactNote(noteId: string): Promise<void> {
  return backend().deleteContactNote(noteId);
}

export async function fetchProspectsPage(args: {
  cursor: string | null;
  status: ProspectStatus | null;
  stage: FunnelStage | null;
}) {
  return backend().fetchProspectsPage(args);
}

export async function fetchLatestProspectId(args: {
  status: ProspectStatus | null;
  stage: FunnelStage | null;
}) {
  return backend().fetchLatestProspectId(args);
}

export async function fetchProspectById(contactId: string) {
  return backend().fetchProspectById(contactId);
}

export async function fetchAllProspectsLean() {
  return backend().fetchAllProspectsLean();
}

export async function fetchDashboardStats() {
  return backend().fetchDashboardStats();
}

export async function fetchRecentActivity() {
  return backend().fetchRecentActivity();
}
