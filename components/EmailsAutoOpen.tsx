"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

const DESKTOP_QUERY = "(min-width: 1024px)";

// Desktop shows a two-pane list + detail view, so /emails should auto-open
// a prospect. Mobile shows one pane at a time, so /emails must stay the list.
export default function EmailsAutoOpen({ targetHref }: { targetHref: string }) {
  const router = useRouter();

  useEffect(() => {
    const mql = window.matchMedia(DESKTOP_QUERY);

    if (mql.matches) router.replace(targetHref);

    function handleChange(event: MediaQueryListEvent) {
      if (event.matches) router.replace(targetHref);
    }

    mql.addEventListener("change", handleChange);
    return () => mql.removeEventListener("change", handleChange);
  }, [router, targetHref]);

  return null;
}
