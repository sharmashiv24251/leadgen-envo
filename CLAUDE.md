@AGENTS.md

# Project state (Workenvo outreach automation)

Full spec/build guide: `backend/devinstruction.md`. This section is a snapshot of what's
actually been built and deployed, so a new session doesn't have to rediscover it.

## The three pieces, and how they fit

1. **Supabase** (project `nxseeggqmfhpnxjlnmaz`) — the only source of truth. Everything
   else is stateless and can be recreated from it.
2. **Backend** (`backend/`) — a Node.js scheduler + the Claude Code CLI, running as a
   systemd service on a GCP VM. This is what actually finds/researches/drafts prospects.
3. **Frontend** (repo root, Next.js) — dashboard that reads Supabase directly and can
   enqueue new runs. Two login accounts with very different data sources (see below).

Nothing talks to the VM directly — it has no inbound ports open. The frontend and the VM
both only ever talk to Supabase; a `run_requests` table is the queue connecting them.

## Supabase
- Tables: `clients`, `config` (daily_quota=2, auto_send=false, paused=false — control panel,
  no code change needed to adjust), `contacts`, `email_messages` (renamed from `emails`
  2026-07-17 — now holds every message in a contact's thread: intro/follow_up/reply/custom,
  not just one row per contact; see `internal-tool-to-saas.md`), `runs`, `notifications`,
  `run_requests` (the manual/scheduled run queue). Full schema in `backend/devinstruction.md` §0.2.
- Edge Functions (all deployed, `--no-verify-jwt`, auth via `x-agent-token` header):
  `wk-check-contacted`, `wk-find-email` (real Apollo, **not** stubbed — a test stub existed
  briefly during dev and was reverted), `wk-insert-draft`, `wk-notify`.
- Storage bucket `workenvo-skill` holds `SKILL.md`/`icp.md`/`voice.md`/`product.md` — the
  agent's actual prompt/brain. Local files in `backend/` are the source of truth; there's no
  MCP upload tool, so re-upload manually via Studio after editing any of them.
- Current data: clean (test data was purged). As of last check: 1 `run_requests` row
  in-flight from a manual dashboard trigger.

## Backend / GCP VM
- GCP project `Leadgen`, VM `outreach-leadgen`, region `europe-west2`, `e2-small`
  (2 vCPU/2GB + a 1GB swapfile), Ubuntu 26.04 LTS Minimal, 15GB disk.
- Repo cloned to `~/leadgen-envo` on the VM, running from `backend/`. Full setup + redeploy
  steps: `backend/DEPLOY.md`. Redeploy = `git pull && npm install && sudo systemctl restart
  workenvo-scheduler`.
- systemd service `workenvo-scheduler` (`Restart=always`, enabled). `backend/src/scheduler.js`
  polls the `run_requests` table every 30s and processes one at a time (FIFO) — the daily
  07:00 Europe/Dublin cron just enqueues `daily_quota` into that same table, so the schedule
  and manual/dashboard triggers share one queue and can never run concurrently.
- `backend/src/runOnce.js` does the actual `claude -p /start-outreach-workenvo N` spawn, capped
  at 3 prospects per agent invocation (`runBatch` chunks larger requests), with rate-limit-aware
  retry/backoff and DB-level mutual exclusion (checks for any `runs` row already `status='running'`
  before starting — matters because manual SSH runs and the scheduler are separate processes).
  `backend/src/streamLogger.js` renders the CLI's `stream-json` output into readable log lines.
- Known open item: sudo on this VM broke out of the box (missing NOPASSWD rule for the
  `google-sudoers` group) and was seen reverting mid-session at least once — root cause not
  confirmed (suspect `google-guest-agent` reconciling something). Workaround in place: a VM
  startup script re-writes `/etc/sudoers.d/90-google-sudoers` on every boot.

## Frontend (Next.js, repo root)
- Two login accounts (`lib/auth.ts`, `app/login/page.tsx`), both hardcoded, localStorage-based:
  - `thehrcompany` / `thehrcompany` → 100% mock/demo data (`lib/data.ts`), untouched, kept as-is.
  - `saransh@workenvo.com` / `$aransh@workenvo.com` → real Supabase data via `lib/workenvoData.ts`
    (anon key, client-side fetch, hardcoded `WORKENVO_CLIENT_ID`).
