import { createClient } from "@supabase/supabase-js";
import {
  computeDashboardStats,
  type ActivityEvent,
  type ActivityTone,
  type DashboardStats,
  type Prospect,
  type ProspectStatus,
} from "@/lib/data";

// Known id of the 'workenvo' row in the `clients` table (backend/devinstruction.md 0.2 seed).
// Hardcoded rather than looked up: `clients` has no public RLS read policy (by design —
// only `contacts`/`emails`/`notifications`/`runs` are meant for anon-key dashboard reads).
const WORKENVO_CLIENT_ID = "26d55b28-4b3f-4648-ae53-b8dbaf5c1c73";

export const supabaseBrowser = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

type EmailRow = {
  id: string;
  subject: string;
  body: string;
  why_this_angle: { n: number; text: string }[] | null;
  status: string;
  reply_body: string | null;
  created_at: string;
  updated_at: string;
  contacts: {
    id: string;
    full_name: string;
    title: string | null;
    company: string;
    location: string | null;
    email: string | null;
    email_status: string | null;
    phone: string | null;
  } | null;
};

// backend emails.status -> frontend ProspectStatus. 'bounced' detection isn't actually
// implemented anywhere yet (see backend/devinstruction.md); the slot exists regardless.
const STATUS_MAP: Record<string, ProspectStatus> = {
  draft: "DRAFTED",
  approved: "SENDING",
  sending: "SENDING",
  sent: "DELIVERED",
  replied: "RESPONDED",
  bounced: "BOUNCED",
  failed: "DRAFTED",
};

function daysAgoFrom(iso: string): number {
  return Math.max(0, Math.floor((Date.now() - new Date(iso).getTime()) / 86_400_000));
}

function timeAgoFrom(iso: string): string {
  const mins = Math.floor((Date.now() - new Date(iso).getTime()) / 60_000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}

function mapRowToProspect(row: EmailRow): Prospect {
  const contact = row.contacts;
  const intel = (row.why_this_angle ?? [])
    .slice()
    .sort((a, b) => a.n - b.n)
    .map((point) => point.text);

  return {
    id: contact?.id ?? row.id,
    name: contact?.full_name ?? "Unknown",
    title: contact?.title ?? "",
    company: contact?.company ?? "",
    location: contact?.location ?? "",
    email: contact?.email ?? "not found",
    emailVerified: contact?.email_status === "verified",
    phone: contact?.phone ?? "not revealed",
    daysAgo: daysAgoFrom(row.created_at),
    subject: row.subject,
    body: row.body,
    intel,
    status: STATUS_MAP[row.status] ?? "DRAFTED",
    isDemo: false,
    response: row.status === "replied" ? row.reply_body ?? undefined : undefined,
  };
}

function eventForRow(row: EmailRow): ActivityEvent {
  const name = row.contacts?.full_name ?? "Unknown";
  const company = row.contacts?.company ?? "";
  let description = `Drafted — ${name}, ${company}`;
  let tone: ActivityTone = "info";

  if (row.status === "replied") {
    description = `Reply from ${name} — ${company}`;
    tone = "success";
  } else if (row.status === "bounced") {
    description = `Bounce detected — ${name}, ${company}`;
    tone = "warning";
  } else if (row.status === "sent" || row.status === "sending") {
    description = `Email delivered — ${name}, ${company}`;
  }

  return {
    id: row.id,
    timeAgo: timeAgoFrom(row.updated_at ?? row.created_at),
    description,
    tone,
    prospectId: row.contacts?.id ?? row.id,
  };
}

export async function fetchWorkenvoData(): Promise<{
  prospects: Prospect[];
  stats: DashboardStats;
  activity: ActivityEvent[];
}> {
  const { data, error } = await supabaseBrowser
    .from("emails")
    .select(
      `id, subject, body, why_this_angle, status, reply_body, created_at, updated_at,
       contacts ( id, full_name, title, company, location, email, email_status, phone )`
    )
    .eq("client_id", WORKENVO_CLIENT_ID)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("[workenvoData] fetch failed:", error.message);
    return { prospects: [], stats: computeDashboardStats([]), activity: [] };
  }

  const rows = (data ?? []) as unknown as EmailRow[];
  const prospects = rows.map(mapRowToProspect);
  const activity = rows.slice(0, 10).map(eventForRow);
  const stats = computeDashboardStats(prospects);

  return { prospects, stats, activity };
}

