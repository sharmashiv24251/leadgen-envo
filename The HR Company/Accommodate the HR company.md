# Accommodating The HR Company — full context

Second real client for this system, piloting alongside Workenvo. This file is the complete,
current-state context for this effort — read this and nothing else needs re-explaining.

## Scope and hard constraints

- **Exactly two clients for the foreseeable future: Workenvo (own tool) and The HR Company
  (pilot client).** Build simple per-client branches everywhere, not a generic N-tenant plugin
  framework. Revisit only if a genuine third client materializes.
- **Same Supabase project always** (`nxseeggqmfhpnxjlnmaz`). A second project is permanently
  ruled out, even though the agent runtime and send provider both differ from Workenvo's. New
  tables/columns/Edge Functions are fine; a new project is not.
- The client is **The HR Company**, an Ireland-based HR outsourcing firm. Contact: **Bianca**,
  `bianca@thehrcompany.ie`. The existing frontend's mock/demo login (`thehrcompany` /
  `thehrcompany`, 100% fake data in `lib/data.ts`/`lib/mockData.ts`) was originally built as a
  sales pitch aimed at this exact client — the mock copy already reflects real positioning
  language and is a legitimate reference, not coincidence.
- Two axes differ from Workenvo; everything else (Supabase schema, dashboard patterns,
  Edge Function architecture) is shared and reused:
  1. **Agent runtime**: Antigravity CLI (`agy`), not Claude Code.
  2. **Send provider**: Outlook/Microsoft 365 (Bianca's mailbox), not Gmail.
- **Drafting and sending are fully decoupled.** `wk-insert-draft` only writes `status='approved'`
  when `config.auto_send=true`. `auto_send` is `false` for The HR Company, so lead
  accumulation/drafting works completely independently of whether Outlook sending exists at
  all. No Outlook Edge Function needs to exist for the drafting pipeline to run for real.
- **Sending scope right now: Bianca only**, for at least the next few weeks. The system already
  supports multiple senders per client generically (see Outlook section below) — no urgency to
  build for more than one sender yet.

## Antigravity CLI — confirmed facts

- Binary `agy`, installed at `/Users/shivansh/.local/bin/agy` (version 1.1.5 seen locally).
  Model: **Gemini 3.6 Flash** (a real, current Google model).
- `agy -p "prompt"` (alias `--print`) runs a single prompt fully headless — confirmed working
  with no browser popup, both on a Mac and on the actual `outreach-leadgen` GCP VM. Functions
  exactly like `claude -p` for scripted/cron invocation.
- Auth supports two modes: interactive Google OAuth (session cached in the OS keyring — macOS
  Keychain locally, confirmed NOT portable to a headless Linux VM) and **API-key auth**
  (confirmed working headlessly on the actual VM via the interactive first-run flow, using a
  Gemini API key). No env-var injection path exists (`GEMINI_API_KEY` etc. — searched the
  binary directly, not present); the one-time interactive first-run flow is the only way to
  authenticate, after which it works unattended indefinitely, same shape as Claude Code's
  `claude setup-token` model.
- **No confirmed structured/JSON output mode.** `agy --help` shows no `--output-format`/JSON
  flag — only plain final-text output. `streamLogger.js`'s NDJSON parser (built for Claude
  Code's `stream-json` format) cannot be reused as-is.
- Subagent delegation is real but **implicit** — a monitorable `/agents` panel with named roles
  (e.g. "Codebase Researcher"), not a callable named tool like Claude Code's `Task`. Skill files
  must phrase delegation tool-agnostically ("spawn a dedicated subagent") to read correctly on
  both platforms.
- `agy plugin import claude` exists but found nothing to auto-import locally — Claude Code's
  SKILL.md/marketplace-skill format is not auto-discovered by Antigravity. Skill files must be
  fed to it by explicit instruction (tell it directly to read the .md files in its working
  directory), not invoked as a slash command.
- **Capability proven end-to-end**: a real test run against production Workenvo Supabase data
  (before any HR-Company-specific files existed) found, verified via Apollo, researched, and
  drafted a real prospect (Thomas Forstner, VP People & Talent @ Juro) with quality comparable
  to Claude Code's own output.

## Supabase changes — done

- `clients` row: slug `thehrcompany`, name "The HR Company", `send_provider='outlook'`.
- `config` rows for that client: `daily_quota=10`, `auto_send=false`, **`paused=true`**
  (deliberate safety gate, still in place — see "What's left").
- Storage bucket **`thehrcompany-skill`** created (private, mirrors `workenvo-skill`), and all
  four skill files (`SKILL.md`, `product.md`, `icp.md`, `voice.md`) are uploaded to it.
- **Edge Functions are now multi-tenant-aware.** `wk-check-contacted`, `wk-find-email`,
  `wk-insert-draft`, `wk-notify` previously hardcoded `client_id` to the `workenvo` row no
  matter what — fixed: all four now resolve `client_id` from an explicit `client_slug` field in
  the request body, defaulting to `"workenvo"` when absent (backward compatible, live-verified:
  identical behavior with no `client_slug`). An unrecognized `client_slug` fails loudly (500)
  rather than silently defaulting to Workenvo — deliberate, matches this codebase's fail-loud
  philosophy. Current versions: `wk-check-contacted` v4, `wk-find-email` v8, `wk-insert-draft`
  v7, `wk-notify` v4.
- **Apollo key is per-client.** `wk-find-email` maps `client_slug` → secret name via a small
  lookup (`workenvo` → `APOLLO_API_KEY`, `thehrcompany` → `APOLLO_API_KEY_THEHRCOMPANY`), fails
  loudly if the mapped secret is missing or the slug is unrecognized — never silently reuses
  another client's key/credits. `APOLLO_API_KEY_THEHRCOMPANY` is set (Bianca's own Apollo
  account) and live-verified (a real lookup returned a clean no-match, not an auth error,
  confirming the key is valid).
