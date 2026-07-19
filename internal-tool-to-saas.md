# Internal tool → SaaS: roadmap

Not in `backend/devinstruction.md` because it isn't build-log history — it's forward-looking
scope. This is everything discussed on 2026-07-17 for turning Workenvo's outreach tool into a
sellable CRM (the HR company demo feedback + funnel/thread requests). Update this file's status
as each phase ships; move genuinely historical detail into `devinstruction.md` once built, the
same way Phase 2 was documented there.

**Numbering note:** this file's Phase 1/2/3 are this roadmap's own track. `devinstruction.md` has
its own independent Phase 0/1/2/3 (compute/infra build phases) that now also reaches "Phase 3" —
its Phase 3 (CRM: Funnel/Notes/feed, 2026-07-19) is unrelated to this file's Phase 3 (Microsoft
Exchange) below. Don't assume matching numbers mean matching content across the two files.

---

## Phase 1 — Threads, replies, follow-ups — COMPLETE (2026-07-18)

All four original items done and verified live against real data, not just code review. Detail
below; skip to Phase 2 unless you need the history.

**User-QA'd, not just self-tested (2026-07-18).** Found and fixed one real bug this way that
none of my own curl/SQL-based testing could have caught: `wk-send-custom-reply` had no CORS
headers, so browser calls failed while direct curl calls to the same endpoint succeeded — CORS is
browser-enforced only, invisible to curl. Fixed (standard `Access-Control-Allow-*` headers +
explicit `OPTIONS` handling), then Shivansh personally exercised custom replies across multiple
real email accounts and confirmed threading holds up end to end. This is the strongest signal
Phase 1 has had — real usage, not a synthetic check.

**Thread/message data model — DONE (2026-07-17).** `emails` renamed to `email_messages` in place
(simpler than a parallel child table — one table to keep in sync, not two). Dropped
`emails_one_per_contact`; added `type` (`intro`/`follow_up`/`reply`/`custom`) and `direction`
(`outbound`/`inbound`), each constrained, plus partial unique indexes so a contact can have at
most one `intro` and one `follow_up` row but unlimited `reply`/`custom` rows. Dropped
`reply_body`/`replied_at` (a reply is now its own inbound row, not a field on the outbound row —
safe to drop outright, zero rows had ever used them). All 20 existing rows backfilled to
`type='intro'`, `direction='outbound'` automatically, verified against the live dashboard query
post-migration.

Also while in there: fixed a real bug found in the process — the `wk_notify_email_approved()`
trigger's failure path had the old table name hardcoded in an `UPDATE`, which would have broken
silently post-rename the next time `agent_token` went missing from Vault.

Frontend (`lib/workenvoData.ts`) updated to match: reads filter `type='intro'` (so the feed shows
exactly one row per contact until a full thread-view UI exists), and — this was a real bug caught
during the edit, not hypothetical — `updateEmailDraft`/`approveEmail`/`fetchEmailStatus` all filter
`type='intro'` too. Without that, once a `follow_up` row exists for a contact, an unscoped
update-by-`contact_id` would touch both rows at once (editing the intro would silently overwrite
the follow-up's text too, and approving the intro would accidentally flip the follow-up to
`approved` as well, triggering an unwanted second send).

**Reply detection — DONE and live (2026-07-17).** `gmail.readonly` scope added to the existing
domain-wide delegation (Client ID `102461381722782053803`, alongside `gmail.send`). Built
`wk-poll-replies` (new Edge Function) + `mailbox_poll_state` (new table, one row per mailbox
holding a `history.list` cursor) + `wk_poll_replies_cron()` + a `pg_cron` job running every 5
minutes. One `history.list` call per mailbox per poll regardless of how many threads are
outstanding — cost doesn't scale with email volume. First run per mailbox does a one-time backfill
(`threads.get` on every existing sent thread) to catch anything that arrived before polling
started, then switches to the cheap delta path. Skips Gmail auto-replies/OOO responses
(`Auto-Submitted`/`X-Autoreply` headers) so they don't get mistaken for a real reply and wrongly
suppress a follow-up. **Fully verified live (2026-07-17, later session):** ran a real disposable
test (contact pointed at an inbox the team controls) through the whole pipeline — real replies
sent, poller manually triggered, all of them correctly written as `type='reply'` rows with full
quoted-body text extracted (not just Gmail's truncated snippet), contact + intro `status` both
flipped to `replied`, and a `notifications` row fired for each with the right title/detail. Not a
theoretical pass — real data, real detection, checked directly in the database.

**Send-into-thread primitive — DONE and verified live (2026-07-17), took two real bugs to get
right.** Turned out `wk-send-email` never actually supported this despite the `gmail_thread_id`
bookkeeping already in place — it never set `References`/`In-Reply-To`/`threadId`, so any second
send would have created a disconnected new thread, not joined the existing one.

First fix attempt: generate our own RFC822 `Message-ID` and store it for the next message in the
thread to reference. **This looked right in every check and was still wrong** — a live test showed
two real replies landing in two separate Gmail conversations instead of one. Root cause: **Gmail's
send API silently ignores/overwrites any client-supplied `Message-ID` and always assigns its own.**
Our stored ID was never the one actually transmitted, so every `In-Reply-To` we set pointed at a
Message-ID that never existed on the wire — invisible to us because our own verification only ever
checked the sending mailbox's internal `threadId` grouping (which Gmail honours regardless of
header correctness), never the actual RFC822 headers a *recipient's* mail client relies on. Real
fix: stop setting a custom Message-ID at all; fetch the real one Gmail assigned via one extra
`messages.get` call right after sending, store that instead. Second bug found while fixing the
first: that extra lookup call was silently failing (403, swallowed) because it reused an access
token scoped only to `gmail.send` — needed `gmail.readonly` too. Both fixed, then verified twice
more live: two more disposable send-pairs, both correctly threaded (`In-Reply-To` matching the
real prior `Message-Id`, confirmed via raw Gmail API response, not just our own database).

