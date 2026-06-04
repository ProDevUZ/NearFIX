"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { AppSidebar } from "@/shared/components/app-sidebar";
import { Topbar } from "@/shared/components/topbar";
import { useAdminSessionStore } from "@/stores/admin-session-store";

export default function DashboardLayout({
  children
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const session = useAdminSessionStore((state) => state.session);
  const isSessionReady = useAdminSessionStore((state) => state.isSessionReady);
  const hydrateSession = useAdminSessionStore((state) => state.hydrateSession);

  useEffect(() => {
    hydrateSession();
  }, [hydrateSession]);

  useEffect(() => {
    if (isSessionReady && !session) router.replace("/login");
  }, [isSessionReady, router, session]);

  if (!isSessionReady || !session) return null;

  return (
    <div className="min-h-screen bg-background">
      <AppSidebar />
      <div className="min-h-screen pl-72">
        <Topbar />
        <main className="px-8 py-6">{children}</main>
      </div>
    </div>
  );
}