- **Unrelated pre-existing bug found and fixed along the way**: the `run_requests_insert` RLS
  policy's `WITH CHECK` compared a row to itself (`existing.client_id = existing.client_id`,
  always true) instead of correlating to the new row's own `client_id`. Combined with a
  long-stuck `run_requests` row from 2026-07-09 (`status='running'` forever), this had silently
  blocked every anon-key insert into `run_requests` — i.e. every dashboard "Run outreach" click
  — since whenever that policy was introduced. The daily cron was unaffected (it inserts via the
  service-role key, which bypasses RLS). Fixed: corrected policy to properly scope per
  `client_id`; stale row marked `status='failed'`. Live-verified with a real anon-key insert
  that produced a real completed Workenvo run.

## Skill files — done

Location: **`The HR Company/`** at repo root (`icp.md`, `product.md`, `voice.md`, `SKILL.md`) —
deliberately separate from `backend/`, which holds Workenvo's files directly, for per-client
bookkeeping. Source material: `~/Downloads/The HR Company ICP Defined Jul 26.docx` (Bianca's
ICP doc). Sender persona throughout: **Bianca**.

- **`icp.md`**: primary ICP is Ireland-only, 10–100 employees, 5+ years trading, priority
  industries construction/healthcare/GP practices/aesthetic & physio clinics/logistics &
  transport/manufacturing/hospitality/independent retailers. Secondary ICP: newly incorporated
  Irish companies, especially US relocations, since **January 2026**. "Hook material" points
  only at *publicly visible* correlates (HR/admin job postings, new sites, funding-driven hiring,
  actual public WRC case records, CRO incorporation dates) — deliberately not the private trigger
  moments themselves (a bad disciplinary, a specific WRC case naming them), since those aren't
  searchable and referencing one would read as surveillance, not research.
