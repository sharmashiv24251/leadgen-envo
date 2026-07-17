"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useLayoutEffect, useRef, useState } from "react";
import Chip from "@/components/Chip";
import type { FollowUp } from "@/lib/data";
import { approveFollowUp, fetchFollowUpStatus, updateFollowUpDraft } from "@/lib/outreachApi";
import { queryKeys } from "@/lib/queryKeys";
import { useAccountMode } from "@/lib/useAccountData";

const TERMINAL_SEND_STATUSES = new Set(["sent", "failed", "bounced"]);
const POLL_INTERVAL_MS = 2000;
const POLL_TIMEOUT_MS = 15000;

// Deliberately no sender picker here (unlike the intro's "Send Now") -- a follow-up must
// land in the same Gmail thread as the intro, which means the same mailbox sent it. That's
// not a choice a human makes per-send; wk-send-email resolves it from the thread itself.
export default function FollowUpCard({
  contactId,
  followUp,
}: {
  contactId: string;
  followUp: FollowUp;
}) {
  const queryClient = useQueryClient();
  const account = useAccountMode();
  const keys = queryKeys.forAccount(account);

  const [isEditing, setIsEditing] = useState(false);
  const [subject, setSubject] = useState(followUp.subject);
  const [body, setBody] = useState(followUp.body);
  const [sendError, setSendError] = useState<string | null>(null);
  const [tracking, setTracking] = useState(false);
  const sendStartedAtRef = useRef(0);

  useLayoutEffect(() => {
    setSubject(followUp.subject);
    setBody(followUp.body);
    setIsEditing(false);
    setSendError(null);
    setTracking(false);
  }, [contactId, followUp.subject, followUp.body]);

  const statusQuery = useQuery({
    queryKey: keys.followUpStatus(contactId),
    queryFn: () => fetchFollowUpStatus(contactId),
    enabled: tracking,
    refetchInterval: POLL_INTERVAL_MS,
  });

  useEffect(() => {
    if (!tracking) return;
    const currentStatus = statusQuery.data;
    const isTerminal = !!currentStatus && TERMINAL_SEND_STATUSES.has(currentStatus);
    const timedOut = Date.now() - sendStartedAtRef.current > POLL_TIMEOUT_MS;
    if (!isTerminal && !timedOut) return;

    setTracking(false);
    if (currentStatus === "failed") {
      setSendError("Send failed — check the notifications panel for details, then try again.");
    }
    queryClient.invalidateQueries({ queryKey: keys.data() });
  }, [statusQuery.data, tracking, queryClient, keys]);

  const approveMutation = useMutation<void, Error, void>({
    mutationFn: () => approveFollowUp(contactId),
    onSuccess: () => {
      setSendError(null);
      queryClient.invalidateQueries({ queryKey: keys.data() });
      queryClient.removeQueries({ queryKey: keys.followUpStatus(contactId) });
      sendStartedAtRef.current = Date.now();
      setTracking(true);
    },
    onError: (err) => setSendError(err.message || "Failed to send."),
  });

  const saveMutation = useMutation<void, Error, void>({
    mutationFn: () => updateFollowUpDraft(contactId, { subject, body }),
    onSuccess: () => {
      setIsEditing(false);
      queryClient.invalidateQueries({ queryKey: keys.data() });
    },
  });

  const sending = approveMutation.isPending || tracking;
  const saving = saveMutation.isPending;

  function handleCancel() {
    setSubject(followUp.subject);
    setBody(followUp.body);
    saveMutation.reset();
    setIsEditing(false);
  }

  // Once it's left draft (approved/sending/sent/failed) it belongs in the thread history,
  // not this card -- same "draft only" boundary EmailDetail already uses for the intro.
  if (followUp.status !== "draft") return null;

  return (
    <div className="rounded-2xl border border-border bg-surface p-5 shadow-[var(--shadow-panel-sm)]">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <h2 className="text-sm font-medium text-ink">Follow-up draft</h2>
          <Chip tone="neutral">Ready whenever</Chip>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          {!isEditing && (
            <button
              type="button"
              onClick={() => setIsEditing(true)}
              className="rounded-full border border-border bg-surface-raised px-4 py-2 text-xs font-medium text-ink-muted transition-colors hover:text-ink active:scale-[0.97]"
            >
              Edit
            </button>
          )}
          {isEditing && (
            <>
              <button
                type="button"
                onClick={handleCancel}
                disabled={saving}
                className="rounded-full border border-border bg-surface-raised px-4 py-2 text-xs font-medium text-ink-muted transition-colors hover:text-ink disabled:opacity-50 active:scale-[0.97]"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => saveMutation.mutate()}
                disabled={saving}
                className="rounded-full bg-accent-strong px-4 py-2 text-xs font-medium text-accent-ink transition-opacity hover:opacity-90 disabled:opacity-50 active:scale-[0.97]"
              >
                {saving ? "Saving…" : "Save"}
              </button>
            </>
          )}
          <button
            type="button"
            onClick={() => approveMutation.mutate()}
            disabled={isEditing || sending}
            className="rounded-full bg-accent-strong px-4 py-2 text-xs font-medium text-accent-ink transition-opacity hover:opacity-90 disabled:opacity-50 active:scale-[0.97]"
          >
            {sending ? "Sending…" : "Send follow-up"}
          </button>
        </div>
      </div>

      {sendError && (
        <p className="mb-4 rounded-lg border border-danger/30 bg-danger-dim px-3 py-2 text-xs text-danger">
          {sendError}
        </p>
      )}

      <div className="mb-4">
        <span className="mb-1.5 block text-xs font-medium text-ink-muted">Subject</span>
        {isEditing ? (
          <input
            type="text"
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            className="w-full rounded-lg border border-accent/40 bg-bg px-3 py-2 text-sm text-ink outline-none focus:border-accent"
          />
        ) : (
          <div className="select-text rounded-lg border border-border bg-bg px-3 py-2 text-sm text-ink">
            {subject}
          </div>
        )}
      </div>

      <div>
        <span className="mb-1.5 block text-xs font-medium text-ink-muted">Body</span>
        {isEditing ? (
          <textarea
            value={body}
            onChange={(e) => setBody(e.target.value)}
            rows={8}
            className="w-full max-w-[70ch] resize-y rounded-lg border border-accent/40 bg-bg px-3 py-2 text-sm leading-relaxed text-ink outline-none focus:border-accent"
          />
        ) : (
          <p className="select-text max-w-[70ch] whitespace-pre-wrap text-sm leading-relaxed text-ink">
            {body}
          </p>
        )}
      </div>
    </div>
  );
}
