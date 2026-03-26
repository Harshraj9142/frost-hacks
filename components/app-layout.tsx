"use client";

import { usePathname } from "next/navigation";
import { Sidebar } from "@/components/sidebar";
import { Navbar } from "@/components/navbar";
import { MobileNav } from "@/components/mobile-nav";

export function AppLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isAuthOrLanding = pathname === "/" || pathname.includes("/auth");

  if (isAuthOrLanding) {
    return (
      <div className="flex-1 flex flex-col min-w-0">
        <main className="flex-1 relative">{children}</main>
      </div>
    );
  }

  return (
    <>
      <Sidebar />
      <div className="flex-1 flex flex-col min-w-0 md:ml-64">
        <Navbar />
        <main className="flex-1 relative">{children}</main>
        <MobileNav />
      </div>
    </>
  );
}
