"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ClipboardList, LayoutDashboard, Star, Users, Wrench } from "lucide-react";
import { cn } from "@/lib/utils";

const navItems = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/orders", label: "Orders", icon: ClipboardList },
  { href: "/workers", label: "Workers", icon: Wrench },
  { href: "/users", label: "Users", icon: Users },
  { href: "/reviews", label: "Reviews", icon: Star }
];

export function AppSidebar() {
  const pathname = usePathname();

  return (
    <aside className="fixed inset-y-0 left-0 z-20 flex w-72 flex-col border-r bg-card">
      <div className="border-b px-6 py-5">
        <div className="text-xl font-semibold tracking-tight">NearFIX</div>
        <div className="mt-1 text-xs font-medium uppercase tracking-wide text-muted-foreground">
          Operations Center
        </div>
      </div>

      <nav className="flex-1 space-y-1 px-3 py-4">
        {navItems.map((item) => {
          const Icon = item.icon;
          const active = pathname === item.href;

          return (
            <Link
              className={cn(
                "flex h-11 items-center gap-3 rounded-md px-3 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground",
                active && "bg-primary/10 text-primary"
              )}
              href={item.href}
              key={item.href}
            >
              <Icon className="h-4 w-4" />
              {item.label}
            </Link>
          );
        })}
      </nav>

      <div className="border-t p-4">
        <div className="rounded-md bg-muted px-3 py-3 text-xs text-muted-foreground">
          Admin buyurtmalarni kuzatadi, worker sifatini nazorat qiladi va zarur
          holatda order statusini boshqaradi.
        </div>
      </div>
    </aside>
  );
}
