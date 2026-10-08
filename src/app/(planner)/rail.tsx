"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

// 左侧图标栏，对应滴答清单最左一列。图标与样式在 M1 中按 docs/milestones.md 完善。
const ENTRIES = [
  { href: "/tasks/today", match: "/tasks", label: "任务" },
  { href: "/calendar", match: "/calendar", label: "日历" },
  { href: "/", match: null, label: "主线" },
];

export function Rail() {
  const pathname = usePathname();
  return (
    <nav aria-label="主导航" className="flex w-14 shrink-0 flex-col items-center gap-2 border-r border-rule py-4">
      {ENTRIES.map((e) => {
        const active = e.match !== null && pathname.startsWith(e.match);
        return (
          <Link
            key={e.href}
            href={e.href}
            aria-current={active ? "page" : undefined}
            className={`rounded px-1 py-2 text-xs ${active ? "text-ink font-semibold" : "text-ink-3"}`}
          >
            {e.label}
          </Link>
        );
      })}
    </nav>
  );
}
