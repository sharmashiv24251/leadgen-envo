# Internal tool → SaaS: roadmap

Not in `backend/devinstruction.md` because it isn't build-log history — it's forward-looking
scope. This is everything discussed on 2026-07-17 for turning Workenvo's outreach tool into a
sellable CRM (the HR company demo feedback + funnel/thread requests). Update this file's status
as each phase ships; move genuinely historical detail into `devinstruction.md` once built, the
same way Phase 2 was documented there.

---

## Phase 1 — Threads, replies, follow-ups

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

**Follow-up email — DONE and verified live (2026-07-17).** No `auto_follow_up` flag, no
`follow_up_wait_days`, no scheduled eligibility job, no "due for follow-up" reminder/notification.
The follow-up draft is written **at the same time as the intro**, by the same agent invocation —
`wk-insert-draft` accepts an optional `follow_up: {body}` in its payload (subject is deliberately
NOT agent-supplied; the row always reuses the intro's own subject server-side, since Gmail's
thread-matching requires an exact match and that's not something to leave to prompt-following).
`SKILL.md` updated (`Phase 4b`) to draft the follow-up body in the same pass, no extra Claude Code
run, no marginal cost.

**Custom reply send — NOT STARTED.** Still the one open item in Phase 1: no backend endpoint, no
compose-box UI. Replying to what a prospect actually wrote (as opposed to the pre-drafted
follow-up) isn't possible from the dashboard yet.

Frontend: `Prospect.followUp`, a new `FollowUpCard` component (edit/save/send, no sender picker —
thread-locked, not a per-send choice), wired into `EmailDetail.tsx`. `fetchWorkenvoData` hides
`followUp` entirely once a reply exists — a follow-up is moot once someone's responded, so this is
a single conditional in the data layer rather than duplicated UI logic. It just sits there,
editable, until a human sends it — no day-gating, no banner.

Not yet done: a live end-to-end test (disposable contact, real inbox) to actually watch an intro +
follow-up land threaded correctly, rather than trust code review alone.

**Custom reply send.** For anything outside the intro/follow-up drafts — e.g. replying to what a
prospect actually wrote back, or sending an ad-hoc note into an existing thread. A free-text
compose box in the dashboard thread view, human-authored, calling the exact same send-into-thread
primitive as the follow-up send (correct `In-Reply-To`/`References`/`threadId`, same thread, never
a new one). This is the same primitive with a human typing the body instead of a stored draft.

Same persistence as everything else in the thread: the primitive writes a row into
`email_messages` (`type='custom'`, `direction='outbound'`) as part of sending it, no different from
how intro/follow-up/inbound-reply rows get saved. Without this the thread view would go stale the
moment a human sends something outside the pre-drafted flow — the whole point of the thread model
is that it's the complete record, not just what the agent drafted.

And yes, it shows up in the UI — the thread view is just rendering whatever's in `email_messages`
for that contact, in order. A custom send is a row in that same table like everything else, so it
appears in the thread the moment it's sent with no separate display logic needed for it.

---

## Phase 2 — CRM frontend

**Funnel / Kanban dashboard.** Stages: Leads → Intro sent → Follow-up sent → Meeting booked →
Contract, plus a Deal Lost bucket with reasons (no response / no interest / not a match). Most
stages derive automatically from message data (Phase 1); "meeting booked," "contract," and lost
reasons are human judgment calls — a dropdown a rep sets, not something inferred. New `stage` and
`lost_reason` columns; Kanban UI is a self-contained frontend build, no backend novelty.

**Prospect detail page.** Company card (size, role, etc.), notes, call-comments, funnel stage, full
thread view, and **real** Apollo phone reveal. Note: phone reveal today is just a static `tel:`
link in `EmailDetail.tsx` — there's no Apollo call behind it yet, this is a genuine (small,
isolated) build, not a wire-up.

**Notes — general, freeform.** A small `contact_notes` table (contact_id, author, text,
created_at) — a log, not a single overwritable field, since reps will want a running history.
Rendered as an array of small cards on the prospect page, newest first. This is *anything* the
operator wants to jot down about a person — not limited to call summaries — plain natural
language, no structure enforced ("this person is bullshit" is a perfectly valid note). Call
comments are just notes with nothing special about them, same table, no separate mechanism needed.
Pure bookkeeping, written after the fact — nothing here loops back into the agent.

**Companies / Contacts / Funnel navigation split.** Promotes `company`/`company_domain` (currently
free text on each contact, no dedup) into a real `companies` table. Touches a lot of read paths —
do this once the funnel/thread data shape has settled, not before.

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
