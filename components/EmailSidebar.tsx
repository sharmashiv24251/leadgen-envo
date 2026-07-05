"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import Chip from "@/components/Chip";
import { prospects, dateGroupLabel, type Prospect } from "@/lib/data";
import { statusTone } from "@/lib/status";

function groupByDate(list: Prospect[]): [number, Prospect[]][] {
  const map = new Map<number, Prospect[]>();
  map.set(0, []); // always show "Today" so incoming emails have a home
  for (const prospect of list) {
    if (!map.has(prospect.daysAgo)) map.set(prospect.daysAgo, []);
    map.get(prospect.daysAgo)!.push(prospect);
  }
  return [...map.entries()].sort((a, b) => a[0] - b[0]);
}

export default function EmailSidebar() {
  const pathname = usePathname();
  const groups = groupByDate(prospects);
  const [collapsed, setCollapsed] = useState<Set<number>>(new Set());

  function toggle(daysAgo: number) {
    setCollapsed((prev) => {
      const next = new Set(prev);
      if (next.has(daysAgo)) next.delete(daysAgo);
      else next.add(daysAgo);
      return next;
    });
  }

  return (
    <aside className="flex max-h-64 shrink-0 flex-col border-b border-border overflow-y-auto lg:h-auto lg:max-h-none lg:w-80 lg:border-b-0 lg:border-r">
      <div className="sticky top-0 flex items-center gap-2 border-b border-border bg-surface px-4 py-3 font-mono text-[11px] uppercase tracking-wider text-ink-muted">
        Prospects
        <span className="rounded-[3px] border border-border px-1.5 py-0.5 text-ink-faint">
          {prospects.length}
        </span>
      </div>

      {groups.map(([daysAgo, group]) => {
        const isCollapsed = collapsed.has(daysAgo);
        return (
          <div key={daysAgo} className="border-b border-border">
            <button
              type="button"
              onClick={() => toggle(daysAgo)}
              className="flex w-full items-center justify-between gap-2 px-4 py-2 font-mono text-[11px] uppercase tracking-wider text-ink-muted hover:text-ink"
            >
              <span className="flex items-center gap-2">
                <span aria-hidden>{isCollapsed ? "▸" : "▾"}</span>
                {dateGroupLabel(daysAgo)}
              </span>
              <span className="text-ink-faint">{group.length}</span>
            </button>

            {!isCollapsed && group.length === 0 && (
              <p className="px-4 pb-3 text-xs text-ink-faint">No emails yet</p>
            )}

            {!isCollapsed && group.length > 0 && (
              <ul>
                {group.map((prospect) => {
                  const isSelected = pathname === `/emails/${prospect.id}`;
                  return (
                    <li key={prospect.id} className="border-t border-border">
                      <Link
                        href={`/emails/${prospect.id}`}
                        aria-current={isSelected ? "page" : undefined}
                        className={`flex w-full flex-col gap-1.5 border-l-2 px-4 py-3 text-left transition-colors ${
                          isSelected
                            ? "border-l-accent bg-accent-dim"
                            : "border-l-transparent hover:bg-surface"
                        }`}
                      >
                        <div className="flex items-center justify-between gap-2">
                          <span className="truncate text-sm font-medium text-ink">
                            {prospect.name}
                          </span>
                          <Chip tone={statusTone[prospect.status]}>
                            {prospect.status}
                          </Chip>
                        </div>
                        <span className="truncate text-xs text-ink-muted">
                          {prospect.title} · {prospect.company}
                        </span>
                        <div className="flex items-center gap-2 font-mono text-[11px] text-ink-faint">
                          <span className="truncate">{prospect.subject}</span>
                          {prospect.isDemo && (
                            <>
                              <span aria-hidden>·</span>
                              <span>Demo</span>
                            </>
                          )}
                        </div>
                      </Link>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        );
      })}
    </aside>
  );
}