// Prospect.id is the contact id (see mapRowToProspect above); `emails_one_per_contact`
// guarantees exactly one email row per contact, so contact_id is a safe update key.
export async function updateEmailDraft(
  contactId: string,
  updates: { subject: string; body: string }
): Promise<void> {
  const { error } = await supabaseBrowser
    .from("emails")
    .update(updates)
    .eq("contact_id", contactId)
    .eq("client_id", WORKENVO_CLIENT_ID);
  if (error) throw new Error(error.message);
}

// Flips the email to 'approved' — a DB trigger (see SEND-PLAN.md) fires the
// wk-send-email Edge Function the instant this transition happens.
export async function approveEmail(contactId: string, sendFrom?: string): Promise<void> {
  const { error } = await supabaseBrowser
    .from("emails")
    .update({ status: "approved", send_from: sendFrom ?? null })
    .eq("contact_id", contactId)
    .eq("client_id", WORKENVO_CLIENT_ID);
  if (error) throw new Error(error.message);
}

// Polls a single email's status by contact id — used right after approveEmail()
// to reflect the async send outcome (sent/failed) without a full page refetch.
export async function fetchEmailStatus(contactId: string): Promise<string | null> {
  const { data, error } = await supabaseBrowser
    .from("emails")
    .select("status")
    .eq("contact_id", contactId)
    .eq("client_id", WORKENVO_CLIENT_ID)
    .maybeSingle();
  if (error) {
    console.error("[workenvoData] fetchEmailStatus failed:", error.message);
    return null;
  }
  return data?.status ?? null;
}

export type SenderOption = { email: string; name: string };

export async function fetchSenderOptions(): Promise<SenderOption[]> {
  const { data, error } = await supabaseBrowser
    .from("config")
    .select("value")
    .eq("client_id", WORKENVO_CLIENT_ID)
    .eq("key", "sender_options")
    .maybeSingle();
  if (error) {
    console.error("[workenvoData] fetchSenderOptions failed:", error.message);
    return [];
  }
  return (data?.value as SenderOption[] | undefined) ?? [];
}

export async function fetchAutoSend(): Promise<boolean> {
  const { data, error } = await supabaseBrowser
    .from("config")
    .select("value")
    .eq("client_id", WORKENVO_CLIENT_ID)
    .eq("key", "auto_send")
    .maybeSingle();
  if (error) {
    console.error("[workenvoData] fetchAutoSend failed:", error.message);
    return false;
  }
  return data?.value === true;
}

export async function setAutoSend(value: boolean): Promise<void> {
  const { error } = await supabaseBrowser
    .from("config")
    .update({ value })
    .eq("client_id", WORKENVO_CLIENT_ID)
    .eq("key", "auto_send");
  if (error) throw new Error(error.message);
}

// The address auto-sent drafts go out from (wk-insert-draft never sets a
// per-email send_from, so wk-send-email always falls back to this).
export async function fetchDefaultSender(): Promise<string> {
  const { data, error } = await supabaseBrowser
    .from("config")
    .select("value")
    .eq("client_id", WORKENVO_CLIENT_ID)
    .eq("key", "sender_email")
    .maybeSingle();
  if (error) {
    console.error("[workenvoData] fetchDefaultSender failed:", error.message);
    return "";
  }
  return (data?.value as string | undefined) ?? "";
}

export async function setDefaultSender(email: string): Promise<void> {
  const { error } = await supabaseBrowser
    .from("config")
    .update({ value: email })
    .eq("client_id", WORKENVO_CLIENT_ID)
    .eq("key", "sender_email");
  if (error) throw new Error(error.message);
}

export type RunRequestStatus = "pending" | "running" | "done" | "failed";

export type RunRequest = {
  id: string;
  requested_count: number;
  status: RunRequestStatus;
  error: string | null;
  created_at: string;
};

// Enqueues a run — never talks to the VM directly (it has no inbound ports open).
// The scheduler's poll loop picks this up from the table instead.
export async function enqueueRun(count: number): Promise<void> {
  const { error } = await supabaseBrowser
    .from("run_requests")
    .insert({ client_id: WORKENVO_CLIENT_ID, requested_count: count });
  if (error) throw new Error(error.message);
}

export async function fetchLatestRunRequest(): Promise<RunRequest | null> {
  const { data, error } = await supabaseBrowser
    .from("run_requests")
    .select("id, requested_count, status, error, created_at")
    .eq("client_id", WORKENVO_CLIENT_ID)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    console.error("[workenvoData] fetchLatestRunRequest failed:", error.message);
    return null;
  }
  return data;
}
