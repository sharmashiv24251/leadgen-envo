"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState, type FormEvent } from "react";
import { checkCredentials, grantAccess, isAuthenticated } from "@/lib/auth";

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

    const account = checkCredentials(operatorId, accessKey);
    if (account) {
      grantAccess(account);
      router.push("/");
      return;
    }

    setDenied(true);
    setAccessKey("");
  }

  return (
    <div className="flex flex-1 items-center justify-center overflow-y-auto p-6">
      <div className="w-full max-w-sm rounded-2xl border border-border bg-surface p-8 shadow-[var(--shadow-panel)]">
        <div className="mb-6 flex items-center gap-2 text-sm">
          <span className="h-1.5 w-1.5 rounded-full bg-accent" aria-hidden />
          <span className="font-medium text-ink">thehrcompany</span>
        </div>

        <p className="mb-6 text-xs font-medium uppercase tracking-wide text-ink-muted">
          Command Center Access
        </p>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <label className="flex flex-col gap-1.5">
            <span className="text-xs font-medium uppercase tracking-wide text-ink-muted">
              Email
            </span>
            <input
              type="text"
              autoComplete="username"
              value={operatorId}
              onChange={(e) => {
                setOperatorId(e.target.value);
                setDenied(false);
              }}
              className="rounded-lg border border-border bg-bg px-3 py-2 text-sm text-ink outline-none placeholder:text-ink-faint focus:border-border-strong"
              placeholder="email"
            />
          </label>

          <label className="flex flex-col gap-1.5">
            <span className="text-xs font-medium uppercase tracking-wide text-ink-muted">
              Password
            </span>
            <input
              type="password"
              autoComplete="current-password"
              value={accessKey}
              onChange={(e) => {
                setAccessKey(e.target.value);
                setDenied(false);
              }}
              className="rounded-lg border border-border bg-bg px-3 py-2 text-sm text-ink outline-none placeholder:text-ink-faint focus:border-border-strong"
              placeholder="password"
            />
          </label>

          {denied && (
            <p className="rounded-lg border border-danger/30 bg-danger-dim px-3 py-2 text-xs font-medium text-danger">
              Access denied — check email and password
            </p>
          )}

          <button
            type="submit"
            className="mt-2 rounded-lg bg-accent px-4 py-2 text-sm font-medium text-accent-ink transition-opacity hover:opacity-90"
          >
            Authenticate
          </button>
        </form>
      </div>
    </div>
  );
}