- **`product.md`**: one-line pitch is "outsourced HR department, not a document portal." Trust
  line (their equivalent of Workenvo's privacy line) defuses "I'll pay for a portal of templates
  and still be alone when something happens." Pricing/packaging and client-logo social proof are
  **explicitly marked unknown** — not invented — pending real input from Bianca.
- **`voice.md`**: same four-move structure as Workenvo's (hook / what-we-do in two sentences /
  trust line / one ask), same hard rules (no em dashes, VERIFIED-facts-only, banned AI-tell
  phrases). Deliberately dropped Workenvo's rigid subject-line formula (the 2–4-word rule and
  the "wrasslin" example) per explicit feedback that it was the one weak part of the original —
  replaced with simpler "something true and specific, don't force it" guidance.
- **`SKILL.md`**: same phase structure as Workenvo's (discovery → dedup → verify email → deep
  research via a delegated subagent → draft intro + follow-up → write to Supabase → report run).
  Delegation language rewritten tool-agnostic ("spawn a dedicated subagent") instead of naming
  Claude Code's `Task` tool. Every Edge Function call body already includes
  `"client_slug":"thehrcompany"`. Internal status note in the file itself confirms both Edge
  Function fixes are done and live-verified, and that `config.paused=true` is the one remaining
  deliberate gate.

## Outlook / Microsoft 365 sending — researched, not built, not blocking drafting

Two possible architectures, not yet chosen:

- **Path A — delegated permission, Bianca consents personally.** Confirmed directly from
  Microsoft's own permissions reference: `Mail.Send` and `Mail.Read` (Delegated) do **not**
  require admin consent — Bianca can grant them herself with no IT/admin involvement (unless her
  org has a blanket policy blocking all external app consent, which is unverified either way).
  Concrete mechanism: OAuth2 **device code flow** — request a device code, give Bianca a short
  code and `microsoft.com/devicelogin` to visit, she signs in and approves, the backend polls
  and receives an `access_token` + (via the `offline_access` scope) a `refresh_token`. That
  refresh token is stored server-side (Supabase Vault, one row per sender) and auto-refreshed
  forever after with zero further human involvement. Trade-off: tied to her personal identity;
  could go stale if genuinely unused for a very long stretch.
- **Path B — application permission, needs a tenant admin once.** `Mail.Send` (Application)
  does require admin consent, and by default grants send-as-**any** mailbox in the org. Scoping
  it down to just Bianca's mailbox requires **RBAC for Applications** (the current Microsoft-
  recommended method — the older `New-ApplicationAccessPolicy` is explicitly marked legacy/being
  deprecated), which needs an Exchange Administrator role. More upfront setup cost, but adding
  senders #2+ later is then free (just add them to a security group).
- **Recommendation**: try Path A first, since only Bianca's single mailbox needs to send today
  and Shivansh currently has no admin access at The HR Company (prefers not to ask unless
  necessary).
- **Scaling is already safe either way.** `config.sender_options` (a plain list of
  `{name, email}` per client) and `email_messages.send_from` (a per-email override column)
  already generically support multiple senders per client — proven today by Workenvo's own
  2-sender setup. Path A means each additional sender does their own one-time consent (linear
  cost, no rework); Path B means additional senders are free to add. Either way, nothing about
  today's schema work is wasted. Whenever this gets built, store credentials as one row per
  sender (`client_id`, `sender_email`, `refresh_token`) from the start rather than a single
  named secret — cheap regardless of headcount, and avoids a rework the moment sender #2 shows
  up.
- Whichever path is chosen, the actual send Edge Function should mirror `wk-send-email`'s exact
  architecture (Postgres trigger on `email_messages` → `pg_net` → new function → Microsoft
  Graph `sendMail`) — confirmed from `wk-send-email`'s real deployed source that sending is
  100% Supabase + provider API, zero AI/VM involvement, so the same pattern carries over cleanly.

## What's left (in dependency order)

