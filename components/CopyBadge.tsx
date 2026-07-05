"use client";

import { useEffect, useRef, useState } from "react";
import { CopyIcon, MailIcon, PhoneIcon } from "@/components/icons";

export type CopyBadgeTone = "email" | "phone";

const toneClasses: Record<CopyBadgeTone, string> = {
  email: "border-accent/40 bg-accent-dim text-accent hover:bg-accent/20",
  phone: "border-pending/40 bg-pending-dim text-pending hover:bg-pending/20",
};

async function copyToClipboard(value: string) {
  if (navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(value);
    return;
  }
  const textarea = document.createElement("textarea");
  textarea.value = value;
  textarea.style.position = "fixed";
  textarea.style.opacity = "0";
  document.body.appendChild(textarea);
  textarea.select();
  document.execCommand("copy");
  document.body.removeChild(textarea);
}

export default function CopyBadge({
  value,
  tone,
}: {
  value: string;
  tone: CopyBadgeTone;
}) {
  const [copied, setCopied] = useState(false);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, []);

  async function handleCopy() {
    await copyToClipboard(value);
    setCopied(true);
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    timeoutRef.current = setTimeout(() => setCopied(false), 1500);
  }

  return (
    <button
      type="button"
      onClick={handleCopy}
      title="Click to copy"
      className={`inline-flex items-center gap-1.5 rounded-[3px] border px-2 py-1 font-mono text-xs transition-colors ${toneClasses[tone]}`}
    >
      {tone === "email" ? <MailIcon className="shrink-0" /> : <PhoneIcon className="shrink-0" />}
      <span>{value}</span>
      <CopyIcon copied={copied} className="shrink-0 opacity-70" />
    </button>
  );
}