- Dashboard (`components/DashboardView.tsx`) shows a **"Run outreach ▸"** button (only for the
  workenvo account) — `components/RunTrigger.tsx` inserts a row into `run_requests`; the VM
  picks it up within 30s. Status shown live (queued/running). Also shows the auto-send toggle +
  default-sender dropdown (`components/AutoSendToggle.tsx`, see Phase 2 below) and four KPI
  panels in this order: Total Leads Found (hero) → Reply Rate → Emails Delivered → Total
  Drafted (Bounce Rate panel was removed).
- `TopBar.tsx` has the sign-out button and shows the active account's brand name.

## Phase 2 (Gmail sending) — sending is done; reply/bounce detection is not
Full original plan: `backend/devinstruction.md` §2 (superseded in places — see annotations
there). Status as of 2026-07-13 (updated, same day, later session):

**Architecture actually built — deliberately different from the original §2.3 plan.** Instead
of a VM polling loop with the Gmail key on the VM, sending lives entirely in Supabase: a
`wk-send-email` Edge Function (Gmail service-account JWT signed with Web Crypto, no `googleapis`
dependency) holds the credential, and two Postgres triggers on `email_messages`
(`emails_approved_send_insert`, `emails_approved_send`) fire it via `pg_net` the instant a row's
`status` becomes `'approved'` — whether that happens because `wk-insert-draft` auto-approved it
(`auto_send=true`) or a human clicked "Send Now" on a `draft`. **The GCP VM and the agent's
`SKILL.md` needed zero changes** — `wk-insert-draft` already made the auto_send/draft decision
server-side before this work started; the VM only ever calls that one function and has no
knowledge that sending exists downstream. Confirmed unchanged: identical content hash and
deploy timestamp on `wk-check-contacted`/`wk-find-email`/`wk-insert-draft`/`wk-notify` across
the whole session.

- **Done and live-verified with a real send** (Gmail `message_id` returned, email actually
  arrived): Gmail API/service-account/delegation (unchanged from before, see §2.1); the
  `wk-send-email` Edge Function; both Postgres triggers (INSERT path tested with a disposable
  contact — confirmed it reaches the function; UPDATE path tested with a real send); the two
  required secrets, `AGENT_TOKEN` copied into Supabase Vault (`vault.create_secret(...,
  'agent_token')`) and `GMAIL_SA_KEY` as an Edge Function secret; `config` RLS (previously zero
  policies — now public `SELECT` plus `UPDATE` scoped to only `auto_send`/`sender_email`, so the
  anon key can't touch `daily_quota`/`paused`/`sender_options`); a new `config.sender_options`
  row and a per-email `emails.send_from` override column, letting a specific send pick either
  `saransh@envo.club` or `info@envo.club` — **both now confirmed to be real, working mailboxes**
  (delivered live test emails as each), resolving the "is `info@` a real seat or an alias"
  open question from earlier.
- **Frontend, wired directly to Supabase (anon key), no backend call involved:** Command
  Center has an auto-send toggle (`config.auto_send`) and, when on, a default-sender dropdown
  (`config.sender_email`) — both in `components/AutoSendToggle.tsx`. The email detail page
  (`components/EmailDetail.tsx`) replaced the old "Send via Gmail" compose-window button with a
  per-email sender dropdown + "Send Now" button that actually calls the API path above.
- **Existing drafts are never retroactively sent.** Toggling `auto_send` only edits the
  `config` table; it never touches existing `email_messages` rows. Only newly-inserted drafts (after
  the flag is on) get auto-approved; the flag is read once per email, at insert time.
- **Not done:** reply detection and bounce detection — §2.4 code was never built, but the
  scope blocker is gone: `gmail.readonly` was added to the domain-wide delegation scopes on
  2026-07-17 (Client ID `102461381722782053803`, alongside the existing `gmail.send` scope —
  same key, no redeploy needed). `bounced` status exists in the schema but nothing sets it.
  No rate-limit/quota backoff on send — any Gmail API error
  just marks the row `failed` once (no auto-retry); low risk at today's `daily_quota=2` but a
  gap vs. the original §2.3 plan if volume grows. **None of this is committed to git yet** —
  still local working-tree changes (the Supabase-side migrations/Edge Function are already live
  regardless of git, since they were applied directly).

## Not built yet / explicitly deferred
- CI/CD is manual by choice (redeploy = SSH + `git pull` + restart, not on every push).
- No alerting if the scheduler process goes down and stays down.
- Reply detection and bounce detection — not built, but no longer blocked: `gmail.readonly`
  was added to the domain-wide delegation scopes on 2026-07-17 (see Phase 2). Building the
  poller itself is still open work.
- Rate-limit/quota backoff on the send path (`wk-send-email` fails once, no auto-retry).
