# DEVELOPMENT.md — Workenvo Outreach MVP

This is the complete build guide. The four content files (`SKILL.md`, `icp.md`, `voice.md`, `product.md`) are separate and hold the agent's brain; everything about building and running the system is here.

## What the system does

The agent finds one prospect matching the ICP, verifies their email, researches them, and drafts a founder-to-founder cold email plus a "why this angle" justification, then writes the draft to the database. It does not send email, does not touch phone numbers, and does not need any special company "event" to act on someone — it just needs one true, specific fact to open with.

Supporting the agent: a database (Supabase) holds all state, config, and the skill files; three REST Edge Functions are the only way the agent touches the database; a Node.js app on a scheduler spawns the agent runs. Sending email and revealing phone numbers are deliberately out of the agent's scope. Phone reveal is a frontend concern (a separate on-click API route the frontend owns). Email sending is added in Phase 2.

## Architecture

```
DATABASE (Supabase, cloud)               COMPUTE (Mac in Phase 0, GCP VM in Phase 1)
├─ tables (config, contacts, emails,     ├─ Node app
│         runs, notifications)           │   └─ scheduler → spawns `claude -p`
├─ bucket `workenvo-skill`               ├─ Claude Code CLI (long-lived token)
│   └─ SKILL.md, icp.md, voice.md,       └─ .env
│      product.md                        
└─ Edge Functions (REST, token-authed)   ADDED IN PHASE 2:
    ├─ wk-check-contacted                ├─ Node sender loop → Gmail API
    ├─ wk-find-email  (Apollo proxy)     ├─ Node reply poller → Gmail historyId
    └─ wk-notify                         └─ gmail-sa.json + wk-send edge fn (optional)
```

Key principle: after the initial build, you change behaviour by editing the database only — daily volume is a `config` row, the ICP is a bucket file, auto-send is a `config` flag. The compute node's code does not change between environments or when you adjust settings.

---

# PHASE 0 — Build and run on your MacBook

Goal: the full drafting pipeline works locally. Prospects get found, researched, and drafted into the database. No email sending yet.

## 0.1 — Get the Claude Code long-lived token
On your Mac (where a browser exists):
```bash
claude setup-token
```
It opens a browser, you auth with your Pro/Max account, and it prints a long-lived OAuth token (valid ~1 year). Save it — the Node app needs it as `CLAUDE_CODE_OAUTH_TOKEN`. Do **not** also set `ANTHROPIC_API_KEY`; the two conflict.

Test it:
```bash
claude -p "say hello"
```
If it answers, headless auth works.

## 0.2 — Create the Supabase project and schema
Create a Supabase project (free tier is fine). In SQL Editor, paste and run the entire schema below.

