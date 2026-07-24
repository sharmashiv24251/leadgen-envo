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
  no code change needed to adjust), `contacts` (gained `stage`/`lost_reason` on 2026-07-19 for
  the Funnel board — see CRM section below), `email_messages` (renamed from `emails`
  2026-07-17 — now holds every message in a contact's thread: intro/follow_up/reply/custom,
  not just one row per contact; see `internal-tool-to-saas.md`), `runs`, `notifications`,
  `run_requests` (the manual/scheduled run queue), `mailbox_poll_state` (one row per mailbox,
  reply-poller cursor — `internal-tool-to-saas.md` Phase 1), `contact_notes` (2026-07-19,
  freeform notes on a contact, full CRUD). Plus one view, `prospect_feed` (2026-07-19) —
  computes each contact's effective funnel stage server-side and backs the paginated Outreach
  Feed; see CRM section below. Full base schema in `backend/devinstruction.md` §0.2, CRM
  additions in §PHASE 3.
- Edge Functions (all deployed `--no-verify-jwt` and auth'd via `x-agent-token`, except
  `wk-send-custom-reply` which is JWT-gated since it's called from the browser):
  `wk-check-contacted`, `wk-find-email` (real Apollo, **not** stubbed — a test stub existed
  briefly during dev and was reverted), `wk-insert-draft`, `wk-notify`, `wk-send-email`,
  `wk-poll-replies`, `wk-send-custom-reply`, `wk-debug-thread` (a debug helper).
- Storage bucket `workenvo-skill` holds `SKILL.md`/`icp.md`/`voice.md`/`product.md` — the
  agent's actual prompt/brain. Local files in `backend/` are the source of truth; there's no
  MCP upload tool, so re-upload manually via Studio after editing any of them.
- Known stale state, not yet cleaned up: a `run_requests` row from 2026-07-09
  (`0242249e-f9d5-42e8-834a-e653d314ac51`) is stuck at `status='running'` forever — its
  underlying `runs` row actually finished the same day as `blocked_claude`, but nothing ever
  flipped the `run_requests` row itself to `done`/`failed`, a real gap in `runOnce.js`'s
  failure-path bookkeeping. Hasn't blocked anything since (every run since has completed fine),
  but reads as misleadingly "in-flight" if you query `run_requests` directly.

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
  Drafted (Bounce Rate panel was removed). KPIs and the recent-activity list are their own lean
  queries (`fetchDashboardStats`/`fetchRecentActivity`), independent of the Outreach Feed below.
- `TopBar.tsx` has the sign-out button, the active account's brand name, and (2026-07-19) a
  Command Center / Outreach Feed / Funnel nav-tab switcher — the only top-level nav in the app;
  deliberately no persistent sidebar outside `/emails` (see `DESIGN.md`).
- Outreach Feed (`/emails`, `components/EmailSidebar.tsx`) infinite-scrolls at 40/page
  (2026-07-19) instead of loading every prospect at once, with two dropdown filters (email
  status, funnel stage) instead of the old pill row, both server-filtered via the `prospect_feed`
  view. The detail page (`/emails/[id]`) fetches by contact id and reuses an already-loaded feed
  row instantly when possible (react-query `initialData`), so opening a prospect from the feed
  still feels instant despite the feed itself being paginated — see CRM section below for why
  that mattered.
- Funnel Kanban board (`/funnel`, `components/FunnelBoard.tsx`, 2026-07-19) — drag-and-drop via
  `@dnd-kit/core`, six stages, cards clickable through to the prospect detail page. See CRM
  section below.

## Phase 2 (Gmail sending) — sending and reply detection are done; bounce detection is not
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
- **Reply detection — done and live since 2026-07-17** (this bullet used to say "not done"; it
  shipped the same day the scope blocker was — see `internal-tool-to-saas.md` Phase 1 for the
  full build). `gmail.readonly` was added to the domain-wide delegation scopes on 2026-07-17
  (Client ID `102461381722782053803`, alongside the existing `gmail.send` scope — same key, no
  redeploy needed) specifically to unblock it.
- **Not done: bounce detection.** `bounced` status exists in the schema but nothing sets it.
- No rate-limit/quota backoff on send — any Gmail API error just marks the row `failed` once
  (no auto-retry); low risk at today's `daily_quota=2` but a gap vs. the original §2.3 plan if
  volume grows. **None of this is committed to git yet** — still local working-tree changes (the
  Supabase-side migrations/Edge Function are already live regardless of git, since they were
  applied directly).

## CRM (Funnel, Notes, paginated feed) — 2026-07-19

This is `internal-tool-to-saas.md`'s "Phase 2 — CRM frontend" — an unrelated numbering from this
file's own "Phase 2" above (that one's `devinstruction.md`'s build-phase track; this one's the
roadmap doc's). Full build detail and gotchas in `backend/devinstruction.md` §PHASE 3; this is
just the snapshot.

- **Funnel/Kanban board — done.** `/funnel`, drag-and-drop, six stages (Leads/Intro sent/
  Follow-up sent computed server-side via the new `prospect_feed` view; Meeting booked/Contract/
  Deal lost are the only ones a rep sets manually, via `contacts.stage`/`lost_reason`).
- **Notes — done, shape changed from the original spec.** Floating sticky-notes widget on the
  prospect detail page, not an inline append-only card — fully editable/deletable now (RLS
  widened from select+insert to full CRUD), and no author field (hardcoded to `"You"`, since
  there's no real per-user identity anywhere in this app).
- **Prospect detail page funnel stage — done** (view-only chip; still changed via the Kanban
  board, not from the detail page). **Real Apollo phone reveal — done (2026-07-19).** First
  version wrongly assumed Apollo's `people/match` returns a personal phone number synchronously;
  in reality `reveal_phone_number=true` *requires* a `webhook_url` and Apollo only delivers the
  actual number minutes later via a POST to it — every one of the first ~10 live clicks got
  silently written to the DB as `phone_status='not_found'` because the old code didn't
  distinguish "Apollo genuinely found nothing" from "Apollo rejected the request for missing
  `webhook_url`." Those bogus `not_found` rows were reset back to `null` directly in the DB so
  they're retryable with the fixed version, not stuck.

  Current shape: `wk-reveal-phone` (JWT-gated + CORS, browser-callable, same pattern as
  `wk-send-custom-reply`) resolves the contact server-side, calls Apollo's `people/match` with
  `reveal_phone_number=true` **and** `webhook_url` pointing at a new `wk-phone-webhook` function
  with `contact_id` and a shared token baked into the URL's query string (Apollo's webhook has no
  auth header of its own, and its payload has no field that correlates back to the original
  request — reusing the existing `AGENT_TOKEN` secret and stashing `contact_id` in the URL was
  the only reliable way to do both). `contacts.phone_status` is now a real tri-state
  (`null`/`'pending'`/`'verified'`/`'not_found'`), fetched all the way to the frontend
  (`Prospect.phoneStatus`, added to the `prospect_feed` view too) so the UI reflects it correctly
  even across a reload, not just in the moment right after clicking. `EmailDetail.tsx` shows
  "Reveal phone" → "Revealing… (can take a few minutes)" → either the normal copy-badge/call-icon
  UI or a "No phone found" + Retry control. `useProspectDetail` (`lib/useAccountData.ts`) polls
  every 5s only while `phoneStatus === 'pending'`, since the real answer lands out of band from
  the click. A second click while a reveal is genuinely in flight is blocked server-side (returns
  the existing `pending` instead of firing Apollo again) unless it's been stuck over 10 minutes,
  in which case it's treated as abandoned and retried. **A third bug found by re-checking against
  Apollo's actual webhook doc (not caught by the earlier fix):** the webhook payload nests
  `phone_numbers` inside a `people[0]` array (`{ people: [{ status, phone_numbers }] }`), unlike
  the synchronous `people/match` response's singular `person` object — `wk-phone-webhook`
  originally read `phone_numbers` off the payload root, which would've silently written
  `not_found` for every real webhook delivery too, exactly the same failure mode as bug #1 just
  one layer further down the pipe. Fixed by reading `payload.people?.[0]?.phone_numbers`.

  **Root cause of "stuck in pending forever," confirmed 2026-07-20: this Apollo account's phone
  access expired (~8 days before mobile-credit access was fully removed per Shivansh) — not a
  code bug.** Diagnostic logging showed the sync `people/match` response's `person` object has no
  `phone_numbers` key at all, under two different request shapes (identifying fields in the body,
  then matching Apollo's own doc example with them as query params instead) — Apollo isn't
  queuing a phone job at all, so no webhook was ever going to arrive regardless of how long it
  polled. **The implementation itself is correct and doesn't need to change** once phone access is
  back on a paid plan — same `wk-reveal-phone` → Apollo → `wk-phone-webhook` → `contacts` →
  polling UI flow should just start working. Temporary diagnostic `console.log`s added during this
  investigation have been removed.

  **The `verified` path is now confirmed end-to-end, 2026-07-22** (via The HR Company's own paid
  Apollo account, on an HR Company contact — the underlying `wk-reveal-phone`/`wk-phone-webhook`
  code is identical for both clients, so this is the first real confirmation the whole flow
  works, full stop, not something specific to one client). Resolved much faster than Apollo's own
  documented *"typically several minutes"* — reported as near-instant on this occasion. Treat
  that as one anecdotal data point on the fast end of Apollo's own range, not a new guaranteed
  latency — the UI's "can take a few minutes" framing and the 10-minute stale-pending retry
  threshold both still stand as the honest expectation.
  **Fourth gap, also fixed:** the `'pending'` UI state had no escape hatch at all -- if Apollo's
  webhook never arrives (missing mobile-phone credits on the plan, delivery failure, anything),
  the button showed "Revealing…" with no way to retry, forever, since it wasn't even rendered as
  a button in that state. Added a "Retry" action next to it (safe to click any time — the server
  only re-fires Apollo once a pending reveal is itself over 10 minutes old, otherwise it just
  echoes back `pending`).
- **Companies/Contacts table split — not started.** Unblocked now that the funnel data shape
  has settled, but nobody's picked it up yet.
- **Not originally scoped, but became necessary mid-work:** the Outreach Feed's prospect list
  went from one unbounded query (every prospect, full body + `why_this_angle`, no limit) to a
  paginated, 40/page infinite-scroll feed — the old approach would have gotten meaningfully
  worse once the Funnel/Notes work made people actually use the feed daily. Real gotcha hit along
  the way: Postgres views default to definer-style permissions, not invoker, which the security
  advisor caught immediately after `prospect_feed` was first created (fixed with
  `security_invoker = true`).

## Second client onboarding (The HR Company) — started 2026-07-22, production-ready same day

**Status: the entire pipeline is real, deployed, and live-verified end to end** — discovery,
research, drafting, the dashboard, and phone reveal have all produced genuine results against
production data using this client's own credentials throughout (not shared/borrowed from
Workenvo anywhere). The only two things intentionally not done are listed at the very end of
this section, and neither blocks lead accumulation.

Piloting the whole system with a second real client for the first time: **The HR Company**
(Ireland-based HR outsourcing, contact Bianca, `bianca@thehrcompany.ie`). Explicit scope
decision from Shivansh: this is Workenvo (own tool) + one pilot client, full stop, for the
foreseeable future — build simple per-client branches, not a generic N-tenant plugin framework.
Same Supabase project (`nxseeggqmfhpnxjlnmaz`) always — a second project was explicitly ruled
out even though the agent runtime and send provider both differ from Workenvo's.

- **Agent runtime is Antigravity CLI (`agy`), not Claude Code, for this client** — Google's
  agentic coding tool, Gemini 3.6 Flash model, authenticated via the client's own Gemini API
  key (not OAuth). Confirmed working headless (`agy -p "prompt"`, no browser popup) both
  locally and on the actual `outreach-leadgen` VM. Proven end-to-end against real production
  Workenvo Supabase data as a capability test (found/verified/researched/drafted a real
  prospect, Thomas Forstner @ Juro, quality comparable to Claude Code's output) before writing
  any HR-Company-specific files. `agy`'s subagent mechanism is real but implicit (a monitorable
  `/agents` panel, not a named tool like Claude Code's `Task`) — skill files now phrase
  delegation tool-agnostically ("spawn a dedicated subagent") so the same wording is correct
  for either agent.
- **Send provider will be Outlook/Microsoft 365** (Bianca's mailbox), not Gmail. Access model
  — org-wide Azure AD app registration (Gmail-delegation equivalent) vs. single delegated
  mailbox — **not decided yet**, deferred pending a conversation with Bianca. No Outlook-side
  Edge Function exists yet; it should follow `wk-send-email`'s exact pattern (Postgres trigger
  on `email_messages` → `pg_net` → new function → Microsoft Graph) once the access model lands.
- **Edge Functions are now multi-tenant-aware.** `wk-check-contacted`, `wk-find-email`,
  `wk-insert-draft`, and `wk-notify` previously hardcoded `client_id` to the `workenvo` row
  no matter what — a real bug that would have silently written The HR Company's contacts/drafts
  under Workenvo's data. Fixed 2026-07-22: all four now resolve `client_id` from an explicit
  `client_slug` field in the request body, defaulting to `"workenvo"` when absent (fully
  backward compatible — verified live, the no-`client_slug` path returns byte-identical
  behavior). An unrecognized `client_slug` fails loudly (500) rather than silently falling back
  to Workenvo — deliberate, matches this codebase's existing fail-loud philosophy elsewhere.
  Versions: `wk-check-contacted` v3→v4, `wk-find-email` v5→v6, `wk-insert-draft` v6→v7,
  `wk-notify` v3→v4.
- **`clients` row seeded**: slug `thehrcompany`, `send_provider='outlook'`, plus a `config` row
  with `daily_quota=10` and `auto_send=false`. No new `total_quota` concept was needed: the
  existing `MAX_PROSPECTS_PER_RUN=3` + `runBatch()` chunking in `runOnce.js` already does "3 at
  a time, keep going," so "10 emails/day" is just this `daily_quota` value.
- **New storage bucket `thehrcompany-skill`** created (private, mirrors `workenvo-skill`), and
  all four skill files (`SKILL.md`, `product.md`, `icp.md`, `voice.md`) are uploaded and kept in
  sync with the local `The HR Company/` copies (re-uploaded with `x-upsert: true` whenever those
  local files change).
- **New skill files** at repo root in `The HR Company/` (deliberately separate from `backend/`,
  which holds Workenvo's files directly, for per-client bookkeeping). Sender persona is Bianca.
  Adapted from Workenvo's files (same four-move email structure, same hard rules about
  VERIFIED-only facts) but: subject-line guidance deliberately simplified (Workenvo's rigid
  2-4-word formula and its "wrasslin" example were called out as the one weak part, not reused);
  "hook material" reworked because most of this ICP's real triggers (a bad disciplinary, a WRC
  case) are private and unsearchable, so the file points at public correlates instead (HR/admin
  job postings, new sites, public WRC records, CRO incorporation dates for the secondary ICP);
  the privacy line is replaced with a "trust line" defusing a different objection ("I'll pay for
  a document portal and still be alone when something happens," not a data-privacy concern);
  pricing and client-logo social proof are explicitly marked unknown in `product.md` rather than
  invented. `SKILL.md` deliberately has **no implementation-status/changelog content in it** —
  a status note was added there during the build, then removed once it was noticed that this
  file gets re-read (and billed as input tokens) on every single real run; that kind of history
  belongs here or in `The HR Company/Accommodate the HR company.md`, never in a file the agent
  actually consumes.
- **Apollo per-client key routing — done.** `wk-find-email` maps `client_slug` to the right
  Apollo secret (`workenvo`→`APOLLO_API_KEY`, `thehrcompany`→`APOLLO_API_KEY_THEHRCOMPANY`),
  fails loudly on an unrecognized slug, live-verified against Bianca's own Apollo account.
- **`agy` installed and authenticated directly on `outreach-leadgen`** as the `info` OS user
  (same user `workenvo-scheduler` already runs as — confirmed via `systemctl show
  workenvo-scheduler -p User`, no mismatch). Landed on `info@envo.club (Antigravity Business)`
  via Google OAuth, not the dedicated AI-Studio API key + Leadgen GCP project billing that was
  separately confirmed safe (spend cap set; real `Cost − Savings = €0.00` evidence). Two
  different, both-currently-untroubled billing mechanisms — don't assume one's safety extends
  to the other without checking. This CLI version's login menu offers only OAuth or
  "Use a Google Cloud project" (which routes through Vertex AI, a separate product from AI
  Studio's Gemini API) — no plain API-key-paste prompt ever appeared, contrary to the original
  plan; a PKCE bug (`Code Challenge must be base64 encoded`) on the GCP-project path was worked
  around by simply retrying.
- **GCP-side scheduler — built, deployed, and live-verified with a real end-to-end run.**
  `runOnce.js` branches per `client_slug`: `thehrcompany` spawns `agy` with a literal
  instruction prompt (no slash command, no `--output-format` flag) instead of `claude`, and
  each client gets its own `workspace/<slug>/` directory so the two clients' schedulers (which
  can legitimately overlap in time — the run-in-progress check is scoped per `client_id`) can't
  clobber each other's files. `downloadSkillFiles.js` is parameterized per client
  (bucket + placement). `streamLogger.js` has a plain passthrough logger for `agy`'s
  unstructured stdout (`attachPlainLogger`) alongside the original NDJSON parser for Claude.
  `scheduler.js` was redesigned mid-build: an initial `CRON_SCHEDULE` env-var idea (fixed
  `{time, count}` firings baked into `.env`) was scrapped once Shivansh clarified he didn't want
  either the schedule or the quota requiring a redeploy to change — the actual design polls
  every 30s and reads `config.daily_run_time` (e.g. `"20:00"`) and `config.daily_quota` fresh
  from Supabase each tick, both changeable with a plain SQL `UPDATE`. "Already fired today" is
  checked against real `run_requests` rows, not an in-memory flag, so a restart can't cause a
  double-fire or a missed day — and if the process is down exactly at the trigger time, it
  fires as soon as it's back up rather than silently skipping that day. Workenvo has no
  `config.daily_run_time` set and keeps its original hardcoded `07:00` default unchanged.
  `thehrcompany-scheduler` systemd service created (`User=info`) and confirmed `active
  (running)` with its own log line proving the new scheduler code actually loaded.
- **Two real bugs hit and fixed getting the first live run working:** (1) `agy` installs
  per-user at `~/.local/bin/agy`, added to `PATH` only by `.bashrc`/`.profile` (sourced for
  interactive SSH sessions, not for a systemd service, which starts with a minimal default
  `PATH`) — `claude` never hit this since it's installed globally via `sudo npm install -g`.
  First real trigger threw `spawn agy ENOENT`. Fixed by resolving `agy`'s absolute path directly
  in code (`path.join(os.homedir(), ".local", "bin", "agy")`) instead of depending on `PATH` at
  all — verified the exact path against `which agy` on the VM before trusting it. (2) That same
  failure exposed a **pre-existing** bug (not introduced by this work, just never triggered
  before): a `spawn()`-level error (as opposed to a normal non-zero exit) was handled via
  `reject()`, which threw straight past all the "mark this run failed" bookkeeping in
  `runOnce.js` and left the `runs` row stuck at `status='running'` forever — the exact same
  *class* of bug as the stale `run_requests` row found and fixed earlier this session, just a
  different table. Fixed by resolving with a captured `spawnError` instead of rejecting, so the
  failure path always runs; the one stuck row this created was cleaned up (`status='blocked_agent'`).
  Also split `runs.status` into `blocked_claude` (Claude Code) vs. **`blocked_agent`** (any other
  agent) so a non-Claude failure doesn't show a misleading Claude-specific status — `runBatch`'s
  retry check was updated to catch both, since fixing only the label would have silently treated
  a failed `agy` batch as if it had completed.
- **`wk-send-email` hardened against a real gap**: `auto_send=false` only stops a *new* draft
  from being auto-approved at insert time — it does nothing to stop a human manually clicking
  "Send Now" on an *existing* draft, which flips the same trigger regardless of client. Before
  this fix, an HR Company draft sent this way would fall through missing `sender_email`/
  `sender_options` config to a literal `"me"` placeholder and attempt a real OAuth call using
  **Workenvo's own Gmail service account** with garbage sender info — failing today only by
  accident (an invalid `sub` isn't a real mailbox), not by design. Fixed: `wk-send-email` now
  checks `clients.send_provider` first and refuses immediately (fail-loud, clear error) for any
  client whose provider isn't `"gmail"`, before any Gmail-specific logic runs.
- **`config.paused` flipped to `false`** and the first real unattended run triggered — confirmed
  actually spawning `agy` successfully (post-fix) and executing, not just enqueuing.
- **Two more real bugs hit and fixed during the first live runs**: (3) `agy -p` has its own
  internal execution deadline (`--print-timeout`, confirmed default `5m0s` via `agy --help`)
  completely separate from `runOnce.js`'s own 25-minute Node-side hard-kill timeout
  (`RUN_TIMEOUT_MS`) — with no override, `agy` was self-terminating at the 5-minute mark on a
  real 3-prospect run, well before the 25-minute Node timeout was ever relevant. Fixed by adding
  `--print-timeout 20m` to the spawn args (verified against Gemini's own diagnosis, which was
  itself cross-checked against the real file content, not taken on faith). (4) A restart landing
  mid-retry killed a run via `SIGTERM`, which correctly marked that `runs` row `'failed'` — but
  `runOnce()` returns a plain `"failed"` status for an interrupted run, and `runBatch()` only had
  special handling for `"blocked_claude"`/`"blocked_agent"`, so `"failed"` fell through to the
  success path (`remaining -= chunk`), silently marking a `run_requests` row `'done'` with **zero
  contacts actually created**. Fixed by folding `"failed"` into the same retry branch as the
  blocked statuses; the one falsely-`'done'` row this produced was corrected.
- **Frontend — done and live-verified in browser, 2026-07-22.** New `lib/thehrcompanyData.ts`
  mirrors `lib/workenvoData.ts` function-for-function, scoped to the real `thehrcompany`
  `client_id` (reuses the same Supabase client instance as `workenvoData.ts` rather than
  creating a second one, which was producing a "Multiple GoTrueClient instances" warning).
  `lib/auth.ts`'s `Account` type dropped `"mock"` entirely — both accounts are real now.
  `RunTrigger.tsx` and `AutoSendToggle.tsx` needed zero changes — already fully generic with no
  account-specific gating. Verified in browser: Command Center (real 10/day quota, 5 real leads,
  90% ICP health), Outreach Feed + prospect detail (real drafted content), Funnel board (all 5
  correctly bucketed). `lib/mockData.ts` is now unused but left in place, not deleted.
- **`wk-reveal-phone` also fixed for per-client Apollo keys, 2026-07-22.** Same gap as
  `wk-find-email` had — hardcoded to the single global `APOLLO_API_KEY`, so a phone reveal on
  an HR Company contact was silently spending Workenvo's Apollo credits. Fixed with a cleaner
  mechanism than `wk-find-email`'s: rather than trusting a `client_slug` the caller passes, it
  now looks up the contact's own `client_id` → `clients.slug` and resolves the Apollo secret
  from that — can't be spoofed or drift out of sync, and needs no extra parameter from the
  frontend at all. Audited every other Edge Function for the same class of gap while in there:
  `wk-send-custom-reply` was already correctly resolving `client_id` from the message row it
  queries (no fix needed); `wk-phone-webhook`/`wk-debug-thread` don't need client routing at all
  (no Apollo key involved on that side). One separate, unrelated gap found and logged (not
  fixed, not urgent): `wk-poll-replies` (Gmail reply detection) is still hardcoded to Workenvo
  only — currently dormant for The HR Company since Outlook sending doesn't exist yet, but will
  need the same treatment once it does.

### Final status, 2026-07-22

Everything below is real, deployed, and confirmed working with actual production data — not
just written, not just typechecked:

- **Drafting pipeline**: live, unattended, producing real on-ICP prospects (Michael Dixon, Tim
  Murphy, John Wallace, Ray Cole, Fergal Meagher confirmed so far) via Antigravity/Gemini,
  scheduled at a config-driven time (`20:00` Europe/Dublin by default, changeable with a plain
  SQL `UPDATE`, no redeploy).
- **Multi-tenancy**: every Edge Function that needs to know which client it's serving does so
  correctly — `wk-check-contacted`/`wk-find-email`/`wk-insert-draft`/`wk-notify` via an explicit
  `client_slug`, `wk-reveal-phone` by resolving the contact's own `client_id` (more robust,
  can't be spoofed). Apollo credits, drafts, and contacts for the two clients can no longer
  cross-contaminate anywhere this was checked.
- **Frontend**: The HR Company's real login shows real data — Command Center, Outreach Feed,
  prospect detail, Funnel board, phone reveal — all confirmed live in browser, not just assumed
  from the architecture.
- **Safety**: `wk-send-email` refuses any client whose `send_provider` isn't `"gmail"`, so
  Outlook not existing yet can't cause an accidental send.
- **Genuinely still open, neither blocking anything**: (1) Outlook/Microsoft 365 access model,
  waiting on a conversation with Bianca; (2) a real VM `free -h`/`ps aux` check, low priority
  given the per-client mutual exclusion is already confirmed safe; (3) `wk-poll-replies` will
  need the same per-client treatment once Outlook sending exists, logged as a known gap for
  that future work, not before.

## Not built yet / explicitly deferred
- CI/CD is manual by choice (redeploy = SSH + `git pull` + restart, not on every push).
- No alerting if the scheduler process goes down and stays down.
- Bounce detection — see Phase 2 above (reply detection is done; bounce detection is the
  remaining half).
- Rate-limit/quota backoff on the send path (`wk-send-email` fails once, no auto-retry).
- Companies/Contacts table split — see CRM section above. (Real Apollo phone reveal shipped
  2026-07-19, also see CRM section.)
