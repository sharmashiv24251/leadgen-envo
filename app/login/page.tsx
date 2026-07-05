"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState, type FormEvent } from "react";
import {
  VALID_ACCESS_KEY,
  VALID_OPERATOR_ID,
  grantAccess,
  isAuthenticated,
} from "@/lib/auth";

export default function LoginPage() {
  const router = useRouter();
  const [operatorId, setOperatorId] = useState("");
  const [accessKey, setAccessKey] = useState("");
  const [denied, setDenied] = useState(false);

  useEffect(() => {
    if (isAuthenticated()) {
      router.replace("/");
    }
  }, [router]);

  function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();

    if (operatorId === VALID_OPERATOR_ID && accessKey === VALID_ACCESS_KEY) {
      grantAccess();
      router.push("/");
      return;
    }

    setDenied(true);
    setAccessKey("");
  }

  return (
    <div className="flex flex-1 items-center justify-center overflow-y-auto p-6">
      <div className="w-full max-w-sm rounded-[4px] border border-border bg-surface p-8">
        <div className="mb-6 flex items-center gap-2 font-mono text-sm">
          <span className="h-1.5 w-1.5 rounded-full bg-accent" aria-hidden />
          <span className="text-ink">thehrcompany</span>
          <span className="w-[1ch] text-accent animate-blink" aria-hidden>
            _
          </span>
        </div>

        <p className="mb-6 font-mono text-[11px] uppercase tracking-wider text-ink-muted">
          Command Center Access
        </p>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <label className="flex flex-col gap-1.5">
            <span className="font-mono text-[11px] uppercase tracking-wider text-ink-muted">
              Operator ID
            </span>
            <input
              type="text"
              autoComplete="username"
              value={operatorId}
              onChange={(e) => {
                setOperatorId(e.target.value);
                setDenied(false);
              }}
              className="rounded-[3px] border border-border bg-bg px-3 py-2 font-mono text-sm text-ink outline-none placeholder:text-ink-faint focus:border-border-strong"
              placeholder="operator id"
            />
          </label>

          <label className="flex flex-col gap-1.5">
            <span className="font-mono text-[11px] uppercase tracking-wider text-ink-muted">
              Access Key
            </span>
            <input
              type="password"
              autoComplete="current-password"
              value={accessKey}
              onChange={(e) => {
                setAccessKey(e.target.value);
                setDenied(false);
              }}
              className="rounded-[3px] border border-border bg-bg px-3 py-2 font-mono text-sm text-ink outline-none placeholder:text-ink-faint focus:border-border-strong"
              placeholder="access key"
            />
          </label>

          {denied && (
            <p className="rounded-[3px] border border-danger/40 bg-danger-dim px-3 py-2 font-mono text-xs uppercase tracking-wider text-danger">
              Access denied — check operator id and access key
            </p>
          )}

          <button
            type="submit"
            className="mt-2 rounded-[3px] bg-accent px-4 py-2 font-mono text-sm font-medium text-accent-ink transition-opacity hover:opacity-90"
          >
            Authenticate
          </button>
        </form>
      </div>
    </div>
  );
}