```sql
-- ============================================================
-- Workenvo Outreach MVP — schema
-- All clients share these tables, distinguished by client_id.
-- One 'workenvo' client is seeded at the bottom.
-- ============================================================

create table if not exists clients (
  id            uuid primary key default gen_random_uuid(),
  slug          text unique not null,
  name          text not null,
  send_provider text not null default 'gmail',
  created_at    timestamptz default now()
);

-- config: your control panel — change behaviour without touching code
create table if not exists config (
  client_id  uuid references clients(id),
  key        text not null,
  value      jsonb not null,
  updated_at timestamptz default now(),
  primary key (client_id, key)
);

-- contacts: the never-re-contact ledger
create table if not exists contacts (
  id             uuid primary key default gen_random_uuid(),
  client_id      uuid not null references clients(id),
  full_name      text not null,
  first_name     text,
  last_name      text,
  company        text not null,
  company_domain text,
  title          text,
  location       text,
  email          text,
  email_status   text default 'unknown',   -- unknown/verified/guessed/not_found
  phone          text,                      -- written by the frontend reveal route, not the agent
  phone_status   text,
  status         text default 'claimed',    -- claimed/researched/drafted/sent/replied/bounced/needs_email/failed
  inflection     text,                       -- the hook the agent opened with
  created_at     timestamptz default now(),
  updated_at     timestamptz default now()
);
create unique index if not exists contacts_no_recontact
  on contacts (client_id, lower(full_name), lower(company));
create index if not exists contacts_client_status on contacts (client_id, status);

-- emails
create table if not exists emails (
  id                uuid primary key default gen_random_uuid(),
  contact_id        uuid not null references contacts(id),
  client_id         uuid not null references clients(id),
  subject           text not null,
  subject_options   jsonb,
  body              text not null,
  why_this_angle    jsonb,               -- [{n, text}] the dossier bullets
  sources           jsonb,               -- [{claim, url}] sources-per-claim
  status            text default 'draft',-- draft/approved/sending/sent/replied/bounced/failed
  provider_meta     jsonb,               -- gmail message_id / thread_id
  gmail_thread_id   text,
  reply_body        text,
  sent_at           timestamptz,
  replied_at        timestamptz,
  created_at        timestamptz default now(),
  updated_at        timestamptz default now()
);
create index if not exists emails_client_date on emails (client_id, created_at desc);
create index if not exists emails_status on emails (client_id, status);
create unique index if not exists emails_one_per_contact on emails (contact_id);

-- runs: one agent session + its quality manifest and ICP-health score
create table if not exists runs (
  id              uuid primary key default gen_random_uuid(),
  client_id       uuid not null references clients(id),
  status          text default 'running',   -- running/done/failed/blocked_apollo/blocked_claude
  prospects_found int,
  icp_health      int,                        -- 1-10, agent-scored
  icp_health_note text,
  manifest        jsonb,
  error           text,
  started_at      timestamptz default now(),
  finished_at     timestamptz
);

-- notifications: dashboard alerts, dismissible
create table if not exists notifications (
  id          uuid primary key default gen_random_uuid(),
  client_id   uuid references clients(id),
  level       text not null,        -- info/warning/error
  source      text not null,        -- apollo/claude/gmail/run
  title       text not null,
  detail      text,
  action_hint text,
  dismissed   boolean default false,
  created_at  timestamptz default now()
);
create index if not exists notifications_active
  on notifications (client_id, dismissed, created_at desc);

-- updated_at trigger
create or replace function touch_updated_at() returns trigger language plpgsql as $$
begin new.updated_at := now(); return new; end $$;
drop trigger if exists contacts_touch on contacts;
create trigger contacts_touch before update on contacts
  for each row execute function touch_updated_at();
drop trigger if exists emails_touch on emails;
create trigger emails_touch before update on emails
  for each row execute function touch_updated_at();

-- seed the workenvo client + its config
insert into clients (slug, name, send_provider)
values ('workenvo', 'Workenvo', 'gmail')
on conflict (slug) do nothing;

insert into config (client_id, key, value)
select id, k, v from clients, (values
  ('daily_quota',  '2'::jsonb),
  ('auto_send',    'false'::jsonb),
  ('paused',       'false'::jsonb),
  ('send_window',  '{"start":"09:00","end":"18:00","tz":"Europe/Dublin"}'::jsonb),
  ('sender_email', '"saransh@envo.club"'::jsonb),
  ('sender_name',  '"Saransh"'::jsonb)
) as cfg(k, v)
where clients.slug = 'workenvo'
on conflict (client_id, key) do nothing;

-- RLS: service role (Edge Functions, Node app) bypasses RLS.
-- Dashboard reads with the anon key.
alter table clients       enable row level security;
alter table config        enable row level security;
alter table contacts      enable row level security;
alter table emails        enable row level security;
alter table runs          enable row level security;
alter table notifications enable row level security;

create policy mvp_read_contacts on contacts for select using (true);
create policy mvp_read_emails   on emails   for select using (true);
create policy mvp_read_notifs   on notifications for select using (true);
create policy mvp_read_runs     on runs     for select using (true);
```

## 0.3 — Create the storage bucket and upload the skill files
Create a **private** bucket named `workenvo-skill`. Upload the four content files: `SKILL.md`, `icp.md`, `voice.md`, `product.md`. The Node app downloads these fresh before every run, so editing the ICP later takes effect on the next run with no redeploy.