1. ~~Create a dedicated Gemini API key, authenticate `agy` on the VM~~ **DONE, 2026-07-22** —
   `agy` (v1.1.5) is installed and authenticated directly on `outreach-leadgen` (confirmed via a
   clean, working `hi` prompt with no errors). Two things worth knowing about how this actually
   landed, not just that it "worked":
   - **Auth landed on `info@envo.club (Antigravity Business)` via Google OAuth, not the
     dedicated AI-Studio API key + Leadgen GCP project billing that was carefully de-risked**
     (spend cap set, credit-coverage verified via real `Cost − Savings = €0.00` evidence on the
     Leadgen billing account). "Antigravity Business" is a Workspace/org-level plan tied to the
     `envo.club` domain — its actual billing/usage terms are **unverified**, a genuinely
     different mechanism than everything checked earlier in this doc. Don't assume it's covered
     by the same credit just because the AI-Studio path was confirmed safe.
   - **The OS user is `info`, and this is confirmed to match everything else** — verified
     `workenvo-scheduler`'s systemd unit is also `User=info` (`systemctl show workenvo-scheduler
     -p User`), and GCP's console SSH button consistently logs in as `info` every time (tied to
     OS Login, not a one-off). No mismatch risk: `thehrcompany-scheduler` (item 5 below) just
     needs `User=info`, identical to `workenvo-scheduler`'s existing unit, and it inherits the
     already-authenticated Antigravity credential automatically.
   - Getting here took three real dead ends worth remembering if this ever needs redoing: (a)
     the "Use a Google Cloud project" login option hit a genuine CLI bug (`Code Challenge must
     be base64 encoded`, a malformed PKCE parameter — retrying the flow from scratch worked
     around it once, cause not confirmed); (b) that same option, when it did get further, routed
     through Vertex AI (`aiplatform.googleapis.com`, a separate product from the AI Studio
     Gemini API billing that was actually verified) requiring the Agent Platform API to be
     enabled with its own unverified-at-the-time billing profile (later found to also net to
     €0.00 against the same credits — but that was discovered, not assumed); (c) no plain
     "paste an API key" text prompt ever actually appeared in this CLI version's login menu,
     despite that being the original plan — only OAuth or GCP-project options.
   - Still worth doing at some point, not blocking: confirm persistence with a second, separate
     SSH session (same verification method used on the Mac) rather than trusting one working
     prompt alone.
2. ~~Branch `runOnce.js`~~ **DONE, 2026-07-22** — `runOnce.js` now branches per `client_slug`:
   `thehrcompany` spawns `agy -p "<literal instruction to read SKILL.md and draft N
   prospects>" --dangerously-skip-permissions` (no slash command, no `--output-format` flag),
   everything else keeps the original `claude -p "/start-outreach-workenvo N" ...` spawn. Also
   fixed a real bug this change would otherwise have introduced: each client now gets its own
   `workspace/<slug>` directory (`workspaceDirFor()`), since workenvo and thehrcompany run as
   separate systemd services that can legitimately overlap in time — sharing one workspace dir
   would have meant two concurrently-running agents clobbering each other's skill files/cwd.
3. ~~Parameterize `downloadSkillFiles.js`~~ **DONE, 2026-07-22** — `CLIENT_SKILL_CONFIG` now maps
   `client_slug` → bucket + file placement; `thehrcompany` pulls from `thehrcompany-skill` with
   a flat layout (`SKILL.md` → `SKILL.md`, no `.claude/commands/`), `workenvo` unchanged. Fails
   loudly on an unrecognized slug.
4. ~~Build a plain-text logger for `agy`'s output~~ **DONE, 2026-07-22** — `streamLogger.js` now
   exports `attachPlainLogger`, a straight passthrough of `agy`'s unstructured stdout/stderr;
   `runOnce.js` picks it vs. the existing NDJSON `attachLiveLogger` based on client.
