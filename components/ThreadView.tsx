"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useLayoutEffect, useRef, useState } from "react";
import Chip from "@/components/Chip";
import { useContextMenu } from "@/components/ContextMenu";
import { copySelectionOr } from "@/lib/clipboard";
import type { ThreadMessage } from "@/lib/data";
import {
  approveMessageDraft,
  fetchMessageStatus,
  fetchSenderOptions,
  fetchThreadMessages,
  sendCustomReply,
  updateMessageDraft,
  type SenderOption,
} from "@/lib/outreachApi";
import { queryKeys } from "@/lib/queryKeys";
import { useAccountMode } from "@/lib/useAccountData";

const TERMINAL_SEND_STATUSES = new Set(["sent", "failed", "bounced"]);
const POLL_INTERVAL_MS = 2000;
const POLL_TIMEOUT_MS = 15000;

const TYPE_LABEL: Record<ThreadMessage["type"], string> = {
  intro: "Intro",
  follow_up: "Follow-up",
  reply: "Reply",
  custom: "Reply",
};

function useSendPolling(onSettled: () => void) {
  const [trackingId, setTrackingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const startedAtRef = useRef(0);
  const queryClient = useQueryClient();
  const account = useAccountMode();
  const keys = queryKeys.forAccount(account);

  const statusQuery = useQuery({
    queryKey: trackingId ? keys.messageStatus(trackingId) : keys.messageStatus("none"),
    queryFn: () => fetchMessageStatus(trackingId!),
    enabled: !!trackingId,
    refetchInterval: POLL_INTERVAL_MS,
  });

  useEffect(() => {
    if (!trackingId) return;
    const current = statusQuery.data;
    const isTerminal = !!current && TERMINAL_SEND_STATUSES.has(current);
    const timedOut = Date.now() - startedAtRef.current > POLL_TIMEOUT_MS;
    if (!isTerminal && !timedOut) return;

    setTrackingId(null);
    if (current === "failed") {
      setError("Send failed — check the notifications panel for details, then try again.");
    }
    onSettled();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [statusQuery.data, trackingId]);

  function start(messageId: string) {
    setError(null);
    queryClient.removeQueries({ queryKey: keys.messageStatus(messageId) });
    startedAtRef.current = Date.now();
    setTrackingId(messageId);
  }

  return { sending: !!trackingId, error, setError, start };
}

function DraftMessageCard({
  message,
  senderOptions,
  showSenderPicker,
  onChanged,
}: {
  message: ThreadMessage;
  senderOptions: SenderOption[];
  showSenderPicker: boolean;
  onChanged: () => void;
}) {
  const [isEditing, setIsEditing] = useState(false);
  const [subject, setSubject] = useState(message.subject);
  const [body, setBody] = useState(message.body);
  const [selectedSender, setSelectedSender] = useState(senderOptions[0]?.email ?? "");
  const { sending, error, setError, start } = useSendPolling(onChanged);
  const showContextMenu = useContextMenu();

  useLayoutEffect(() => {
    setSubject(message.subject);
    setBody(message.body);
    setIsEditing(false);
  }, [message.id, message.subject, message.body]);

  const saveMutation = useMutation<void, Error, void>({
    mutationFn: () => updateMessageDraft(message.id, { subject, body }),
    onSuccess: () => {
      setIsEditing(false);
      onChanged();
    },
  });

  const approveMutation = useMutation<void, Error, void>({
    mutationFn: () => approveMessageDraft(message.id, showSenderPicker ? selectedSender || undefined : undefined),
    onSuccess: () => start(message.id),
    onError: (err) => setError(err.message || "Failed to send."),
  });

  const saving = saveMutation.isPending;
  const saveError = saveMutation.error?.message ?? null;

  function handleCancel() {
    setSubject(message.subject);
    setBody(message.body);
    saveMutation.reset();
    setIsEditing(false);
  }

  return (
    <div className="rounded-2xl border border-border bg-surface p-5 shadow-[var(--shadow-panel-sm)]">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <h3 className="text-sm font-medium text-ink">{TYPE_LABEL[message.type]} draft</h3>
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
          {showSenderPicker && senderOptions.length > 0 && (
            <select
              value={selectedSender}
              onChange={(e) => setSelectedSender(e.target.value)}
              disabled={isEditing || sending}
              className="rounded-full border border-border bg-surface-raised px-3 py-2 text-xs text-ink outline-none disabled:opacity-50"
            >
              {senderOptions.map((opt) => (
                <option key={opt.email} value={opt.email}>
                  {opt.name} ({opt.email})
                </option>
              ))}
            </select>
          )}
          <button
            type="button"
            onClick={() => approveMutation.mutate()}
            disabled={isEditing || sending}
            className="rounded-full bg-accent-strong px-4 py-2 text-xs font-medium text-accent-ink transition-opacity hover:opacity-90 disabled:opacity-50 active:scale-[0.97]"
          >
            {sending ? "Sending…" : "Send"}
          </button>
        </div>
      </div>

      {saveError && (
        <p className="mb-4 rounded-lg border border-danger/30 bg-danger-dim px-3 py-2 text-xs text-danger">
          {saveError}
        </p>
      )}
      {error && (
        <p className="mb-4 rounded-lg border border-danger/30 bg-danger-dim px-3 py-2 text-xs text-danger">
          {error}
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
          <div
            className="select-text rounded-lg border border-border bg-bg px-3 py-2 text-sm text-ink"
            onContextMenu={(e) => showContextMenu(e, [{ label: "Copy", onSelect: () => copySelectionOr(subject) }])}
          >
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
            rows={10}
            className="w-full max-w-[70ch] resize-y rounded-lg border border-accent/40 bg-bg px-3 py-2 text-sm leading-relaxed text-ink outline-none focus:border-accent"
          />
        ) : (
          <p
            className="select-text max-w-[70ch] whitespace-pre-wrap text-sm leading-relaxed text-ink"
            onContextMenu={(e) => showContextMenu(e, [{ label: "Copy", onSelect: () => copySelectionOr(body) }])}
          >
            {body}
          </p>
        )}
      </div>
    </div>
  );
}

function settledLabel(status: ThreadMessage["status"]): { label: string; tone: "success" | "danger" | "neutral" } {
  // 'replied' means this specific message sent successfully and its contact has since
  // replied -- the reply itself is a separate card in the timeline, so this card just needs
  // to read as a successful send, same as plain 'sent'.
  if (status === "sent" || status === "received" || status === "replied") {
    return { label: "Sent", tone: "success" };
  }
  if (status === "failed") return { label: "Failed", tone: "danger" };
  if (status === "approved" || status === "sending") return { label: "Sending…", tone: "neutral" };
  return { label: status, tone: "neutral" };
}

function ReadOnlyMessageCard({ message }: { message: ThreadMessage }) {
  const showContextMenu = useContextMenu();
  const isInbound = message.direction === "inbound";
  const settled = settledLabel(message.status);

  return (
    <div
      className={`rounded-2xl border p-5 shadow-[var(--shadow-panel-sm)] ${
        isInbound ? "border-success/30 bg-success-dim" : "border-border bg-surface"
      }`}
    >
      <div className="mb-3 flex items-center gap-2">
        <h3 className="text-sm font-medium text-ink">
          {isInbound ? "Reply received" : TYPE_LABEL[message.type]}
        </h3>
        {isInbound ? (
          <Chip tone="success">Responded</Chip>
        ) : (
          <Chip tone={settled.tone}>{settled.label}</Chip>
        )}
      </div>
      {!isInbound && (
        <p className="mb-2 text-xs text-ink-muted">{message.subject}</p>
      )}
      <p
        className="select-text max-w-[70ch] whitespace-pre-wrap text-sm leading-relaxed text-ink"
        onContextMenu={(e) =>
          showContextMenu(e, [{ label: "Copy", onSelect: () => copySelectionOr(message.body) }])
        }
      >
        {message.body}
      </p>
    </div>
  );
}

function ComposeBox({ contactId, onSent }: { contactId: string; onSent: () => void }) {
  const [body, setBody] = useState("");
  const { sending, error, setError, start } = useSendPolling(onSent);

  const sendMutation = useMutation<{ messageId: string }, Error, void>({
    mutationFn: () => sendCustomReply(contactId, body),
    onSuccess: ({ messageId }) => {
      setBody("");
      start(messageId);
    },
    onError: (err) => setError(err.message || "Failed to send."),
  });

  const busy = sendMutation.isPending || sending;

  return (
    <div className="rounded-2xl border border-border bg-surface p-5 shadow-[var(--shadow-panel-sm)]">
      <h3 className="mb-3 text-sm font-medium text-ink">Reply in this thread</h3>
      {error && (
        <p className="mb-3 rounded-lg border border-danger/30 bg-danger-dim px-3 py-2 text-xs text-danger">
          {error}
        </p>
      )}
      <textarea
        value={body}
        onChange={(e) => setBody(e.target.value)}
        rows={4}
        placeholder="Write a reply — it sends into this same conversation, not a new one."
        className="mb-3 w-full resize-y rounded-lg border border-border bg-bg px-3 py-2 text-sm leading-relaxed text-ink outline-none focus:border-accent"
      />
      <button
        type="button"
        onClick={() => sendMutation.mutate()}
        disabled={busy || !body.trim()}
        className="rounded-full bg-accent-strong px-4 py-2 text-xs font-medium text-accent-ink transition-opacity hover:opacity-90 disabled:opacity-50 active:scale-[0.97]"
      >
        {busy ? "Sending…" : "Send"}
      </button>
    </div>
  );
}

export default function ThreadView({
  contactId,
  senderOptions,
}: {
  contactId: string;
  senderOptions: SenderOption[];
}) {
  const queryClient = useQueryClient();
  const account = useAccountMode();
  const keys = queryKeys.forAccount(account);

  const { data: messages = [], isLoading } = useQuery({
    queryKey: keys.threadMessages(contactId),
    queryFn: () => fetchThreadMessages(contactId),
  });

  function refetch() {
    queryClient.invalidateQueries({ queryKey: keys.threadMessages(contactId) });
    queryClient.invalidateQueries({ queryKey: keys.data() });
  }

  if (isLoading) {
    return <div className="h-32 animate-pulse rounded-2xl border border-border bg-surface" />;
  }

  // A thread exists (something has actually sent) the moment any message carries a real
  // gmail_thread_id -- only then does replying into "this conversation" mean anything.
  const threadExists = messages.some((m) => !!m.gmailThreadId);

  // A follow-up draft is moot once the conversation has moved past what it was written
  // for -- either the prospect replied, or a custom message already went out. Only the
  // follow-up gets suppressed this way; the intro draft always shows until sent, since
  // there's no prior context that could make sending the intro itself stale.
  const hasMovedOn = messages.some(
    (m) => m.direction === "inbound" || (m.type === "custom" && m.status !== "draft")
  );

  return (
    <div className="flex flex-col gap-4">
      {messages.map((message) => {
        if (message.type === "follow_up" && message.status === "draft" && hasMovedOn) {
          return null;
        }
        return message.direction === "outbound" && message.status === "draft" ? (
          <DraftMessageCard
            key={message.id}
            message={message}
            senderOptions={senderOptions}
            showSenderPicker={!message.gmailThreadId}
            onChanged={refetch}
          />
        ) : (
          <ReadOnlyMessageCard key={message.id} message={message} />
        );
      })}

      {threadExists && <ComposeBox contactId={contactId} onSent={refetch} />}
    </div>
  );
}