## 0.4 — Set Edge Function secrets
```bash
supabase secrets set AGENT_TOKEN="$(openssl rand -hex 32)"   # SAVE the output — Node app + agent need it
supabase secrets set APOLLO_API_KEY="your-apollo-key"
# SUPABASE_URL and SERVICE_ROLE_KEY are auto-injected
```

## 0.5 — Deploy the three Edge Functions

Shared helper (top of each function file):
```ts
import { createClient } from "jsr:@supabase/supabase-js@2";

const auth = (req: Request) =>
  req.headers.get("x-agent-token") === Deno.env.get("AGENT_TOKEN");

const db = () => createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
);

const WORKENVO = async (d: ReturnType<typeof db>) =>
  (await d.from("clients").select("id").eq("slug","workenvo").single()).data!.id;
```

### `wk-check-contacted`
```ts
Deno.serve(async (req) => {
  if (!auth(req)) return new Response("forbidden", { status: 403 });
  const { prospects } = await req.json();
  const d = db(); const client_id = await WORKENVO(d);
  const verdicts = [];
  for (const p of prospects) {
    const { data } = await d.from("contacts")
      .select("status").eq("client_id", client_id)
      .ilike("full_name", p.full_name).ilike("company", p.company)
      .maybeSingle();
    verdicts.push({ ...p, contacted: !!data, status: data?.status ?? null });
  }
  return Response.json({ verdicts });
});
```

### `wk-find-email` (Apollo proxy — the Apollo key never leaves the server)
```ts
Deno.serve(async (req) => {
  if (!auth(req)) return new Response("forbidden", { status: 403 });
  const { first_name, last_name, domains } = await req.json();
  const key = Deno.env.get("APOLLO_API_KEY")!;

  for (const domain of domains) {
    const url = "https://api.apollo.io/api/v1/people/match"
      + "?reveal_personal_emails=false&reveal_phone_number=false";
    const r = await fetch(url, {
      method: "POST",
      headers: { "x-api-key": key, "content-type": "application/json" },
      body: JSON.stringify({ first_name, last_name, domain }),
    });

    if (r.status === 401 || r.status === 403) {
      const d = db();
      await d.from("notifications").insert({
        client_id: await WORKENVO(d), level: "error", source: "apollo",
        title: "Apollo auth/credit failure",
        detail: `find-email got ${r.status}. Check credits or key.`,
        action_hint: "Top up Apollo or rotate the key, then dismiss."
      });
      return Response.json({ error: "apollo_auth", status: r.status }, { status: 502 });
    }

    const j = await r.json();
    const person = j.person;
    const email = person?.email;
    const status = person?.email_status;
    if (email && status === "verified")
      return Response.json({ found: true, verified: true, email, email_status: status, domain });
    if (email)
      return Response.json({ found: true, verified: false, email, email_status: status ?? "guessed", domain });
  }
  return Response.json({ found: false, verified: false });
});
```

### `wk-insert-draft` (the agent's output door)
```ts
Deno.serve(async (req) => {
  if (!auth(req)) return new Response("forbidden", { status: 403 });
  const { prospect, email } = await req.json();
  const d = db(); const client_id = await WORKENVO(d);

  const { data: cfg } = await d.from("config")
    .select("value").eq("client_id", client_id).eq("key","auto_send").single();
  const autoSend = cfg?.value === true;

  const { data: contact, error: ce } = await d.from("contacts").insert({
    client_id, status: "researched", ...prospect
  }).select("id").single();
  if (ce?.code === "23505") return Response.json({ skipped: "already_contacted" });
  if (ce) return Response.json({ error: ce.message }, { status: 500 });

  const { data: em, error: ee } = await d.from("emails").insert({
    contact_id: contact.id, client_id,
    subject: email.subject, subject_options: email.subject_options,
    body: email.body, why_this_angle: email.why_this_angle, sources: email.sources,
    status: autoSend ? "approved" : "draft"
  }).select("id").single();
  if (ee) return Response.json({ error: ee.message }, { status: 500 });

  return Response.json({ contact_id: contact.id, email_id: em.id, auto_send: autoSend });
});
```

