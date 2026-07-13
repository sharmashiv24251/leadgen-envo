"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { isAuthenticated } from "@/lib/auth";

export default function AuthGate({
  children,
  fallback = null,
}: {
  children: React.ReactNode;
  fallback?: React.ReactNode;
}) {
  const router = useRouter();
  const [verified, setVerified] = useState(false);

  useEffect(() => {
    if (isAuthenticated()) {
      setVerified(true);
    } else {
      router.replace("/login");
    }
  }, [router]);

  if (!verified) return <>{fallback}</>;

  return <>{children}</>;
}
