"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { useLayoutEffect, useState } from "react";
import Chip from "@/components/Chip";
import ContactNotes from "@/components/ContactNotes";
import { useContextMenu } from "@/components/ContextMenu";
import CopyBadge from "@/components/CopyBadge";
import { PhoneIcon } from "@/components/icons";
import ThreadView from "@/components/ThreadView";
import Tooltip from "@/components/Tooltip";
import { copySelectionOr } from "@/lib/clipboard";
import type { Prospect } from "@/lib/data";
import { getFunnelColumn } from "@/lib/funnel";
import { fetchSenderOptions, revealPhone } from "@/lib/outreachApi";
import { queryKeys } from "@/lib/queryKeys";
import { useAccountMode } from "@/lib/useAccountData";

const PHONE_NOT_REVEALED = "not revealed";

function toTelHref(phone: string): string {
  return `tel:${phone.replace(/[^\d+]/g, "")}`;
}

export default function EmailDetail({
  prospect,
  status,
  stage,
}: {
  prospect: Prospect;
  status?: string;
  stage?: string;
}) {
  const [canLoad, setCanLoad] = useState(false);
  const showContextMenu = useContextMenu();
  const account = useAccountMode();
  const keys = queryKeys.forAccount(account);
  const queryClient = useQueryClient();

  useLayoutEffect(() => {
    setCanLoad(true);
  }, []);

  // Same query key AutoSendToggle uses — one fetch serves both.
  const { data: senderOptions = [] } = useQuery({
    queryKey: keys.senderOptions(),
    queryFn: fetchSenderOptions,
    enabled: canLoad,
  });

  const revealPhoneMutation = useMutation<{ phone: string | null; phoneStatus: string }, Error, void>({
    mutationFn: () => revealPhone(prospect.id),
    onSuccess: ({ phone, phoneStatus }) => {
      queryClient.setQueryData<Prospect | null>(keys.prospectDetail(prospect.id), (old) =>
        old ? { ...old, phone: phone ?? PHONE_NOT_REVEALED, phoneStatus } : old
      );
    },
  });

  const phoneRevealed = prospect.phone !== PHONE_NOT_REVEALED;
  // Apollo answers the phone reveal via webhook a few minutes after the click (see
  // useProspectDetail's refetchInterval) -- isPending covers both "request just sent, no
  // response yet" and "request succeeded, still waiting on the webhook."
  const phoneRevealPending = revealPhoneMutation.isPending || prospect.phoneStatus === "pending";
  const phoneNotFound = !phoneRevealed && !phoneRevealPending && prospect.phoneStatus === "not_found";

  const backParams = new URLSearchParams();
  if (status) backParams.set("status", status);
  if (stage) backParams.set("stage", stage);
  const backHref = backParams.toString() ? `/emails?${backParams.toString()}` : "/emails";

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
                <Chip tone={getFunnelColumn(prospect.stage).tone}>
                  {getFunnelColumn(prospect.stage).label}
                </Chip>
                <Chip tone={prospect.emailVerified ? "success" : "neutral"}>
                  {prospect.emailVerified ? "Verified" : "Unverified"}
                </Chip>
              </div>
              <CopyBadge value={prospect.email} tone="email" />
              <div className="flex items-center gap-1.5">
                {phoneRevealed ? (
                  <>
                    <CopyBadge value={prospect.phone} tone="phone" />
                    <Tooltip label={`Call ${prospect.phone}`}>
                      <a
                        href={toTelHref(prospect.phone)}
                        className="inline-flex items-center justify-center rounded-full border border-pending/30 bg-pending-dim p-1.5 text-pending transition-colors hover:bg-pending/20 active:scale-[0.92]"
                      >
                        <PhoneIcon />
                      </a>
                    </Tooltip>
                  </>
                ) : phoneRevealPending ? (
                  <div className="flex items-center gap-1.5">
                    <span className="inline-flex items-center gap-1.5 rounded-full border border-pending/30 bg-pending-dim px-2.5 py-1 text-xs font-medium text-pending opacity-70">
                      <PhoneIcon />
                      Revealing… (can take a few minutes)
                    </span>
                    {/* Apollo's webhook can take several minutes or, if it never arrives (no
                        mobile credits, delivery failure, etc), forever -- this is always a safe
                        no-op to click early since the server only re-fires Apollo once a
                        pending reveal is itself over 10 minutes old. */}
                    <button
                      type="button"
                      onClick={() => revealPhoneMutation.mutate()}
                      className="text-xs font-medium text-ink-muted underline decoration-dotted transition-colors hover:text-ink"
                    >
                      Retry
                    </button>
                  </div>
                ) : phoneNotFound ? (
                  <div className="flex items-center gap-1.5">
                    <span className="inline-flex items-center gap-1.5 rounded-full border border-border px-2.5 py-1 text-xs font-medium text-ink-muted">
                      <PhoneIcon />
                      No phone found
                    </span>
                    <button
                      type="button"
                      onClick={() => revealPhoneMutation.mutate()}
                      className="text-xs font-medium text-ink-muted underline decoration-dotted transition-colors hover:text-ink"
                    >
                      Retry
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => revealPhoneMutation.mutate()}
                    className="inline-flex items-center gap-1.5 rounded-full border border-pending/30 bg-pending-dim px-2.5 py-1 text-xs font-medium text-pending transition-colors hover:bg-pending/20 active:scale-[0.97]"
                  >
                    <PhoneIcon />
                    Reveal phone
                  </button>
                )}
              </div>
              {revealPhoneMutation.error && (
                <p className="text-xs text-danger">
                  {revealPhoneMutation.error.message || "Couldn't reveal phone."}
                </p>
              )}
            </div>
          </div>
        </div>

        {canLoad && <ContactNotes contactId={prospect.id} />}

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

        {canLoad && <ThreadView contactId={prospect.id} senderOptions={senderOptions} />}
      </div>
    </section>
  );
}