### `wk-notify` (run reports + dashboard notifications)
```ts
Deno.serve(async (req) => {
  if (!auth(req)) return new Response("forbidden", { status: 403 });
  const body = await req.json();
  const d = db(); const client_id = await WORKENVO(d);

  if (body.report_run) {
    const r = body.report_run;
    await d.from("runs").update({
      status: r.status, prospects_found: r.prospects_found,
      icp_health: r.icp_health, icp_health_note: r.icp_health_note,
      manifest: r.manifest, finished_at: new Date().toISOString()
    }).eq("id", r.run_id);
  }
  if (body.notification) {
    await d.from("notifications").insert({ client_id, ...body.notification });
  }
  return Response.json({ ok: true });
});
```

Deploy all three (`--no-verify-jwt` because auth is the token, not a JWT):
```bash
supabase functions deploy wk-check-contacted --no-verify-jwt
supabase functions deploy wk-find-email      --no-verify-jwt
supabase functions deploy wk-insert-draft    --no-verify-jwt
supabase functions deploy wk-notify          --no-verify-jwt
```

Smoke test:
```bash
FN="https://YOURPROJECT.supabase.co/functions/v1"
TOK="the-agent-token-you-generated"
curl -s "$FN/wk-check-contacted" -H "x-agent-token: $TOK" \
  -H "content-type: application/json" \
  -d '{"prospects":[{"full_name":"Test Person","company":"Nowhere Ltd"}]}'
# expect: {"verdicts":[{...,"contacted":false,...}]}
```

## 0.6 — The Node app (scheduler only in Phase 0)

`.env` (chmod 600, gitignored):
```
SUPABASE_URL=https://YOURPROJECT.supabase.co
SUPABASE_SERVICE_KEY=eyJ...            # service role, for the app's own reads/writes
SUPABASE_FN_URL=https://YOURPROJECT.supabase.co/functions/v1
AGENT_TOKEN=the-hex-token             # same one the Edge Functions check
CLAUDE_CODE_OAUTH_TOKEN=              # from `claude setup-token`
TZ=Europe/Dublin
```

Deps: `@supabase/supabase-js`, `node-cron`, `dotenv`. Claude Code CLI installed globally and authed.

Scheduler loop:
```
node-cron daily at 07:00:
  cfg = read config (daily_quota, paused, send_window)
  if cfg.paused: return
  times = spread cfg.daily_quota across send_window, + random 0–25 min jitter
  for each time: scheduleAt(time, () => runOnce())

runOnce():
  // hold if Apollo is blocked (an undismissed apollo error notification exists)
  if apolloBlocked(): writeNotification(error, apollo, "Skipped — Apollo blocked"); return

  run_id = insert runs row (status 'running')
  download 4 skill files from bucket `workenvo-skill` → ./workspace/
  spawn:
     timeout 25m claude -p "/start-outreach-workenvo 1" \
       --dangerously-skip-permissions \
       (cwd ./workspace,
        env: SUPABASE_FN_URL, AGENT_TOKEN, RUN_ID=run_id, CLIENT_SLUG=workenvo)
  on exit:
     if runs row still 'running': mark failed; writeNotification(error, claude, "Run didn't complete")
     // Claude rate-limit shows as timeout/non-zero exit → mark 'blocked_claude', notify.
     //   Rare at 2/day on Pro.

apolloBlocked() = is there an undismissed notification with source='apollo' level='error'?
  If yes, hold runs. Dismissing it on the dashboard (after topping up Apollo) unblocks.
```

## 0.7 — Phase 0 test order (each step proves the last)
1. `claude -p "say hello"` works → token good.
2. Schema ran, `workenvo` client + config rows exist.
3. Edge Function smoke test returns a verdict → token + functions + DB path good.
4. Trigger `runOnce()` manually. Watch: a `runs` row appears → a `contacts` row appears → an `emails` row appears with `status='draft'`. That is a full drafting run with no human and no sending.
5. Point your dashboard at these tables (queries in the Frontend section below) and see the draft render with its why-this-angle bullets and sources.

