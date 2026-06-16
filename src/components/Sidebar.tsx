"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Gem,
  MessageSquareText,
  AppWindow,
  TrendingUp,
  History,
  Pickaxe,
} from "lucide-react";

const NAV = [
  { href: "/", label: "总览", icon: LayoutDashboard },
  { href: "/opportunities", label: "机会卡片", icon: Gem },
  { href: "/reviews", label: "评论数据", icon: MessageSquareText },
  { href: "/apps", label: "应用矿源", icon: AppWindow },
  { href: "/trends", label: "趋势监控", icon: TrendingUp },
  { href: "/runs", label: "挖掘记录", icon: History },
];

export default function Sidebar() {
  const pathname = usePathname();
  return (
    <aside className="fixed inset-y-0 left-0 z-20 flex w-60 flex-col border-r border-rock-800 bg-rock-950/80 backdrop-blur">
      <div className="flex items-center gap-3 px-5 py-5">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-ore-500/15 ring-1 ring-ore-500/30">
          <Pickaxe className="h-5 w-5 text-ore-400" />
        </div>
        <div>
          <div className="text-sm font-semibold text-rock-50">机会矿工</div>
          <div className="text-[11px] text-rock-500">Opportunity Miner</div>
        </div>
      </div>

      <nav className="mt-2 flex-1 space-y-1 px-3">
        {NAV.map(({ href, label, icon: Icon }) => {
          const active = href === "/" ? pathname === "/" : pathname.startsWith(href);
          return (
            <Link
              key={href}
              href={href}
              className={`flex items-center gap-3 rounded-xl px-3 py-2 text-sm transition-colors ${
                active
                  ? "bg-ore-500/10 text-ore-300 ring-1 ring-ore-500/20"
                  : "text-rock-400 hover:bg-rock-800/60 hover:text-rock-100"
              }`}
            >
              <Icon className="h-4 w-4" />
              {label}
            </Link>
          );
        })}
      </nav>

      <div className="px-5 py-4 text-[11px] leading-relaxed text-rock-600">
        把散落的用户抱怨，
        <br />
        提炼成可执行的产品机会。
      </div>
    </aside>
  );
}
