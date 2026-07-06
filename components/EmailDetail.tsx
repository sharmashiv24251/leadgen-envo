"use client";

import Link from "next/link";
import Chip from "@/components/Chip";
import CopyBadge from "@/components/CopyBadge";
import { PhoneIcon } from "@/components/icons";
import type { Prospect } from "@/lib/data";

function buildGmailComposeUrl(prospect: Prospect): string {
  const params = [
    ["view", "cm"],
    ["fs", "1"],
    ["to", prospect.email],
    ["su", prospect.subject],
    ["body", prospect.body],
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
}: {
  prospect: Prospect;
  status?: string;
}) {
  function handleSend() {
    const url = buildGmailComposeUrl(prospect);
    window.open(url, "_blank", "noopener,noreferrer");
  }

  const backHref = status ? `/emails?status=${status}` : "/emails";

  return (
    <section className="min-h-0 flex-1 overflow-y-auto">
      <div className="mx-auto flex max-w-5xl flex-col gap-6 px-6 py-8 sm:px-8">
        <Link
          href={backHref}
          className="inline-flex w-fit items-center gap-1.5 font-mono text-xs uppercase tracking-wider text-ink-muted transition-colors hover:text-ink lg:hidden"
        >
          <span aria-hidden>←</span>
          Back to list
        </Link>

        <div className="rounded-[4px] border border-border bg-surface p-5">
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
                  className="inline-flex items-center justify-center rounded-[3px] border border-pending/40 bg-pending-dim p-1.5 text-pending transition-colors hover:bg-pending/20"
                >
                  <PhoneIcon />
                </a>
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-6 md:grid-cols-[minmax(0,2fr)_minmax(0,3fr)]">
          <div className="rounded-[4px] border border-border bg-surface p-5">
            <h2 className="mb-4 font-mono text-[11px] uppercase tracking-wider text-ink-muted">
              Why This Angle
            </h2>
            <ul className="flex flex-col gap-4">
              {prospect.intel.map((point, i) => (
                <li key={i} className="flex gap-3">
                  <span
                    className="mt-1 flex h-4 w-4 shrink-0 items-center justify-center rounded-[3px] border border-accent/40 bg-accent-dim font-mono text-[10px] text-accent"
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

          <div className="rounded-[4px] border border-border bg-surface p-5">
            <div className="mb-4 flex items-center justify-between gap-4">
              <h2 className="font-mono text-[11px] uppercase tracking-wider text-ink-muted">
                Email Draft
              </h2>
              <button
                type="button"
                onClick={handleSend}
                className="shrink-0 rounded-[3px] bg-accent px-4 py-2 font-mono text-xs font-medium uppercase tracking-wider text-accent-ink transition-opacity hover:opacity-90"
              >
                Send via Gmail
              </button>
            </div>

            <div className="mb-4">
              <span className="mb-1.5 block font-mono text-[11px] uppercase tracking-wider text-ink-muted">
                Subject
              </span>
              <div className="rounded-[3px] border border-border bg-bg px-3 py-2 text-sm text-ink">
                {prospect.subject}
              </div>
            </div>

            <div>
              <span className="mb-1.5 block font-mono text-[11px] uppercase tracking-wider text-ink-muted">
                Body
              </span>
              <p className="max-w-[70ch] whitespace-pre-wrap text-sm leading-relaxed text-ink">
                {prospect.body}
              </p>
            </div>
          </div>
        </div>

        {prospect.response && (
          <div className="rounded-[4px] border border-accent/40 bg-accent-dim p-5">
            <div className="mb-4 flex items-center gap-2">
              <h2 className="font-mono text-[11px] uppercase tracking-wider text-ink-muted">
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
