"use client";

import { useLayoutEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { getAccount, isAuthenticated } from "@/lib/auth";
import {
  activityFeed as mockActivity,
  dashboardStats as mockStats,
  prospects as mockProspects,
  type ActivityEvent,
  type DashboardStats,
  type Prospect,
} from "@/lib/data";
import { queryKeys } from "@/lib/queryKeys";
import { fetchWorkenvoData } from "@/lib/workenvoData";

// The account check must happen client-side (localStorage) and can't run during SSR/the
// first client render without risking a hydration mismatch. useLayoutEffect flips this
// before the browser paints, so — combined with `enabled` below — the mock frame is what
// briefly exists, never what's actually painted.
export function useIsWorkenvoAccount(): boolean {
  const [isWorkenvo, setIsWorkenvo] = useState(false);
  useLayoutEffect(() => {
    setIsWorkenvo(isAuthenticated() && getAccount() === "workenvo");
  }, []);
  return isWorkenvo;
}

// Both hooks below share one query key: prospects/stats/activity all come from the same
// `emails` query, so mounting the dashboard and the emails sidebar at once (or navigating
// between them within the staleTime window) reuses one cached fetch instead of two.
export function useProspects(): {
  prospects: Prospect[];
  loading: boolean;
  refetch: () => void;
} {
  const isWorkenvo = useIsWorkenvoAccount();
  const { data, isLoading, refetch } = useQuery({
    queryKey: queryKeys.workenvo.data(),
    queryFn: fetchWorkenvoData,
    enabled: isWorkenvo,
    // This data can change from outside the app (the backend VM drafting new emails,
    // a teammate approving one) — every mount should hit Supabase, not just serve
    // whatever's still under staleTime. Concurrent mounts on the same key still share
    // one in-flight request, so this doesn't cost extra fetches, just guarantees freshness.
    refetchOnMount: "always",
  });

  return {
    prospects: data?.prospects ?? mockProspects,
    loading: isWorkenvo && isLoading,
    refetch: () => void refetch(),
  };
}

export function useDashboardData(): {
  stats: DashboardStats;
  activity: ActivityEvent[];
  loading: boolean;
} {
  const isWorkenvo = useIsWorkenvoAccount();
  const { data, isLoading } = useQuery({
    queryKey: queryKeys.workenvo.data(),
    queryFn: fetchWorkenvoData,
    enabled: isWorkenvo,
    refetchOnMount: "always",
  });

  return {
    stats: data?.stats ?? mockStats,
    activity: data?.activity ?? mockActivity,
    loading: isWorkenvo && isLoading,
  };
}
