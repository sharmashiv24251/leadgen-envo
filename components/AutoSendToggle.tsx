"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { motion } from "motion/react";
import Tooltip from "@/components/Tooltip";
import {
  fetchAutoSend,
  fetchDefaultSender,
  fetchSenderOptions,
  setAutoSend,
  setDefaultSender,
} from "@/lib/outreachApi";
import { queryKeys } from "@/lib/queryKeys";
import { useAccountMode } from "@/lib/useAccountData";

const KNOB_SPRING = { type: "spring", stiffness: 500, damping: 30 } as const;

export default function AutoSendToggle() {
  const queryClient = useQueryClient();
  const account = useAccountMode();
  const keys = queryKeys.forAccount(account);

  const { data: autoSend } = useQuery({
    queryKey: keys.autoSend(),
    queryFn: fetchAutoSend,
  });
  // Same query key EmailDetail uses for its sender dropdown — one fetch serves both.
  const { data: senderOptions = [] } = useQuery({
    queryKey: keys.senderOptions(),
    queryFn: fetchSenderOptions,
  });
  const { data: defaultSender = "" } = useQuery({
    queryKey: keys.defaultSender(),
    queryFn: fetchDefaultSender,
  });

  const toggleMutation = useMutation<void, Error, boolean, { previous?: boolean }>({
    mutationFn: setAutoSend,
    onMutate: (next) => {
      const previous = queryClient.getQueryData<boolean>(keys.autoSend());
      queryClient.setQueryData(keys.autoSend(), next);
      return { previous };
    },
    onError: (err, _next, context) => {
      console.error("[AutoSendToggle] failed to save:", err);
      queryClient.setQueryData(keys.autoSend(), context?.previous ?? false);
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: keys.autoSend() });
    },
  });

  const senderMutation = useMutation<void, Error, string, { previous?: string }>({
    mutationFn: setDefaultSender,
    onMutate: (email) => {
      const previous = queryClient.getQueryData<string>(keys.defaultSender());
      queryClient.setQueryData(keys.defaultSender(), email);
      return { previous };
    },
    onError: (err, _email, context) => {
      console.error("[AutoSendToggle] failed to save default sender:", err);
      queryClient.setQueryData(keys.defaultSender(), context?.previous ?? "");
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: keys.defaultSender() });
    },
  });

  if (autoSend === undefined) return null;

  return (
    <div className="flex flex-wrap items-center gap-2">
      <Tooltip
        label={
          autoSend
            ? "New drafts send automatically. Click to require manual review."
            : "New drafts wait for review. Click to send automatically instead."
        }
      >
        <button
          type="button"
          onClick={() => toggleMutation.mutate(!autoSend)}
          disabled={toggleMutation.isPending}
          className="flex items-center gap-2 rounded-full border border-border bg-surface-raised px-3.5 py-2 text-xs font-medium text-ink-muted transition-colors hover:text-ink disabled:opacity-50 active:scale-[0.97]"
        >
          <span
            className={`relative inline-flex h-4 w-7 shrink-0 items-center rounded-full transition-colors ${
              autoSend ? "bg-accent" : "bg-border"
            }`}
            aria-hidden
          >
            <motion.span
              className="inline-block h-3 w-3 rounded-full bg-surface"
              animate={{ x: autoSend ? 14 : 2 }}
              transition={KNOB_SPRING}
            />
          </span>
          Auto-send {autoSend ? "on" : "off"}
        </button>
      </Tooltip>

      {autoSend && senderOptions.length > 0 && (
        <Tooltip label="New drafts send automatically from this address">
          <select
            value={defaultSender}
            onChange={(e) => senderMutation.mutate(e.target.value)}
            disabled={senderMutation.isPending}
            className="rounded-full border border-border bg-surface-raised px-3 py-2 text-xs text-ink-muted outline-none disabled:opacity-50"
          >
            {senderOptions.map((opt) => (
              <option key={opt.email} value={opt.email}>
                from: {opt.name} ({opt.email})
              </option>
            ))}
          </select>
        </Tooltip>
      )}
    </div>
  );
}