Phase 0 is done when a scheduled run produces a reviewable draft in the database.

---

# PHASE 1 — Move compute to a GCP VM

Nothing about the database or Edge Functions changes. Only the machine running the Node app + Claude Code moves. No schema changes in this phase.

## 1.1 — The VM
- **e2-small** (2 vCPU shared, 2 GB) + a 1 GB swapfile. Resize to e2-medium in one command if runs OOM.
- Ubuntu 24.04, 20 GB disk, region europe-west1 or europe-west2 (near the Supabase region).
- No inbound ports — access via the console's SSH / IAP. Egress open to: the Supabase project, `api.anthropic.com`, `api.apollo.io` (only reached via Edge Functions anyway), and later `googleapis.com`.
- Cost is on GCP credits.

## 1.2 — Deploy
```
git clone <your repo>            # the Node app + a gitignored .env
cd repo
# create .env (chmod 600) — SAME contents as Phase 0
# paste the CLAUDE_CODE_OAUTH_TOKEN from your Mac's `claude setup-token`
#   (no browser needed on the VM — the token is already long-lived)
npm install
# install Claude Code CLI, confirm `claude -p "say hello"` works with the token
```

## 1.3 — Keep it running
One systemd unit with `Restart=always` running the Node app. Deploy updates with `git pull && systemctl restart`.

Cron gotcha: cron/systemd does not load your shell profile. The wrapper script must `source` the `.env` and use the full path to the `claude` binary.

Phase 1 is done when scheduled runs happen on the VM without your Mac being on.

---

# PHASE 2 — Connect Gmail (sending + reply detection)

This adds outbound email. Until now, drafts sit in the database with `status='draft'` and are reviewed on the dashboard. Phase 2 makes the "Send" button actually send.

## 2.1 — Gmail service account (one-time, needs Workspace admin)

**Google Cloud (your credits project):**
1. APIs & Services → Enable APIs → **Gmail API** → Enable.
2. IAM & Admin → Service Accounts → Create. Name: `workenvo-sender`. No roles.
3. Open it → Keys → Add key → JSON. Download → this is `gmail-sa.json` (lives only on the VM, chmod 600, never in git).
4. Copy the service account's **Unique ID** (the long number).

