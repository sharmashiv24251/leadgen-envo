"use client";

import Link from "next/link";
import { useLayoutEffect, useState } from "react";
import Chip from "@/components/Chip";
import CopyBadge from "@/components/CopyBadge";
import { PhoneIcon } from "@/components/icons";
import { getAccount } from "@/lib/auth";
import type { Prospect } from "@/lib/data";
import { updateEmailDraft } from "@/lib/workenvoData";

function buildGmailComposeUrl(to: string, subject: string, body: string): string {
  const params = [
    ["view", "cm"],
    ["fs", "1"],
    ["to", to],
    ["su", subject],
    ["body", body],
  ]
    .map(([key, value]) => `${key}=${encodeURIComponent(value)}`)
    .join("&");

  return `https://mail.google.com/mail/?${params}`;
}

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

  useLayoutEffect(() => {
    setCanEdit(getAccount() === "workenvo");
  }, []);

  useLayoutEffect(() => {
    setSubject(prospect.subject);
    setBody(prospect.body);
    setIsEditing(false);
    setSaveError(null);
  }, [prospect.id, prospect.subject, prospect.body]);

  function handleSend() {
    const url = buildGmailComposeUrl(prospect.email, subject, body);
    window.open(url, "_blank", "noopener,noreferrer");
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

        <div className="rounded-xl border border-border bg-surface p-5 shadow-[var(--shadow-panel-sm)]">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <h1 className="text-lg font-semibold text-ink">{prospect.name}</h1>
              <p className="mt-1 text-sm text-ink-muted">
                {prospect.title} · {prospect.company}
              </p>
              <p className="mt-1 font-mono text-xs text-ink-faint">
                {prospect.location}
              </p>
            </div>
            <div className="flex flex-col items-end gap-2">
              <div className="flex items-center gap-2">
                {prospect.isDemo && <Chip tone="neutral">Demo</Chip>}
                <Chip tone={prospect.emailVerified ? "accent" : "neutral"}>
                  {prospect.emailVerified ? "Verified" : "Unverified"}
                </Chip>
              </div>
              <CopyBadge value={prospect.email} tone="email" />
              <div className="flex items-center gap-1.5">
                <CopyBadge value={prospect.phone} tone="phone" />
                <a
                  href={toTelHref(prospect.phone)}
                  title={`Call ${prospect.phone}`}
                  className="inline-flex items-center justify-center rounded-lg border border-pending/30 bg-pending-dim p-1.5 text-pending transition-colors hover:bg-pending/20"
                >
                  <PhoneIcon />
                </a>
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-6 md:grid-cols-[minmax(0,2fr)_minmax(0,3fr)]">
          <div className="rounded-xl border border-border bg-surface p-5 shadow-[var(--shadow-panel-sm)]">
            <h2 className="mb-4 text-xs font-medium uppercase tracking-wide text-ink-muted">
              Why This Angle
            </h2>
            <ul className="flex flex-col gap-4">
              {prospect.intel.map((point, i) => (
                <li key={i} className="flex gap-3">
                  <span
                    className="mt-1 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border border-accent/30 bg-accent-dim font-mono text-[10px] text-accent"
                    aria-hidden
                  >
                    {i + 1}
                  </span>
                  <span className="text-sm leading-relaxed text-ink">
                    {point}
                  </span>
                </li>
              ))}
            </ul>
          </div>

          <div className="rounded-xl border border-border bg-surface p-5 shadow-[var(--shadow-panel-sm)]">
            <div className="mb-4 flex items-center justify-between gap-4">
              <h2 className="text-xs font-medium uppercase tracking-wide text-ink-muted">
                Email Draft
              </h2>
              <div className="flex shrink-0 items-center gap-2">
                {canEdit && !isEditing && (
                  <button
                    type="button"
                    onClick={handleEditStart}
                    className="rounded-lg border border-border px-4 py-2 text-xs font-medium text-ink-muted transition-colors hover:text-ink"
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
                      className="rounded-lg border border-border px-4 py-2 text-xs font-medium text-ink-muted transition-colors hover:text-ink disabled:opacity-50"
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      onClick={handleSave}
                      disabled={saving}
                      className="rounded-lg bg-accent px-4 py-2 text-xs font-medium text-accent-ink transition-opacity hover:opacity-90 disabled:opacity-50"
                    >
                      {saving ? "Saving…" : "Save"}
                    </button>
                  </>
                )}
                <button
                  type="button"
                  onClick={handleSend}
                  disabled={isEditing}
                  className="rounded-lg bg-accent px-4 py-2 text-xs font-medium text-accent-ink transition-opacity hover:opacity-90 disabled:opacity-50"
                >
                  Send via Gmail
                </button>
              </div>
            </div>

            {saveError && (
              <p className="mb-4 rounded-lg border border-danger/30 bg-danger-dim px-3 py-2 text-xs text-danger">
                {saveError}
              </p>
            )}

            <div className="mb-4">
              <span className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-ink-muted">
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
                <div className="rounded-lg border border-border bg-bg px-3 py-2 text-sm text-ink">
                  {subject}
                </div>
              )}
            </div>

            <div>
              <span className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-ink-muted">
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
                <p className="max-w-[70ch] whitespace-pre-wrap text-sm leading-relaxed text-ink">
                  {body}
                </p>
              )}
            </div>
          </div>
        </div>

        {prospect.response && (
          <div className="rounded-xl border border-accent/30 bg-accent-dim p-5">
            <div className="mb-4 flex items-center gap-2">
              <h2 className="text-xs font-medium uppercase tracking-wide text-ink-muted">
                Reply Received
              </h2>
              <Chip tone="accent">Responded</Chip>
            </div>
            <p className="max-w-[70ch] whitespace-pre-wrap text-sm leading-relaxed text-ink">
              {prospect.response}
            </p>
          </div>
        )}
      </div>
    </section>
  );
}
