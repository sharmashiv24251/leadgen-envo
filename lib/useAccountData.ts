"use client";

import { useLayoutEffect, useState } from "react";
import { getAccount, isAuthenticated } from "@/lib/auth";
import {
  activityFeed as mockActivity,
  dashboardStats as mockStats,
  prospects as mockProspects,
  type ActivityEvent,
  type DashboardStats,
  type Prospect,
} from "@/lib/data";
import { fetchWorkenvoData } from "@/lib/workenvoData";

// Both hooks render the mock account's data on the very first pass (server-safe, no
// hydration mismatch — matches TopBar's own clock pattern). If the logged-in account
// turns out to be "workenvo", useLayoutEffect flips to a loading state BEFORE the
// browser paints, so the mock frame never actually becomes visible — it's swapped
// pre-paint, not after a visible flash.

export function useProspects(): {
  prospects: Prospect[];
  loading: boolean;
  refetch: () => void;
} {
  const [state, setState] = useState<{ prospects: Prospect[]; loading: boolean }>({
    prospects: mockProspects,
    loading: false,
  });

  function load() {
    if (!isAuthenticated() || getAccount() !== "workenvo") return;
    setState((prev) => ({ prospects: prev.prospects, loading: true }));
    fetchWorkenvoData().then(({ prospects }) => {
      setState({ prospects, loading: false });
    });
  }

  useLayoutEffect(() => {
    if (!isAuthenticated() || getAccount() !== "workenvo") return;
    let cancelled = false;
    setState({ prospects: [], loading: true });
    fetchWorkenvoData().then(({ prospects }) => {
      if (!cancelled) setState({ prospects, loading: false });
    });
    return () => {
      cancelled = true;
    };
  }, []);

  return { ...state, refetch: load };
}

export function useDashboardData(): {
  stats: DashboardStats;
  activity: ActivityEvent[];
  loading: boolean;
} {
  const [state, setState] = useState<{
    stats: DashboardStats;
    activity: ActivityEvent[];
    loading: boolean;
  }>({ stats: mockStats, activity: mockActivity, loading: false });

  useLayoutEffect(() => {
    if (!isAuthenticated() || getAccount() !== "workenvo") return;
    let cancelled = false;
    setState({
      stats: { emailsDelivered: 0, bounceRatePct: 0, replyRatePct: 0, totalDrafted: 0 },
      activity: [],
      loading: true,
    });
    fetchWorkenvoData().then(({ stats, activity }) => {
      if (!cancelled) setState({ stats, activity, loading: false });
    });
    return () => {
      cancelled = true;
    };
  }, []);

  return state;
}