5. **Create a second systemd service** (`thehrcompany-scheduler`) — code side done, VM side not.
   Superseded an earlier design (a `CRON_SCHEDULE` env var of fixed `{time, count}` firings) once
   Shivansh clarified he didn't want fixed schedule/quota values baked into `.env` requiring a
   redeploy to change either one. Current design: `scheduler.js` polls every 30s and checks
   `config.daily_run_time` (e.g. `"20:00"`) and `config.daily_quota` fresh from Supabase each
   tick — both changeable with a plain `UPDATE`, no `.env` edit, no redeploy, ever.
   `config.daily_run_time` is unset for Workenvo, which keeps its original hardcoded `07:00`
   default; it's set to `"20:00"` for `thehrcompany` (seeded 2026-07-22, matches what Shivansh
   asked for — change it anytime with `update config set value='"21:30"' where client_id=...
   and key='daily_run_time'`). `runBatch()` already chunks whatever quota comes back into groups
   of 3 regardless of the total (10 → 3+3+3+1, 20 → 3+3+3+3+3+3+2) — that part never needed to
   change. "Already fired today" is checked against `run_requests` in the DB, not an in-memory
   flag, so a mid-day service restart can't cause a double-fire or a missed day (also more
   robust than the old cron-library approach: if the process happens to be down exactly at the
   trigger time, it fires as soon as it's back up, rather than silently missing that day
   entirely). Full systemd unit + `.env` template in `backend/DEPLOY.md` ("Second client:
   thehrcompany-scheduler"). Still needs Shivansh to actually run it on the VM: create
   `thehrcompany.env` (now much shorter — no schedule of any kind in it), create and start the
   systemd unit (no SSH/gcloud access from the assistant's environment). `agy`'s one-time
   interactive auth as the `info` OS user is already done (see item 1).
   - **Two real bugs caught in review and fixed, 2026-07-22**: (a) `runOnce.js` hardcoded
     `runs.status = 'blocked_claude'` on any agent failure regardless of which agent actually
     ran — an `agy` failure would've shown a misleading Claude-specific status in the dashboard;
     split into `blocked_claude` (Claude Code) vs `blocked_agent` (everything else), and updated
     `runBatch`'s retry check to catch both — missing that second part would have silently
     treated a failed `agy` run as if it had completed, since it would've fallen through every
     other status check. (b) a status note in `SKILL.md` claiming `agy`'s VM auth was "not yet
     built" was stale — it had already been verified working earlier the same day.
6. **Flip `config.paused` to `false`** for `thehrcompany` — the final gate, once everything
   above is built and someone is ready to watch the first real unattended run complete.
7. **Frontend**: replace the 100%-mock `thehrcompany`/`thehrcompany` login with real Supabase
   data scoped to the `thehrcompany` `client_id` — a new `lib/*Data.ts` module mirroring
   `lib/workenvoData.ts`'s exact shape, wired into the existing account-switch pattern in
   `lib/auth.ts`. Same hardcoded email+password login pattern as the other two accounts. Not
   started.
8. **Outlook/Microsoft 365 sending** — see architecture section above. Blocked on: Shivansh
   deciding Path A vs. B (leaning Path A), then actually running the consent flow with Bianca.
   Not urgent — does not block lead accumulation at all.
9. **VM resource check** — low priority, not a real blocker (the run-in-progress mutual
   exclusion in `runOnce.js` is already scoped per `client_id`, so the two clients' runs
   literally cannot collide at the DB level even if they overlap). Worth grabbing real
   `free -h`/`ps aux` numbers once both schedulers have actually run side by side at least once.

## Reference

- Client skill files (source of truth): `The HR Company/SKILL.md`, `icp.md`, `voice.md`,
  `product.md` (repo root). Workenvo's equivalents for comparison: `backend/SKILL.md`, `icp.md`,
  `voice.md`, `product.md`.
- Original ICP source document: `~/Downloads/The HR Company ICP Defined Jul 26.docx`.
- Supabase project: `nxseeggqmfhpnxjlnmaz`. Client row resolvable via
  `select id from clients where slug='thehrcompany'`.
- Storage bucket: `thehrcompany-skill` (private).
- GCP: VM `outreach-leadgen`, project `Leadgen`, region `europe-west2`, `e2-small`.
- Antigravity CLI location (local Mac, for reference/testing): `/Users/shivansh/.local/bin/agy`.

## Explicitly ruled out (don't reintroduce)

- A second Supabase project, under any circumstance.
- A generic N-tenant plugin/abstraction framework — simple per-client branches only, since only
  Workenvo and The HR Company exist or are planned.
- Inventing pricing, packaging, or client-logo social proof for The HR Company in any skill file
  — mark unknown and leave out rather than fabricate.
