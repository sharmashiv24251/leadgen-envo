"use client";

import { useEffect, useState } from "react";
import {
  fetchAutoSend,
  fetchDefaultSender,
  fetchSenderOptions,
  setAutoSend,
  setDefaultSender,
  type SenderOption,
} from "@/lib/workenvoData";

export default function AutoSendToggle() {
  const [autoSend, setLocalAutoSend] = useState<boolean | null>(null);
  const [saving, setSaving] = useState(false);

  const [senderOptions, setSenderOptions] = useState<SenderOption[]>([]);
  const [defaultSender, setLocalDefaultSender] = useState("");
  const [savingSender, setSavingSender] = useState(false);

  useEffect(() => {
    fetchAutoSend().then(setLocalAutoSend);
    fetchSenderOptions().then(setSenderOptions);
    fetchDefaultSender().then(setLocalDefaultSender);
  }, []);

  async function toggle() {
    if (autoSend === null || saving) return;
    const next = !autoSend;
    setLocalAutoSend(next);
    setSaving(true);
    try {
      await setAutoSend(next);
    } catch (err) {
      console.error("[AutoSendToggle] failed to save:", err);
      setLocalAutoSend(autoSend);
    } finally {
      setSaving(false);
    }
  }

  async function handleSenderChange(email: string) {
    const prev = defaultSender;
    setLocalDefaultSender(email);
    setSavingSender(true);
    try {
      await setDefaultSender(email);
    } catch (err) {
      console.error("[AutoSendToggle] failed to save default sender:", err);
      setLocalDefaultSender(prev);
    } finally {
      setSavingSender(false);
    }
  }

  if (autoSend === null) return null;

  return (
    <div className="flex flex-wrap items-center gap-2">
      <button
        type="button"
        onClick={toggle}
        disabled={saving}
        title={
          autoSend
            ? "New drafts send automatically. Click to require manual review."
            : "New drafts wait for review. Click to send automatically instead."
        }
        className="flex items-center gap-2 rounded-lg border border-border bg-surface px-3 py-2 text-xs font-medium text-ink-muted transition-colors hover:text-ink disabled:opacity-50"
      >
        <span
          className={`relative inline-flex h-4 w-7 shrink-0 items-center rounded-full transition-colors ${
            autoSend ? "bg-accent" : "bg-border"
          }`}
          aria-hidden
        >
          <span
            className={`inline-block h-3 w-3 transform rounded-full bg-surface transition-transform ${
              autoSend ? "translate-x-3.5" : "translate-x-0.5"
            }`}
          />
        </span>
        Auto-send {autoSend ? "on" : "off"}
      </button>

      {autoSend && senderOptions.length > 0 && (
        <select
          value={defaultSender}
          onChange={(e) => handleSenderChange(e.target.value)}
          disabled={savingSender}
          title="New drafts send automatically from this address"
          className="rounded-lg border border-border bg-surface px-2 py-2 text-xs text-ink-muted outline-none disabled:opacity-50"
        >
          {senderOptions.map((opt) => (
            <option key={opt.email} value={opt.email}>
              from: {opt.name} ({opt.email})
            </option>
          ))}
        </select>
      )}
    </div>
  );
}
