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
  no code change needed to adjust), `contacts`, `emails`, `runs`, `notifications`,
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
  picks it up within 30s. Status shown live (queued/running).
- `TopBar.tsx` has the sign-out button and shows the active account's brand name.

## Not built yet / explicitly deferred
- Phase 2 (Gmail sending, reply/bounce detection) — not started. Everything today is
  draft-only (`auto_send=false`). `bounced` status exists in the schema but nothing sets it.
- CI/CD is manual by choice (redeploy = SSH + `git pull` + restart, not on every push).
- No alerting if the scheduler process goes down and stays down.
