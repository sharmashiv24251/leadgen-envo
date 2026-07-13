"use client";

import Link from "next/link";
import { useEffect, useLayoutEffect, useRef, useState } from "react";
import Chip from "@/components/Chip";
import { useContextMenu } from "@/components/ContextMenu";
import CopyBadge from "@/components/CopyBadge";
import { PhoneIcon } from "@/components/icons";
import Tooltip from "@/components/Tooltip";
import { getAccount } from "@/lib/auth";
import { copySelectionOr } from "@/lib/clipboard";
import type { Prospect } from "@/lib/data";
import {
  approveEmail,
  fetchEmailStatus,
  fetchSenderOptions,
  updateEmailDraft,
  type SenderOption,
} from "@/lib/workenvoData";

const TERMINAL_SEND_STATUSES = new Set(["sent", "failed", "bounced"]);
const POLL_INTERVAL_MS = 2000;
const POLL_TIMEOUT_MS = 15000;

function toTelHref(phone: string): string {
  return `tel:${phone.replace(/[^\d+]/g, "")}`;
}

export default function EmailDetail({
  prospect,
  status,
  onSaved,
}: {
  prospect: Prospect;
  status?: string;
  onSaved?: () => void;
}) {
  const [canEdit, setCanEdit] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [subject, setSubject] = useState(prospect.subject);
  const [body, setBody] = useState(prospect.body);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  const [senderOptions, setSenderOptions] = useState<SenderOption[]>([]);
  const [selectedSender, setSelectedSender] = useState("");
  const [sending, setSending] = useState(false);
  const [sendError, setSendError] = useState<string | null>(null);
  const cancelledRef = useRef(false);
  const showContextMenu = useContextMenu();

  useLayoutEffect(() => {
    setCanEdit(getAccount() === "workenvo");
  }, []);

  useLayoutEffect(() => {
    setSubject(prospect.subject);
    setBody(prospect.body);
    setIsEditing(false);
    setSaveError(null);
    setSending(false);
    setSendError(null);
  }, [prospect.id, prospect.subject, prospect.body]);

  useEffect(() => {
    if (!canEdit) return;
    fetchSenderOptions().then((opts) => {
      setSenderOptions(opts);
      setSelectedSender((prev) => prev || opts[0]?.email || "");
    });
  }, [canEdit]);

  useEffect(() => {
    cancelledRef.current = false;
    return () => {
      cancelledRef.current = true;
    };
  }, [prospect.id]);

  async function handleApprove() {
    setSending(true);
    setSendError(null);
    try {
      await approveEmail(prospect.id, selectedSender || undefined);
      onSaved?.();

      const start = Date.now();
      const poll = async () => {
        if (cancelledRef.current) return;
        const currentStatus = await fetchEmailStatus(prospect.id);
        if (cancelledRef.current) return;
        if (currentStatus && TERMINAL_SEND_STATUSES.has(currentStatus)) {
          setSending(false);
          if (currentStatus === "failed") {
            setSendError("Send failed — check the notifications panel for details, then try again.");
          }
          onSaved?.();
          return;
        }
        if (Date.now() - start > POLL_TIMEOUT_MS) {
          setSending(false);
          onSaved?.();
          return;
        }
        setTimeout(poll, POLL_INTERVAL_MS);
      };
      setTimeout(poll, POLL_INTERVAL_MS);
    } catch (err) {
      setSending(false);
      setSendError(err instanceof Error ? err.message : "Failed to send.");
    }
  }

  function handleEditStart() {
    setSaveError(null);
    setIsEditing(true);
  }

  function handleCancel() {
    setSubject(prospect.subject);
    setBody(prospect.body);
    setSaveError(null);
    setIsEditing(false);
  }

  async function handleSave() {
    setSaving(true);
    setSaveError(null);
    try {
      await updateEmailDraft(prospect.id, { subject, body });
      setIsEditing(false);
      onSaved?.();
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : "Failed to save.");
    } finally {
      setSaving(false);
    }
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
                {prospect.isDemo && <Chip tone="neutral">Demo</Chip>}
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
                {canEdit && !isEditing && (
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
                      onClick={handleSave}
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
                      onClick={handleApprove}
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
