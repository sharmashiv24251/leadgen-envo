"use client";

import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import EmailSidebar from "@/components/EmailSidebar";
import { isAuthenticated } from "@/lib/auth";

export default function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [authed, setAuthed] = useState(false);

  useEffect(() => {
    setAuthed(isAuthenticated());
  }, [pathname]);

  const inEmails = pathname?.startsWith("/emails") ?? false;

  if (!authed || pathname === "/login" || !inEmails) {
    return <main className="flex min-h-0 flex-1 flex-col">{children}</main>;
  }

  // Desktop always docks the prospect list beside content within /emails —
  // it's the app shell for the outreach feed, not the whole app (Command
  // Center at "/" stays a standalone intro screen, no sidebar). Mobile has
  // room for only one pane: the list takes the full screen on the bare
  // /emails route, otherwise the prospect detail takes it, matching
  // EmailsAutoOpen's own desktop/mobile split.
  const isListView = pathname === "/emails";

  return (
    <div className="flex min-h-0 flex-1 flex-row">
      <div className={isListView ? "contents" : "hidden lg:contents"}>
        <EmailSidebar />
      </div>
      <main className={`min-h-0 flex-1 flex-col ${isListView ? "hidden lg:flex" : "flex"}`}>
        {children}
      </main>
    </div>
  );
}
