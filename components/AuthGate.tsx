"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { isAuthenticated } from "@/lib/auth";

export default function AuthGate({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [verified, setVerified] = useState(false);

  useEffect(() => {
    if (isAuthenticated()) {
      setVerified(true);
    } else {
      router.replace("/login");
    }
  }, [router]);

  if (!verified) {
    return (
      <div className="flex flex-1 items-center justify-center">
        <p className="animate-pulse text-xs font-medium uppercase tracking-wide text-ink-muted">
          verifying access…
        </p>
      </div>
    );
  }

  return <>{children}</>;
}