Also fixed: sender resolution now falls back to whichever mailbox actually sent the prior message
in the thread, not the global default sender — thread IDs are per-mailbox, so a follow-up sending
from a different mailbox than the intro would silently fail to thread (or worse, error) regardless
of everything else being correct.

**Follow-up email — DONE and verified live, including in real production (2026-07-18).** No
`auto_follow_up` flag, no `follow_up_wait_days`, no scheduled eligibility job, no "due for
follow-up" reminder/notification. The follow-up draft is written **at the same time as the
intro**, by the same agent invocation — `wk-insert-draft` accepts an optional `follow_up: {body}`
in its payload (subject is deliberately NOT agent-supplied; the row always reuses the intro's own
subject server-side, since Gmail's thread-matching requires an exact match and that's not
something to leave to prompt-following). `SKILL.md` updated (`Phase 4b`) to draft the follow-up
body in the same pass, no extra Claude Code run, no marginal cost. The 2026-07-18 07:00 production
run drafted real intro+follow-up pairs for two real prospects (Christian Howell/Techary, Tomas
O'Leary/Origina), subjects matching exactly — confirmed in the database, not just in a test.

**Custom reply send — DONE and verified live (2026-07-18).** New `wk-send-custom-reply` Edge
Function (JWT-gated — this one's called from the browser via `supabase-js`, so `verify_jwt: true`
is correct here, unlike the agent-facing `wk-*` functions which use a bare `x-agent-token` header
instead and need `verify_jwt: false`). Subject and thread id resolved server-side from the
contact's earliest sent message, same reasoning as the follow-up. Inserts as `status='approved'`
and lets the existing send trigger fire `wk-send-email` — no duplicated sending logic at all.
Tested for real against a live thread: sent, correctly threaded.

**Thread view UI — rewritten (2026-07-18), not originally a Phase 1 line item but became
necessary once custom replies existed.** Replaced the old fixed layout (one editable email-draft
box + a single "latest reply" card + a separate floating follow-up card) with `ThreadView`, a
single scrollable timeline rendering every message for a contact in chronological order — intro,
follow-up, replies, custom sends, interleaved exactly as they actually happened. `FollowUpCard`
deleted; its edit/save/send logic generalized into one `DraftMessageCard` keyed by the message's
own row id instead of contact+type, which also retires the whole class of "accidentally touched
the sibling row" bug the old contact+type-scoped functions were exposed to. `Prospect.followUp`/
`Prospect.response` (the old single-reply-only field) removed from the real data path; the mock
account still uses `Prospect.response` to synthesize an equivalent thread, since its data model
never changed.

Also fixed along the way: a follow-up draft now hides itself once the conversation has moved past
it — either the prospect replied, or a custom message already went out. Restores a design decision
made earlier in Phase 1 that had been accidentally dropped during the `ThreadView` rewrite; checked
against real data (no false hides on the 3 real follow-up drafts that exist today, since none of
their threads have moved on yet).

**Known, deliberately deferred, not a gap:** capturing a message sent by replying directly from a
real Gmail client (bypassing the dashboard entirely) isn't built. Two separate reasons stack:
nothing inserts an `email_messages` row for it in the first place, and `wk-poll-replies` explicitly
skips any message *from* our own mailbox (that check exists to avoid mistaking our own sends for
prospect replies, with no way to distinguish "our automated send" from "operator typed this
directly in Gmail"). Discussed and deliberately parked — real future need (most likely once
attachments/rich content force a bypass to raw Gmail), but speculative today. If revisited, a
manual "reconcile this thread" action a human triggers on demand is a much cheaper path than an
always-on background scan of every mailbox's Sent folder.

---

## Phase 2 — CRM frontend — Funnel/Notes/feed DONE (2026-07-19); detail page partial

Three of the four items below shipped and were verified live, not just reviewed as code. Detail
moved to `backend/devinstruction.md` §PHASE 3 per this file's own convention (see the top of this
file); what follows is status plus what changed from the original spec and what's still open.

