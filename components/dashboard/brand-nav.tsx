"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

const tabs = [
  { path: "", label: "Overview" },
  { path: "/prompts", label: "Prompts" },
  { path: "/competitors", label: "Competitors" },
  { path: "/citations", label: "Citations" },
  { path: "/actions", label: "Actions" },
  { path: "/history", label: "History" },
] as const;

export function BrandNav({ brandId }: { brandId: string }) {
  const pathname = usePathname();
  const base = `/dashboard/brands/${brandId}`;

  return (
    <nav className="rb-panel-soft flex gap-1 overflow-x-auto p-1.5">
      {tabs.map((tab) => {
        const href = `${base}${tab.path}`;
        const active = pathname === href;
        return (
          <Link
            key={tab.path}
            href={href}
            className={cn(
              "shrink-0 rounded-full px-3.5 py-2 text-sm transition-colors",
              active
                ? "bg-[color:var(--rb-ink)] font-medium text-white shadow-sm"
                : "text-muted-foreground hover:bg-white hover:text-foreground",
            )}
          >
            {tab.label}
          </Link>
        );
      })}
    </nav>
  );
}
