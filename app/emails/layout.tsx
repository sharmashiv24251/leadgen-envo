"use client";

import { usePathname } from "next/navigation";
import EmailSidebar from "@/components/EmailSidebar";

export default function EmailsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const isListView = pathname === "/emails";

  return (
    <div className="flex min-h-0 flex-1 flex-col lg:flex-row">
      <div className={isListView ? "contents" : "hidden lg:contents"}>
        <EmailSidebar />
      </div>
      <div className={isListView ? "hidden lg:contents" : "contents"}>
        {children}
      </div>
    </div>
  );
}