**Workspace Admin console (founder's login, once):**
5. Security → Access and data control → API controls → Domain-wide delegation → Add new.
6. Client ID: the Unique ID from step 4.
7. Scopes (both — send now, readonly for reply detection): 
   `https://www.googleapis.com/auth/gmail.send,https://www.googleapis.com/auth/gmail.readonly`
   (Send-only if you want to defer reply detection; add readonly when you build the poller.)
8. Authorise.

## 2.2 — Prove sending works standalone before wiring it in
`send-test.js`:
```js
// node send-test.js you@example.com
import { google } from "googleapis";
import fs from "fs";

const SA = JSON.parse(fs.readFileSync("./gmail-sa.json", "utf8"));
const SENDER = "saransh@envo.club";

const auth = new google.auth.JWT({
  email: SA.client_email, key: SA.private_key,
  scopes: ["https://www.googleapis.com/auth/gmail.send"],
  subject: SENDER,
});

function rfc2822({ to, subject, body }) {
  const lines = [
    `From: Saransh <${SENDER}>`, `To: ${to}`, `Subject: ${subject}`,
    "Content-Type: text/plain; charset=utf-8", "", body,
  ].join("\r\n");
  return Buffer.from(lines).toString("base64url");
}

const gmail = google.gmail({ version: "v1", auth });
const to = process.argv[2] || SENDER;
const res = await gmail.users.messages.send({
  userId: "me",
  requestBody: { raw: rfc2822({ to, subject: "Workenvo send test", body: "It works." }) },
});
console.log("sent:", res.data.id);
```
```bash
npm install googleapis
node send-test.js you@youremail.com
```
If an email arrives from saransh@envo.club, Gmail is done.

## 2.3 — Add the sender loop to the Node app
Add `GMAIL_SA_PATH=./gmail-sa.json` to `.env`. Add this loop:
```
every 2 min:
  cfg = read config; if cfg.paused: return
  rows = emails where status='approved'
  for each row:
    contact = load contact
    guard: contact.email_status === 'verified'  else status='failed'; notify; continue
    set status='sending'                          // idempotency latch
    try:
      msgId, threadId = gmailSend(to=contact.email, subject=row.subject, body=row.body,
                                  from=cfg.sender_email, name=cfg.sender_name)
      status='sent', sent_at=now,
      provider_meta={message_id:msgId}, gmail_thread_id=threadId
      contact.status='sent'
    catch quota/rate error (429 / 403 rateLimitExceeded / quotaExceeded):
      status='approved'                           // put back for next tick
      if DAILY limit: writeNotification(warning, gmail, "Daily send limit hit, resumes ~08:00")
                      pause sending until next 08:05 Dublin
                      // Gmail daily quota resets midnight Pacific = ~08:00 Dublin
      else: let the 2-min tick retry
    catch other: status='failed'; notify
```
`gmailSend` = the JWT + rfc2822 code from `send-test.js`, returning `data.id` and `data.threadId`.

**The dashboard "Send" button does one thing:** `UPDATE emails SET status='approved'`. The sender loop picks it up within 2 min. Gmail credentials live only in the Node app, never in the frontend.

To send with no human review, set config `auto_send=true` — then `wk-insert-draft` writes new drafts as `approved` directly and they send on the next tick. No code change.

## 2.4 — Add the reply poller (needs the readonly scope)
```
store lastHistoryId (in config or a small table)
every 5 min:
  changes = gmail.users.history.list(startHistoryId=lastHistoryId)   // only the delta, never a full scan
  for each new inbound message:
    match: emails where gmail_thread_id = message.threadId and status='sent'
    if match:
      status='replied', replied_at=now, reply_body=snippet
      contact.status='replied'
      writeNotification(info, gmail, "Reply from <name> — <company>")
  lastHistoryId = newHistoryId
```
`history.list` returns only what changed since the checkpoint, so this scales without scanning the mailbox. At high volume later, swap the poll for Gmail `users.watch` + Pub/Sub push (same match-and-flip handler, different trigger).

## 2.5 — Phase 2 test order
1. `node send-test.js you@you.com` → email arrives.
2. In the database, manually set an existing draft's email row to `status='approved'` (with a contact whose `email_status='verified'` and email = your own). Within 2 min → real email arrives. Sending proven.
3. From the dashboard, click Send on a draft → it flips to `approved` → sends. Full path proven.
4. Reply to a sent email from another account → within 5 min the email row flips to `replied` and a notification appears.

---

# Frontend (your dashboard — reads these tables)

```ts
// the feed
const { data } = await supabase
  .from("emails")
  .select(`id, subject, body, why_this_angle, sources, status, created_at,
           contacts ( full_name, title, company, location, email, email_status, phone, phone_status )`)
  .eq("client_id", WORKENVO_ID)
  .order("created_at", { ascending: false });

// the Send button (Phase 2)
await supabase.from("emails").update({ status: "approved" }).eq("id", emailId);

// notifications
const { data: notifs } = await supabase
  .from("notifications").select("*").eq("dismissed", false)
  .order("created_at", { ascending: false });
// dismiss: update notifications set dismissed=true where id=...
```

Phone reveal is a separate frontend route you own: on click, it looks up the number and writes `contacts.phone` / `phone_status`. The feed query above already surfaces those fields.

---

# The runbook — where to change things after it's built

| Want to change | Touch |
|---|---|
| Emails per day | `config` row `daily_quota` |
| Send times / spacing | `config` row `send_window` |
| Send without review (Phase 2) | `config` row `auto_send` → `true` |
| Pause everything | `config` row `paused` → `true` |
| ICP / voice / product / skill | edit the file in the `workenvo-skill` bucket |
| Apollo key | `supabase secrets set APOLLO_API_KEY=...` |
