"use client";

import { useEffect, useRef, useState } from "react";
import { useContextMenu } from "@/components/ContextMenu";
import { CopyIcon, MailIcon, PhoneIcon } from "@/components/icons";
import Tooltip from "@/components/Tooltip";
import { copyToClipboard } from "@/lib/clipboard";

export type CopyBadgeTone = "email" | "phone";

const toneClasses: Record<CopyBadgeTone, string> = {
  email: "border-accent/40 bg-accent-dim text-accent hover:bg-accent/20",
  phone: "border-pending/40 bg-pending-dim text-pending hover:bg-pending/20",
};

export default function CopyBadge({
  value,
  tone,
}: {
  value: string;
  tone: CopyBadgeTone;
}) {
  const [copied, setCopied] = useState(false);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const showContextMenu = useContextMenu();

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
    <Tooltip label="Click to copy">
      <button
        type="button"
        onClick={handleCopy}
        onContextMenu={(e) =>
          showContextMenu(e, [{ label: `Copy ${tone === "email" ? "email" : "number"}`, onSelect: handleCopy }])
        }
        className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs transition-colors active:scale-[0.97] ${toneClasses[tone]}`}
      >
        {tone === "email" ? <MailIcon className="shrink-0" /> : <PhoneIcon className="shrink-0" />}
        <span>{value}</span>
        <CopyIcon copied={copied} className="shrink-0 opacity-70" />
      </button>
    </Tooltip>
  );
}
