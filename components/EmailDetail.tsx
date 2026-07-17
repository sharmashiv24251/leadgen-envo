"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { useEffect, useLayoutEffect, useRef, useState } from "react";
import Chip from "@/components/Chip";
import { useContextMenu } from "@/components/ContextMenu";
import CopyBadge from "@/components/CopyBadge";
import { PhoneIcon } from "@/components/icons";
import Tooltip from "@/components/Tooltip";
import { copySelectionOr } from "@/lib/clipboard";
import type { Prospect } from "@/lib/data";
import { approveEmail, fetchEmailStatus, fetchSenderOptions, updateEmailDraft } from "@/lib/outreachApi";
import { queryKeys } from "@/lib/queryKeys";
import { useAccountMode } from "@/lib/useAccountData";

const TERMINAL_SEND_STATUSES = new Set(["sent", "failed", "bounced"]);
const POLL_INTERVAL_MS = 2000;
const POLL_TIMEOUT_MS = 15000;

function toTelHref(phone: string): string {
  return `tel:${phone.replace(/[^\d+]/g, "")}`;
}

export default function EmailDetail({
  prospect,
  status,
}: {
  prospect: Prospect;
  status?: string;
}) {
  const queryClient = useQueryClient();
  const [canEdit, setCanEdit] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [subject, setSubject] = useState(prospect.subject);
  const [body, setBody] = useState(prospect.body);
  const [selectedSender, setSelectedSender] = useState("");
  const [sendError, setSendError] = useState<string | null>(null);

  // Set the instant a send is kicked off, cleared once fetchEmailStatus reports a terminal
  // status (or POLL_TIMEOUT_MS elapses) — drives both the status-polling query below and
  // the "Sending…" button state.
  const [trackingContactId, setTrackingContactId] = useState<string | null>(null);
  const sendStartedAtRef = useRef(0);
  const showContextMenu = useContextMenu();
  const account = useAccountMode();
  const keys = queryKeys.forAccount(account);

  useLayoutEffect(() => {
    setCanEdit(true);
  }, []);

  useLayoutEffect(() => {
    setSubject(prospect.subject);
    setBody(prospect.body);
    setIsEditing(false);
    setSendError(null);
    setTrackingContactId(null);
  }, [prospect.id, prospect.subject, prospect.body]);

  // Same query key AutoSendToggle uses — one fetch serves both.
  const { data: senderOptions = [] } = useQuery({
    queryKey: keys.senderOptions(),
    queryFn: fetchSenderOptions,
    enabled: canEdit,
  });

  useEffect(() => {
    setSelectedSender((prev) => prev || senderOptions[0]?.email || "");
  }, [senderOptions]);

  const statusQuery = useQuery({
    queryKey: keys.emailStatus(prospect.id),
    queryFn: () => fetchEmailStatus(prospect.id),
    enabled: trackingContactId === prospect.id,
    refetchInterval: POLL_INTERVAL_MS,
  });

  useEffect(() => {
    if (trackingContactId !== prospect.id) return;
    const currentStatus = statusQuery.data;
    const isTerminal = !!currentStatus && TERMINAL_SEND_STATUSES.has(currentStatus);
    const timedOut = Date.now() - sendStartedAtRef.current > POLL_TIMEOUT_MS;
    if (!isTerminal && !timedOut) return;

    setTrackingContactId(null);
    if (currentStatus === "failed") {
      setSendError("Send failed — check the notifications panel for details, then try again.");
    }
    queryClient.invalidateQueries({ queryKey: keys.data() });
  }, [statusQuery.data, trackingContactId, prospect.id, queryClient, keys]);

  const approveMutation = useMutation<void, Error, void>({
    mutationFn: () => approveEmail(prospect.id, selectedSender || undefined),
    onSuccess: () => {
      setSendError(null);
      queryClient.invalidateQueries({ queryKey: keys.data() });
      // Wipe any status cached from a previous send on this contact (e.g. a "failed" from
      // a prior attempt) — otherwise re-enabling the query below would hand the effect that
      // stale terminal value before the new attempt's real result exists, and it'd read the
      // old send's outcome as the new one's.
      queryClient.removeQueries({ queryKey: keys.emailStatus(prospect.id) });
      sendStartedAtRef.current = Date.now();
      setTrackingContactId(prospect.id);
    },
    onError: (err) => {
      setSendError(err.message || "Failed to send.");
    },
  });

  const saveMutation = useMutation<void, Error, void>({
    mutationFn: () => updateEmailDraft(prospect.id, { subject, body }),
    onSuccess: () => {
      setIsEditing(false);
      queryClient.invalidateQueries({ queryKey: keys.data() });
    },
  });

  const sending = approveMutation.isPending || trackingContactId === prospect.id;
  const saving = saveMutation.isPending;
  const saveError = saveMutation.error?.message ?? null;

  function handleEditStart() {
    saveMutation.reset();
    setIsEditing(true);
  }

  function handleCancel() {
    setSubject(prospect.subject);
    setBody(prospect.body);
    saveMutation.reset();
    setIsEditing(false);
  }

  const backHref = status ? `/emails?status=${status}` : "/emails";

  return (
    <section className="min-h-0 flex-1 overflow-y-auto">
      <div className="mx-auto flex max-w-5xl flex-col gap-6 px-6 py-8 sm:px-8">
        <Link
          href={backHref}
          className="inline-flex w-fit items-center gap-1.5 text-xs font-medium text-ink-muted transition-colors hover:text-ink lg:hidden"
        >
          <span aria-hidden>←</span>
          Back to list
        </Link>

        <div
          className="rounded-2xl border border-border bg-surface p-5 shadow-[var(--shadow-panel-sm)]"
          onContextMenu={(e) =>
            showContextMenu(e, [
              {
                label: "Copy",
                onSelect: () =>
                  copySelectionOr(
                    `${prospect.name}\n${prospect.title} · ${prospect.company}\n${prospect.location}`
                  ),
              },
            ])
          }
        >
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="select-text">
              <h1 className="text-lg font-semibold text-ink">{prospect.name}</h1>
              <p className="mt-1 text-sm text-ink-muted">
                {prospect.title} · {prospect.company}
              </p>
              <p className="mt-1 text-xs text-ink-muted">
                {prospect.location}
              </p>
            </div>
            <div className="flex flex-col items-end gap-2">
              <div className="flex items-center gap-2">
                <Chip tone={prospect.emailVerified ? "success" : "neutral"}>
                  {prospect.emailVerified ? "Verified" : "Unverified"}
                </Chip>
              </div>
              <CopyBadge value={prospect.email} tone="email" />
              <div className="flex items-center gap-1.5">
                <CopyBadge value={prospect.phone} tone="phone" />
                <Tooltip label={`Call ${prospect.phone}`}>
                  <a
                    href={toTelHref(prospect.phone)}
                    className="inline-flex items-center justify-center rounded-full border border-pending/30 bg-pending-dim p-1.5 text-pending transition-colors hover:bg-pending/20 active:scale-[0.92]"
                  >
                    <PhoneIcon />
                  </a>
                </Tooltip>
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-6 md:grid-cols-[minmax(0,2fr)_minmax(0,3fr)]">
          <div
            className="rounded-2xl border border-border bg-surface p-5 shadow-[var(--shadow-panel-sm)]"
            onContextMenu={(e) =>
              showContextMenu(e, [
                { label: "Copy", onSelect: () => copySelectionOr(prospect.intel.join("\n\n")) },
              ])
            }
          >
            <h2 className="mb-4 text-sm font-medium text-ink">
              Why this angle
            </h2>
            <ul className="flex flex-col gap-4">
              {prospect.intel.map((point, i) => (
                <li key={i} className="flex gap-3">
                  <span
                    className="mt-1 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border border-accent/30 bg-accent-dim text-[10px] font-medium text-accent"
                    aria-hidden
                  >
                    {i + 1}
                  </span>
                  <span className="select-text text-sm leading-relaxed text-ink">
                    {point}
                  </span>
                </li>
              ))}
            </ul>
          </div>

          <div className="rounded-2xl border border-border bg-surface p-5 shadow-[var(--shadow-panel-sm)]">
            <div className="mb-4 flex items-center justify-between gap-4">
              <h2 className="text-sm font-medium text-ink">
                Email draft
              </h2>
              <div className="flex shrink-0 items-center gap-2">
                {canEdit && !isEditing && prospect.status === "DRAFTED" && (
                  <button
                    type="button"
                    onClick={handleEditStart}
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
                {canEdit && prospect.status === "DRAFTED" && (
                  <>
                    {senderOptions.length > 0 && (
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
                      {sending ? "Sending…" : "Send Now"}
                    </button>
                  </>
                )}
              </div>
            </div>

            {saveError && (
              <p className="mb-4 rounded-lg border border-danger/30 bg-danger-dim px-3 py-2 text-xs text-danger">
                {saveError}
              </p>
            )}
            {sendError && (
              <p className="mb-4 rounded-lg border border-danger/30 bg-danger-dim px-3 py-2 text-xs text-danger">
                {sendError}
              </p>
            )}

            <div className="mb-4">
              <span className="mb-1.5 block text-xs font-medium text-ink-muted">
                Subject
              </span>
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
                  onContextMenu={(e) =>
                    showContextMenu(e, [{ label: "Copy", onSelect: () => copySelectionOr(subject) }])
                  }
                >
                  {subject}
                </div>
              )}
            </div>

            <div>
              <span className="mb-1.5 block text-xs font-medium text-ink-muted">
                Body
              </span>
              {isEditing ? (
                <textarea
                  value={body}
                  onChange={(e) => setBody(e.target.value)}
                  rows={12}
                  className="w-full max-w-[70ch] resize-y rounded-lg border border-accent/40 bg-bg px-3 py-2 text-sm leading-relaxed text-ink outline-none focus:border-accent"
                />
              ) : (
                <p
                  className="select-text max-w-[70ch] whitespace-pre-wrap text-sm leading-relaxed text-ink"
                  onContextMenu={(e) =>
                    showContextMenu(e, [{ label: "Copy", onSelect: () => copySelectionOr(body) }])
                  }
                >
                  {body}
                </p>
              )}
            </div>
          </div>
        </div>

        {prospect.response && (
          <div className="rounded-2xl border border-success/30 bg-success-dim p-5">
            <div className="mb-4 flex items-center gap-2">
              <h2 className="text-sm font-medium text-ink">
                Reply received
              </h2>
              <Chip tone="success">Responded</Chip>
            </div>
            <p
              className="select-text max-w-[70ch] whitespace-pre-wrap text-sm leading-relaxed text-ink"
              onContextMenu={(e) =>
                showContextMenu(e, [
                  { label: "Copy", onSelect: () => copySelectionOr(prospect.response ?? "") },
                ])
              }
            >
              {prospect.response}
            </p>
          </div>
        )}
      </div>
    </section>
  );
}
