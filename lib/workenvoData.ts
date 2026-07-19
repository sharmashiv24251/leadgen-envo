import { createClient } from "@supabase/supabase-js";
import {
  computeDashboardStats,
  type ActivityEvent,
  type ActivityTone,
  type ContactNote,
  type DashboardStats,
  type Prospect,
  type ProspectListItem,
  type ProspectStatus,
  type ThreadMessage,
  type ThreadMessageStatus,
  type ThreadMessageType,
} from "@/lib/data";
import { computeEffectiveStage, type FunnelStage, type LostReason } from "@/lib/funnel";

// Message statuses that mean "this actually went out" -- shared meaning for both the intro
// row (STATUS_MAP below) and the separate follow-up existence checks below.
const SENT_MESSAGE_STATUSES = new Set(["approved", "sending", "sent", "replied"]);

// How many prospects the sidebar loads per infinite-scroll page.
const PAGE_SIZE = 40;

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
  created_at: string;
  contacts: {
    id: string;
    full_name: string;
    title: string | null;
    company: string;
    location: string | null;
    email: string | null;
    email_status: string | null;
    phone: string | null;
    phone_status: string | null;
    stage: FunnelStage | null;
    lost_reason: LostReason | null;
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

// Inverse of STATUS_MAP -- for filtering the DB by a ProspectStatus selected in the dropdown.
const STATUS_TO_RAW: Record<ProspectStatus, string[]> = {
  DRAFTED: ["draft", "failed"],
  SENDING: ["approved", "sending"],
  DELIVERED: ["sent"],
  BOUNCED: ["bounced"],
  RESPONDED: ["replied"],
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

function mapRowToProspect(row: EmailRow, followUpSentContactIds: Set<string>): Prospect {
  const contact = row.contacts;
  const intel = extractIntel(row.why_this_angle);

  const manualStage = contact?.stage ?? null;
  const stage = computeEffectiveStage({
    manualStage,
    introSent: SENT_MESSAGE_STATUSES.has(row.status),
    followUpSent: contact ? followUpSentContactIds.has(contact.id) : false,
  });

  return {
    id: contact?.id ?? row.id,
    name: contact?.full_name ?? "Unknown",
    title: contact?.title ?? "",
    company: contact?.company ?? "",
    location: contact?.location ?? "",
    email: contact?.email ?? "not found",
    emailVerified: contact?.email_status === "verified",
    phone: contact?.phone ?? "not revealed",
    phoneStatus: contact?.phone_status ?? null,
    daysAgo: daysAgoFrom(row.created_at),
    subject: row.subject,
    body: row.body,
    intel,
    status: STATUS_MAP[row.status] ?? "DRAFTED",
    stage,
    lostReason: stage === "deal_lost" ? (contact?.lost_reason ?? null) : null,
  };
}

type ActivityRow = {
  id: string;
  status: string;
  updated_at: string;
  created_at: string;
  contacts: { id: string; full_name: string; company: string } | null;
};

function eventForRow(row: ActivityRow): ActivityEvent {
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

// Weight given to each new run's raw score vs. the running average — high enough that
// 2-3 consecutive bad runs clearly bend the line (real ICP exhaustion), low enough that
// one noisy/unlucky run doesn't whiplash it. Runs land at most once a day, so there's no
// point smoothing over a long window the way you would with higher-frequency data.
const ICP_EWMA_ALPHA = 0.35;

// icp_health is a 0-10 "how easy was sourcing today" score the agent self-reports at the
// end of each run (backend/devinstruction.md); this folds the full history into one
// EWMA-smoothed reading and surfaces the latest run's note as the "why" behind it.
function computeIcpHealth(
  rows: { icp_health: number; icp_health_note: string | null }[]
): { pct: number | null; note: string | null } {
  if (rows.length === 0) return { pct: null, note: null };

  let ewma = rows[0].icp_health;
  for (let i = 1; i < rows.length; i++) {
    ewma = ICP_EWMA_ALPHA * rows[i].icp_health + (1 - ICP_EWMA_ALPHA) * ewma;
  }

  return { pct: Math.round(ewma * 10), note: rows[rows.length - 1].icp_health_note };
}

async function fetchIcpHealth(): Promise<{ pct: number | null; note: string | null }> {
  const { data, error } = await supabaseBrowser
    .from("runs")
    .select("icp_health, icp_health_note, started_at")
    .eq("client_id", WORKENVO_CLIENT_ID)
    .not("icp_health", "is", null)
    .order("started_at", { ascending: true });

  if (error) {
    console.error("[workenvoData] fetchIcpHealth failed:", error.message);
    return { pct: null, note: null };
  }

  return computeIcpHealth(
    (data ?? []) as { icp_health: number; icp_health_note: string | null }[]
  );
}

export type ProspectPage = { items: Prospect[]; nextCursor: string | null };

type ProspectFeedRow = {
  contact_id: string;
  full_name: string;
  title: string | null;
  company: string;
  subject: string;
  email_status: string;
  effective_stage: FunnelStage;
  lost_reason: LostReason | null;
  created_at: string;
  // Only selected by the rich (fetchProspectsPage/fetchProspectById-adjacent) query --
  // fetchAllProspectsLean's column list omits these, so they're undefined there.
  body?: string;
  why_this_angle?: { n: number; text: string }[] | null;
  location?: string | null;
  email?: string | null;
  email_verification_status?: string | null;
  phone?: string | null;
  phone_status?: string | null;
};

const PROSPECT_FEED_LEAN_COLUMNS =
  "contact_id, full_name, title, company, subject, email_status, effective_stage, lost_reason, created_at";

// Same 40-row page the sidebar already paginates to -- the extra weight per row (body,
// why_this_angle, full contact detail) is bounded to "however many rows are currently loaded,"
// not the account's entire history, which is what made the old fetchWorkenvoData a problem.
// This lets the detail page reuse an already-loaded list row instantly (lib/useAccountData.ts's
// useProspectDetail) instead of always paying for a second round-trip.
const PROSPECT_FEED_RICH_COLUMNS = `${PROSPECT_FEED_LEAN_COLUMNS},
  body, why_this_angle, location, email, email_verification_status, phone, phone_status`;

function extractIntel(whyThisAngle: { n: number; text: string }[] | null | undefined): string[] {
  return (whyThisAngle ?? [])
    .slice()
    .sort((a, b) => a.n - b.n)
    .map((point) => point.text);
}

function feedRowToListItem(row: ProspectFeedRow): ProspectListItem {
  return {
    id: row.contact_id,
    name: row.full_name,
    title: row.title ?? "",
    company: row.company,
    subject: row.subject,
    status: STATUS_MAP[row.email_status] ?? "DRAFTED",
    stage: row.effective_stage,
    daysAgo: daysAgoFrom(row.created_at),
  };
}

function feedRowToProspect(row: ProspectFeedRow): Prospect {
  const stage = row.effective_stage;
  return {
    id: row.contact_id,
    name: row.full_name,
    title: row.title ?? "",
    company: row.company,
    location: row.location ?? "",
    email: row.email ?? "not found",
    emailVerified: row.email_verification_status === "verified",
    phone: row.phone ?? "not revealed",
    phoneStatus: row.phone_status ?? null,
    daysAgo: daysAgoFrom(row.created_at),
    subject: row.subject,
    body: row.body ?? "",
    intel: extractIntel(row.why_this_angle),
    status: STATUS_MAP[row.email_status] ?? "DRAFTED",
    stage,
    lostReason: stage === "deal_lost" ? row.lost_reason : null,
  };
}

// Powers the infinite-scroll sidebar -- queries the `prospect_feed` view (backend migration
// create_prospect_feed_view), which computes effective funnel stage server-side so every
// filter combination, including the three computed stages, is a plain equality filter here
// instead of a client-side re-derivation. 40/page, keyset-paginated on created_at (simpler than
// a compound cursor; a same-millisecond tie causing a skipped/duplicate row is a real but
// negligible risk at this data rate).
export async function fetchProspectsPage(args: {
  cursor: string | null;
  status: ProspectStatus | null;
  stage: FunnelStage | null;
}): Promise<ProspectPage> {
  let query = supabaseBrowser
    .from("prospect_feed")
    .select(PROSPECT_FEED_RICH_COLUMNS)
    .eq("client_id", WORKENVO_CLIENT_ID);

  if (args.status) query = query.in("email_status", STATUS_TO_RAW[args.status]);
  if (args.stage) query = query.eq("effective_stage", args.stage);
  if (args.cursor) query = query.lt("created_at", args.cursor);

  query = query.order("created_at", { ascending: false }).limit(PAGE_SIZE);

  const { data, error } = await query;
  if (error) {
    console.error("[workenvoData] fetchProspectsPage failed:", error.message);
    return { items: [], nextCursor: null };
  }

  const rows = (data ?? []) as unknown as ProspectFeedRow[];
  const items = rows.map(feedRowToProspect);

  const nextCursor = rows.length === PAGE_SIZE ? rows[rows.length - 1].created_at : null;
  return { items, nextCursor };
}

// The Funnel Kanban board (components/FunnelBoard.tsx) needs every prospect at once to bucket
// into columns -- a Kanban view doesn't fit "40 at a time, load more" the way a chronological
// feed does. Still far cheaper than the old fetchWorkenvoData: lean columns only, no
// body/why_this_angle, via the same view.
export async function fetchAllProspectsLean(): Promise<ProspectListItem[]> {
  const { data, error } = await supabaseBrowser
    .from("prospect_feed")
    .select(PROSPECT_FEED_LEAN_COLUMNS)
    .eq("client_id", WORKENVO_CLIENT_ID)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("[workenvoData] fetchAllProspectsLean failed:", error.message);
    return [];
  }

  return ((data ?? []) as unknown as ProspectFeedRow[]).map(feedRowToListItem);
}

// Powers the emails-index auto-open redirect (app/emails/page.tsx) -- same filters as
// fetchProspectsPage, just the single most recent match instead of a full page.
export async function fetchLatestProspectId(args: {
  status: ProspectStatus | null;
  stage: FunnelStage | null;
}): Promise<string | null> {
  let query = supabaseBrowser
    .from("prospect_feed")
    .select("contact_id")
    .eq("client_id", WORKENVO_CLIENT_ID);

  if (args.status) query = query.in("email_status", STATUS_TO_RAW[args.status]);
  if (args.stage) query = query.eq("effective_stage", args.stage);

  const { data, error } = await query
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    console.error("[workenvoData] fetchLatestProspectId failed:", error.message);
    return null;
  }
  return data?.contact_id ?? null;
}

// The detail page's full fetch, by contact id -- the only place body/why_this_angle/full
// contact fields (location/email/phone/stage) are ever requested now that the list doesn't.
export async function fetchProspectById(contactId: string): Promise<Prospect | null> {
  const [emailResult, followUpResult] = await Promise.all([
    supabaseBrowser
      .from("email_messages")
      .select(
        `id, subject, body, why_this_angle, status, created_at,
         contacts ( id, full_name, title, company, location, email, email_status, phone, phone_status, stage, lost_reason )`
      )
      .eq("client_id", WORKENVO_CLIENT_ID)
      .eq("type", "intro")
      .eq("contact_id", contactId)
      .maybeSingle(),
    supabaseBrowser
      .from("email_messages")
      .select("status")
      .eq("client_id", WORKENVO_CLIENT_ID)
      .eq("type", "follow_up")
      .eq("contact_id", contactId)
      .maybeSingle(),
  ]);

  if (emailResult.error) {
    console.error("[workenvoData] fetchProspectById failed:", emailResult.error.message);
    return null;
  }
  if (!emailResult.data) return null;
  if (followUpResult.error) {
    console.error("[workenvoData] follow-up check failed:", followUpResult.error.message);
  }

  const followUpSentContactIds = new Set<string>();
  if (followUpResult.data && SENT_MESSAGE_STATUSES.has(followUpResult.data.status)) {
    followUpSentContactIds.add(contactId);
  }

  const row = emailResult.data as unknown as EmailRow;
  return mapRowToProspect(row, followUpSentContactIds);
}

// Command Center's KPI tiles -- a lean status-only query over every intro row (cheap even at
// thousands of rows, unlike the old fetchWorkenvoData which pulled full bodies for the same
// purpose) so the numbers stay correct regardless of how the sidebar is paginated/filtered.
export async function fetchDashboardStats(): Promise<DashboardStats> {
  const [statusResult, icpHealth] = await Promise.all([
    supabaseBrowser
      .from("email_messages")
      .select("status")
      .eq("client_id", WORKENVO_CLIENT_ID)
      .eq("type", "intro"),
    fetchIcpHealth(),
  ]);

  if (statusResult.error) {
    console.error("[workenvoData] fetchDashboardStats failed:", statusResult.error.message);
  }

  const rows = (statusResult.data ?? []).map((row) => ({
    status: STATUS_MAP[row.status] ?? ("DRAFTED" as ProspectStatus),
  }));

  return {
    ...computeDashboardStats(rows),
    icpHealthPct: icpHealth.pct,
    icpHealthNote: icpHealth.note,
  };
}

// Command Center's recent-activity feed -- always just the latest 10, independent of the
// sidebar's pagination/filters.
export async function fetchRecentActivity(): Promise<ActivityEvent[]> {
  const { data, error } = await supabaseBrowser
    .from("email_messages")
    .select("id, status, updated_at, created_at, contacts ( id, full_name, company )")
    .eq("client_id", WORKENVO_CLIENT_ID)
    .eq("type", "intro")
    .order("updated_at", { ascending: false })
    .limit(10);

  if (error) {
    console.error("[workenvoData] fetchRecentActivity failed:", error.message);
    return [];
  }

  return ((data ?? []) as unknown as ActivityRow[]).map(eventForRow);
}

// Every message in a contact's conversation, oldest first -- the real thread view. Ordered
// by sent_at where it exists (the true send time) falling back to created_at for anything
// still a draft (never sent, so has no sent_at yet).
export async function fetchThreadMessages(contactId: string): Promise<ThreadMessage[]> {
  const { data, error } = await supabaseBrowser
    .from("email_messages")
    .select("id, type, direction, subject, body, status, gmail_thread_id, sent_at, created_at")
    .eq("contact_id", contactId)
    .eq("client_id", WORKENVO_CLIENT_ID);
  if (error) {
    console.error("[workenvoData] fetchThreadMessages failed:", error.message);
    return [];
  }
  return (data ?? [])
    .map((row) => ({
      id: row.id,
      type: row.type as ThreadMessageType,
      direction: row.direction as "outbound" | "inbound",
      subject: row.subject,
      body: row.body,
      status: (row.status as ThreadMessageStatus) ?? "draft",
      gmailThreadId: row.gmail_thread_id,
      occurredAt: row.sent_at ?? row.created_at,
    }))
    .sort((a, b) => new Date(a.occurredAt).getTime() - new Date(b.occurredAt).getTime());
}

// Works for any message (intro, follow-up) still sitting as a draft -- keyed by its own row
// id, not contact_id+type, so it can never touch a sibling message by accident.
export async function updateMessageDraft(
  messageId: string,
  updates: { subject: string; body: string }
): Promise<void> {
  const { error } = await supabaseBrowser
    .from("email_messages")
    .update(updates)
    .eq("id", messageId)
    .eq("client_id", WORKENVO_CLIENT_ID);
  if (error) throw new Error(error.message);
}

// Flips a message to 'approved' — a DB trigger fires the wk-send-email Edge Function the
// instant this transition happens. sendFrom only matters for a message with no
// gmailThreadId yet (i.e. the very first send for this contact); once a thread exists,
// wk-send-email ignores config defaults and resolves the sender from the thread itself, so
// the UI should never even offer a choice at that point.
export async function approveMessageDraft(messageId: string, sendFrom?: string): Promise<void> {
  const { error } = await supabaseBrowser
    .from("email_messages")
    .update({ status: "approved", send_from: sendFrom ?? null })
    .eq("id", messageId)
    .eq("client_id", WORKENVO_CLIENT_ID);
  if (error) throw new Error(error.message);
}

// Polls a single message's status by its own row id — used right after approveMessageDraft()
// or sendCustomReply() to reflect the async send outcome without a full thread refetch.
export async function fetchMessageStatus(messageId: string): Promise<string | null> {
  const { data, error } = await supabaseBrowser
    .from("email_messages")
    .select("status")
    .eq("id", messageId)
    .eq("client_id", WORKENVO_CLIENT_ID)
    .maybeSingle();
  if (error) {
    console.error("[workenvoData] fetchMessageStatus failed:", error.message);
    return null;
  }
  return data?.status ?? null;
}

// Composing and sending are one action here, unlike the follow-up's draft/review/send --
// a human is directly authoring this in the moment, so there's no separate draft state to
// review later. Subject and thread id are resolved server-side (wk-send-custom-reply), same
// reasoning as the follow-up: not safe to trust the client to get threading-critical fields
// right.
export async function sendCustomReply(contactId: string, body: string): Promise<{ messageId: string }> {
  const { data, error } = await supabaseBrowser.functions.invoke("wk-send-custom-reply", {
    body: { contact_id: contactId, body },
  });
  if (error) throw new Error(error.message);
  if (data?.error) throw new Error(data.error);
  return { messageId: data.message_id };
}

// Apollo key never reaches the browser -- wk-reveal-phone looks the contact up server-side
// (by first/last name + company_domain) and writes contacts.phone/phone_status itself, same
// "server resolves the sensitive bit" reasoning as sendCustomReply's subject/thread id.
// Apollo's phone reveal is async (their API requires a webhook_url and delivers the actual
// number minutes later, never in this call's response) -- this only ever returns 'pending' or
// 'not_found' synchronously; 'verified' only comes from the DB already having a prior result.
export async function revealPhone(
  contactId: string
): Promise<{ phone: string | null; phoneStatus: string }> {
  const { data, error } = await supabaseBrowser.functions.invoke("wk-reveal-phone", {
    body: { contact_id: contactId },
  });
  if (error) throw new Error(error.message);
  if (data?.error) throw new Error(data.error);
  return { phone: data.phone ?? null, phoneStatus: data.phone_status };
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

// stage: null clears a manual override, letting the computed stage (leads/intro_sent/
// follow_up_sent) re-take over -- see lib/funnel.ts for the full model.
export async function setContactStage(
  contactId: string,
  stage: FunnelStage | null,
  lostReason: LostReason | null
): Promise<void> {
  const { error } = await supabaseBrowser
    .from("contacts")
    .update({ stage, lost_reason: stage === "deal_lost" ? lostReason : null })
    .eq("id", contactId)
    .eq("client_id", WORKENVO_CLIENT_ID);
  if (error) throw new Error(error.message);
}

// Append-only: no update/delete RLS policy exists on contact_notes (backend migration
// add_contact_notes), only select + insert.
export async function fetchContactNotes(contactId: string): Promise<ContactNote[]> {
  const { data, error } = await supabaseBrowser
    .from("contact_notes")
    .select("id, author, text, created_at")
    .eq("contact_id", contactId)
    .eq("client_id", WORKENVO_CLIENT_ID)
    .order("created_at", { ascending: false });
  if (error) {
    console.error("[workenvoData] fetchContactNotes failed:", error.message);
    return [];
  }
  return (data ?? []).map((row) => ({
    id: row.id,
    author: row.author,
    text: row.text,
    createdAt: row.created_at,
  }));
}

export async function addContactNote(
  contactId: string,
  author: string,
  text: string
): Promise<void> {
  const { error } = await supabaseBrowser
    .from("contact_notes")
    .insert({ contact_id: contactId, client_id: WORKENVO_CLIENT_ID, author, text });
  if (error) throw new Error(error.message);
}

export async function updateContactNote(noteId: string, text: string): Promise<void> {
  const { error } = await supabaseBrowser
    .from("contact_notes")
    .update({ text })
    .eq("id", noteId)
    .eq("client_id", WORKENVO_CLIENT_ID);
  if (error) throw new Error(error.message);
}

export async function deleteContactNote(noteId: string): Promise<void> {
  const { error } = await supabaseBrowser
    .from("contact_notes")
    .delete()
    .eq("id", noteId)
    .eq("client_id", WORKENVO_CLIENT_ID);
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
