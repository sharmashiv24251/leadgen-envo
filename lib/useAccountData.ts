"use client";

import { useInfiniteQuery, useQuery, useQueryClient, type InfiniteData } from "@tanstack/react-query";
import { useLayoutEffect, useState } from "react";
import { getAccount, isAuthenticated, type Account } from "@/lib/auth";
import {
  type ActivityEvent,
  type DashboardStats,
  type FunnelStage,
  type Prospect,
  type ProspectListItem,
  type ProspectStatus,
} from "@/lib/data";
import {
  fetchAllProspectsLean,
  fetchDashboardStats,
  fetchProspectById,
  fetchProspectsPage,
  fetchRecentActivity,
  type ProspectPage,
} from "@/lib/outreachApi";
import { queryKeys } from "@/lib/queryKeys";

// The account check must happen client-side (localStorage) and can't run during SSR/the
// first client render without risking a hydration mismatch. useLayoutEffect flips this
// before the browser paints, so — combined with `enabled` below — the mock frame is what
// briefly exists, never what's actually painted.
export function useAccountMode(): Account {
  const [account, setAccount] = useState<Account>("mock");
  useLayoutEffect(() => {
    setAccount(isAuthenticated() ? getAccount() : "mock");
  }, []);
  return account;
}

export function useIsWorkenvoAccount(): boolean {
  return useAccountMode() === "workenvo";
}

// Infinite-scroll, 40/page (lib/workenvoData.ts's PAGE_SIZE) -- one query per (account, filter)
// combination, dispatched through lib/outreachApi.ts so this hook doesn't need to know which
// account is active, same pattern AutoSendToggle/EmailDetail already use.
export function useProspectsList(filters: {
  status: ProspectStatus | null;
  stage: FunnelStage | null;
}): {
  items: Prospect[];
  loading: boolean;
  isFetchingNextPage: boolean;
  hasNextPage: boolean;
  fetchNextPage: () => void;
} {
  const account = useAccountMode();
  const keys = queryKeys.forAccount(account);

  const query = useInfiniteQuery({
    queryKey: keys.prospectsList(filters.status, filters.stage),
    queryFn: ({ pageParam }) =>
      fetchProspectsPage({ cursor: pageParam, status: filters.status, stage: filters.stage }),
    initialPageParam: null as string | null,
    getNextPageParam: (lastPage) => lastPage.nextCursor,
    // This data can change from outside the app (the backend VM drafting new emails, a
    // teammate approving one) — every mount should hit Supabase, not just serve whatever's
    // still under staleTime.
    refetchOnMount: "always",
  });

  return {
    items: query.data?.pages.flatMap((page) => page.items) ?? [],
    loading: query.isLoading,
    isFetchingNextPage: query.isFetchingNextPage,
    hasNextPage: !!query.hasNextPage,
    fetchNextPage: () => void query.fetchNextPage(),
  };
}

// Unpaginated, lean -- only for the Funnel board, which needs every prospect at once to bucket
// into Kanban columns (a "40 at a time" feed doesn't fit that view).
export function useAllProspectsLean(): { items: ProspectListItem[]; loading: boolean } {
  const account = useAccountMode();
  const keys = queryKeys.forAccount(account);

  const query = useQuery({
    queryKey: keys.allProspectsLean(),
    queryFn: fetchAllProspectsLean,
    refetchOnMount: "always",
  });

  return { items: query.data ?? [], loading: query.isLoading };
}

// The detail page's own fetch by id. `listFilters` (the same status/stage the sidebar link that
// led here was showing, read from the URL) lets this seed itself instantly from that
// already-loaded, now-rich sidebar page instead of always paying for a second round-trip --
// only falls back to a fresh fetchProspectById when this contact isn't in that cache (a deep
// link, or a filter combination that was never loaded).
export function useProspectDetail(
  contactId: string,
  listFilters?: { status: ProspectStatus | null; stage: FunnelStage | null }
): {
  prospect: Prospect | null;
  loading: boolean;
} {
  const account = useAccountMode();
  const keys = queryKeys.forAccount(account);
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: keys.prospectDetail(contactId),
    queryFn: () => fetchProspectById(contactId),
    initialData: () => {
      if (!listFilters) return undefined;
      const cached = queryClient.getQueryData<InfiniteData<ProspectPage>>(
        keys.prospectsList(listFilters.status, listFilters.stage)
      );
      return cached?.pages.flatMap((page) => page.items).find((p) => p.id === contactId);
    },
    refetchOnMount: "always",
    // Apollo's phone reveal answers via webhook a few minutes after the request, out of band
    // from the click that triggered it -- poll while a reveal is in flight so the "Revealing…"
    // state resolves to verified/not_found on its own instead of needing a manual refresh.
    refetchInterval: (query) => (query.state.data?.phoneStatus === "pending" ? 5000 : false),
  });

  return { prospect: query.data ?? null, loading: query.isLoading };
}

const EMPTY_STATS: DashboardStats = {
  emailsDelivered: 0,
  bounceRatePct: 0,
  replyRatePct: 0,
  totalDrafted: 0,
};

export function useDashboardData(): {
  stats: DashboardStats;
  activity: ActivityEvent[];
  loading: boolean;
} {
  const account = useAccountMode();
  const keys = queryKeys.forAccount(account);

  const statsQuery = useQuery({
    queryKey: keys.dashboardStats(),
    queryFn: fetchDashboardStats,
    refetchOnMount: "always",
  });
  const activityQuery = useQuery({
    queryKey: keys.recentActivity(),
    queryFn: fetchRecentActivity,
    refetchOnMount: "always",
  });

  return {
    stats: statsQuery.data ?? EMPTY_STATS,
    activity: activityQuery.data ?? [],
    loading: statsQuery.isLoading || activityQuery.isLoading,
  };
}
