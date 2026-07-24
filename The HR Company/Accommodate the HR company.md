# Accommodating The HR Company — full context

**Final status, 2026-07-22: production-ready, live-verified end to end.** Discovery, research,
drafting, the real dashboard, and phone reveal have all produced genuine results against
production data, using this client's own credentials throughout — nothing borrowed from
Workenvo anywhere this was checked. Only Outlook access and a low-priority VM resource check
remain, neither blocking lead accumulation. See "What's left" for the exhaustive detail.

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
- `config` rows for that client: `daily_quota=10`, `auto_send=false`, and **`daily_run_time`**
  (`"20:00"`, Europe/Dublin — see scheduler section below). `paused` was flipped to `false`
  once the full pipeline was built and verified end-to-end — see "What's left."
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
- **Apollo key is per-client, for every function that touches Apollo.** `wk-find-email` maps
  `client_slug` → secret name via a small lookup (`workenvo` → `APOLLO_API_KEY`, `thehrcompany`
  → `APOLLO_API_KEY_THEHRCOMPANY`), fails loudly if the mapped secret is missing or the slug is
  unrecognized. `APOLLO_API_KEY_THEHRCOMPANY` is set (Bianca's own Apollo account, on a paid
  plan) and live-verified twice: a clean no-match lookup (no auth error) via `wk-find-email`,
  and a **real, successfully-revealed phone number** via `wk-reveal-phone` (fixed the same day
  for the identical gap — was hardcoded to `APOLLO_API_KEY`, meaning phone reveals on HR Company
  contacts were silently spending Workenvo's credits until this fix). `wk-reveal-phone`'s fix is
  actually more robust than `wk-find-email`'s: instead of trusting a `client_slug` parameter,
  it resolves the contact's own `client_id` → `clients.slug` directly, so it can't be spoofed or
  drift out of sync with the data. Every other Edge Function was audited for the same class of
  gap: `wk-send-custom-reply` was already correctly scoped (resolves `client_id` from the
  message row itself); `wk-phone-webhook`/`wk-debug-thread` don't need client routing (no Apollo
  key on that side). One separate, unrelated gap found and logged, not fixed (not urgent):
  `wk-poll-replies` (Gmail reply detection) is still Workenvo-only — dormant for The HR Company
  until Outlook sending exists, but will need the same treatment once it does.
  **The full async reveal flow (`wk-reveal-phone` → Apollo → webhook → `wk-phone-webhook` →
  `contacts` → polling UI) is now confirmed working end-to-end for the first time ever** — this
  was previously unverified even for Workenvo (see `CLAUDE.md`'s CRM section). Resolved much
  faster than Apollo's own documented "typically several minutes" on this occasion — treat that
  as one fast anecdotal data point, not a new guaranteed latency.
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
  `"client_slug":"thehrcompany"`. A status/changelog note was added to the top of this file
  during the build, then deliberately removed — it gets re-read (and billed as input tokens) on
  every real run for information the agent can't act on. That kind of history lives here and in
  `CLAUDE.md` instead; `SKILL.md` itself stays pure task instructions, same shape as Workenvo's.

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

## What's left

**The entire pipeline is built, deployed, and live — this section is now just the genuinely
open items, not a build checklist.**

Everything that used to be here (Gemini API key + `agy` VM auth, `runOnce.js`'s per-client
branch + per-client `workspace/<slug>` dirs, `downloadSkillFiles.js` parameterization,
`streamLogger.js`'s plain logger, the config-driven scheduler replacing an earlier
`CRON_SCHEDULE`-in-`.env` idea, the `thehrcompany-scheduler` systemd service, flipping
`config.paused` to `false`, and the frontend) is done and live-verified — see `CLAUDE.md`'s
"Second client onboarding" section for the full detail on each, including the real bugs found
and fixed along the way (the `agy` PATH/`ENOENT` issue, the spawn-error-leaves-`runs`-stuck bug,
the `blocked_claude`/`blocked_agent` split, the `--print-timeout` default cutting runs off at 5
minutes, the interrupted-run-counted-as-done bug, and the `wk-send-email` `send_provider`
guard). Frontend specifics: `lib/thehrcompanyData.ts` mirrors `lib/workenvoData.ts`
function-for-function against the real `client_id`; `lib/auth.ts`'s `Account` type no longer has
a `"mock"` value at all, since both accounts are real now; `RunTrigger.tsx`/`AutoSendToggle.tsx`
needed zero changes, already fully account-agnostic. Verified live in browser: Command Center,
Outreach Feed + detail, Funnel board, all showing real drafted leads. `lib/mockData.ts` is now
unused but was left in place rather than deleted.

Still genuinely open:

1. **Outlook/Microsoft 365 sending** — see architecture section above. Blocked on: Shivansh
   deciding Path A vs. B (leaning Path A), then actually running the consent flow with Bianca.
   Not urgent — does not block lead accumulation at all, and `wk-send-email` now explicitly
   refuses to attempt a send for any client whose `send_provider` isn't `"gmail"`, so there's no
   accidental-send risk in the meantime either.
2. **VM resource check** — low priority, not a real blocker (the run-in-progress mutual
   exclusion in `runOnce.js` is already scoped per `client_id`, so the two clients' runs
   literally cannot collide at the DB level even if they overlap). Worth grabbing real
   `free -h`/`ps aux` numbers now that both schedulers have actually run side by side.

~~Watch the first real triggered run through to completion~~ **DONE** — after the
`--print-timeout`/interrupted-run bug fixes, real runs are completing correctly: 5 real,
correctly-attributed prospects confirmed live in the dashboard (Michael Dixon, Tim Murphy, John
Wallace, Ray Cole, Fergal Meagher), matching quality seen in the earlier capability test.

## Reference

- Client skill files (source of truth): `The HR Company/SKILL.md`, `icp.md`, `voice.md`,
  `product.md` (repo root). Workenvo's equivalents for comparison: `backend/SKILL.md`, `icp.md`,
  `voice.md`, `product.md`.
- Original ICP source document: `~/Downloads/The HR Company ICP Defined Jul 26.docx`.
- Supabase project: `nxseeggqmfhpnxjlnmaz`. Client row resolvable via
  `select id from clients where slug='thehrcompany'`.
- Storage bucket: `thehrcompany-skill` (private).
- GCP: VM `outreach-leadgen`, project `Leadgen`, region `europe-west2`, `e2-small`.
- Antigravity CLI location: `/Users/shivansh/.local/bin/agy` (local Mac, for reference/testing),
  `/home/info/.local/bin/agy` (the actual VM — confirmed via `which agy`, and this is the exact
  path `runOnce.js` resolves via `os.homedir()` rather than relying on `PATH`).

## Explicitly ruled out (don't reintroduce)

- A second Supabase project, under any circumstance.
- A generic N-tenant plugin/abstraction framework — simple per-client branches only, since only
  Workenvo and The HR Company exist or are planned.
- Inventing pricing, packaging, or client-logo social proof for The HR Company in any skill file
  — mark unknown and leave out rather than fabricate.