**Funnel / Kanban dashboard — DONE.** All six stages shipped as specced: Leads → Intro sent →
Follow-up sent → Meeting booked → Contract, plus Deal lost with a reason (no response / no
interest / not a match). Leads/Intro sent/Follow-up sent derive automatically, computed
server-side by a new `prospect_feed` Postgres view rather than client-side JS, so pagination and
filtering both stay correct against it. Meeting booked/Contract/Deal lost are the only
rep-set ones, via `contacts.stage`/`contacts.lost_reason`, exactly as specced. Kanban UI lives at
`/funnel`, drag-and-drop, cards show their stage and click through to the prospect detail page.

**Prospect detail page — partial.** Company card and full thread view were already there before
this work. Funnel stage is now shown too (a view-only chip — still changed via the Kanban board,
not from here). **Notes are done** (see below). **Real Apollo phone reveal — done (2026-07-19),
took two passes.** First pass wrongly assumed Apollo returns a phone number synchronously; real
behavior is that `reveal_phone_number=true` requires a `webhook_url` and the number arrives
minutes later via callback, so every early live click got mis-recorded as `phone_status:
'not_found'` (an API rejection silently read as "person not found") — those bogus rows were reset
in the DB. Fixed version adds a `wk-phone-webhook` function Apollo calls back (auth via
`AGENT_TOKEN` + `contact_id`, both in the callback URL's query string, since Apollo's webhook
payload has nothing that correlates to the original request), a real `pending` state end to end
(DB column → `prospect_feed` view → frontend `Prospect.phoneStatus`), and 5s polling in
`useProspectDetail` while pending. Full detail in `CLAUDE.md`'s CRM section. Still not confirmed
against a contact Apollo actually has phone data for — only the `pending`/`not_found` paths have
been seen live so far.

**Notes — DONE, but the shape changed twice from what's specced above.** The `contact_notes`
table (contact_id, author, text, created_at) shipped as designed. Two things didn't survive
contact with actual use, though: it was originally built as the append-only log described above
(no edit/delete), then widened to full CRUD on request — reps wanted to fix typos and delete
notes, not just append forever. And rather than an inline card on the page, it's a floating
sticky-notes-style widget (round button, bottom-right of the thread view, expands into a panel)
— that placement came from a direct ask, not from this doc's original "array of small cards on
the prospect page" description. The "no structure enforced, call comments are just notes" part of
the original spec held exactly as written — there's no separate call-comment mechanism, and there
never needed to be. One thing this doc didn't anticipate: there's no per-user identity anywhere in
this app (both logins are account-level), so `author` is hardcoded to `"You"` rather than asked
for — a real gap from the original "contact_id, author, text" schema design, worth revisiting if
this ever needs to distinguish which rep wrote a note.

**Companies / Contacts / Funnel navigation split — not started.** Still correctly deferred per
this doc's own advice below ("do this once the funnel/thread data shape has settled") — the funnel
data shape is now settled, so this is unblocked, but nobody's picked it up yet.

**Not originally scoped here, but became necessary partway through this work:** the Outreach
Feed's prospect list went from one unbounded query (every prospect ever drafted, full email body
+ `why_this_angle`, no limit — a real problem at this project's actual 10-20 drafts/day cadence)
to a paginated, 40/page infinite-scroll feed, all filter combinations included. This wasn't in the
original Phase 2 scope above; it came up because the Funnel/Notes work was about to make the
Outreach Feed something people actually use daily, which would have made the existing unbounded
query's scaling problem bite much sooner. Full story, including a real Postgres gotcha (views
default to definer-style permissions, not invoker), in `backend/devinstruction.md` §PHASE 3.4.

---

## Phase 3 — Microsoft Exchange

Deliberately last, after Gmail is fully solid. Scope, per 2026-07-17 discussion: **no per-user
OAuth** — company-level mailbox pool only (an admin adds a mailbox once, reps pick a sender from a
dropdown), mirroring how `sender_options` already works for Gmail. This avoids the
Google/Microsoft app-verification problem entirely (that problem only exists for true self-serve
"any customer connects their own personal inbox," which is explicitly out of scope here).

Mechanically parallel to the Gmail build: Microsoft Graph API, one Azure AD app registration with
admin-consented application permissions (`Mail.Send`, `Mail.ReadWrite`) — a single tenant-admin
console action, same shape as Gmail's domain-wide delegation. Threading via `conversationId` +
Graph's `/reply` endpoint. Realistically a parallel `outlook-send-email` / `outlook-poll-replies`
pair of functions, not a shared abstraction with the Gmail code on day one — different SDK, auth
flow, and message shape. One maintenance difference worth flagging: Graph client-secret credentials
expire (6-24 months, use a certificate to push this out further) and need rotation; Gmail's
service-account key does not.

Not started — no Exchange mailbox has been tried yet, not even a single send. Worth a small,
time-boxed spike before committing to full build, purely to confirm the target Microsoft 365 plan
actually exposes admin-consented Graph permissions the way expected.

---

## Explicitly out of scope (for now)

- Per-user OAuth mailbox connection (any provider) — narrowed to company-level pools per the
  Phase 3 discussion above.
- Fresh agent research on follow-ups — templated only, revisit if template quality proves
  insufficient.
- Call automation — comments/notes on calls only; no dialer, no call recording.
