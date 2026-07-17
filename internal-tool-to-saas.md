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

Also while in there: `wk-insert-draft` now accepts an optional `follow_up: {subject, body}` in its
payload and writes it as a second `type='follow_up'` row, always `status='draft'` regardless of
`auto_send` — write path is ready, `SKILL.md` doesn't send this yet (separate step). `wk-send-email`
now propagates a sent message's `gmail_thread_id` onto any sibling row still missing one (e.g. a
follow-up drafted alongside an intro that hadn't been sent yet at draft time) — this is what makes
"reply goes in the same thread" actually true once follow-up sending is wired up. Also fixed a real
bug found in the process: the `wk_notify_email_approved()` trigger's failure path had the old table
name hardcoded in an `UPDATE` — would have broken silently post-rename the next time `agent_token`
went missing from Vault.

Frontend (`lib/workenvoData.ts`) updated to match: reads now filter `type='intro'` (so the feed
still shows exactly one row per contact until thread-view UI exists), and — this was a real bug
caught during the edit, not hypothetical — `updateEmailDraft`/`approveEmail`/`fetchEmailStatus` all
now additionally filter `type='intro'`. Without that, once a `follow_up` row exists for a contact,
an unscoped update-by-`contact_id` would touch both rows at once (e.g. editing the intro would
silently overwrite the follow-up's text too, and approving the intro would accidentally flip the
follow-up to `approved` as well, triggering an unwanted second send).

**Reply detection.** `gmail.readonly` scope added to the existing domain-wide delegation on
2026-07-17 (Client ID `102461381722782053803`, alongside `gmail.send`) — that blocker is
cleared, no new key or redeploy needed. Mechanism: `history.list`
per mailbox (`saransh@envo.club`, `info@envo.club`), one API call per mailbox per poll regardless
of how many threads are outstanding — cost doesn't scale with email volume. Poll every 2-5 min via
a scheduled Edge Function, same shape as the existing `wk-send-email` trigger. All 7 emails sent
so far already have `gmail_thread_id` saved, so they're trackable immediately — needs a one-time
backfill check (`threads.get` on those 7) since `history.list` only sees forward from a cursor,
not backward.

**Send-into-thread primitive.** One function, correct `In-Reply-To`/`References`/`threadId`
headers, that both the follow-up job and manual dashboard replies call — not two separate send
paths.

**Follow-up email — simplified 2026-07-17, complexity dialed down.** No `auto_follow_up` flag, no
`follow_up_wait_days`, no scheduled eligibility job, no "due for follow-up" reminder/notification
anywhere. Instead: the follow-up draft is written **at the same time as the intro**, by the same
agent invocation that's already researching and drafting it (small addition to `SKILL.md`'s Phase
4/5 — draft both, `wk-insert-draft` inserts both as two rows against the same contact/thread, intro
as `type='intro'`, follow-up as `type='follow_up'`, both `status='draft'`). No extra Claude Code
run, no marginal cost — it already has full context in that pass.

It just sits there, editable, until the human decides to send it — no day-gating, no banner. UI
rule is a single conditional: if a reply has come in, don't show the follow-up (it's moot); if not,
it's there whenever the human wants it, same review/edit/send flow as the intro draft already has.

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
