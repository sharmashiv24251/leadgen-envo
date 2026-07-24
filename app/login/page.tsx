"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { login } from "@/lib/auth";

export default function LoginPage() {
  const router = useRouter();
  const [operatorId, setOperatorId] = useState("");
  const [accessKey, setAccessKey] = useState("");
  const [denied, setDenied] = useState(false);
  const [pending, setPending] = useState(false);

  // No client-side "already authed" redirect needed here -- proxy.ts already redirects
  // an authenticated request away from /login before this page ever renders.

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setPending(true);

    const account = await login(operatorId, accessKey);
    if (account) {
      router.push("/");
      return;
    }

    setPending(false);
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

        <p className="mb-6 text-sm text-ink-muted">
          Command Center access
        </p>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <label className="flex flex-col gap-1.5">
            <span className="text-xs font-medium text-ink-muted">
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
              className="rounded-lg border border-border bg-bg px-3 py-2 text-sm text-ink outline-none placeholder:text-ink-muted focus:border-accent"
              placeholder="email"
            />
          </label>

          <label className="flex flex-col gap-1.5">
            <span className="text-xs font-medium text-ink-muted">
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
              className="rounded-lg border border-border bg-bg px-3 py-2 text-sm text-ink outline-none placeholder:text-ink-muted focus:border-accent"
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
            disabled={pending}
            className="mt-2 rounded-full bg-accent-strong px-4 py-2 text-sm font-medium text-accent-ink transition-opacity hover:opacity-90 active:scale-[0.97] disabled:opacity-60"
          >
            {pending ? "Authenticating…" : "Authenticate"}
          </button>
        </form>
      </div>
    </div>
  );
}
