
"use client";

import type { ReactNode } from "react";
import { SidebarProvider, Sidebar } from "@/components/ui/sidebar";
import { Header } from "@/components/layout/header";
import { MainNav } from "@/components/layout/main-nav";
import { UserProvider } from "@/providers/user-provider";
import { FirebaseErrorListener } from "@/components/layout/firebase-error-listener";

export default function AppLayout({ children }: { children: ReactNode }) {
  return (
    <UserProvider>
      <FirebaseErrorListener />
      <SidebarProvider>
          <div className="flex min-h-screen">
            <Sidebar collapsible="icon">
                <MainNav />
            </Sidebar>
            <div className="flex flex-col flex-1 sm:pl-[calc(var(--sidebar-width-icon))] group-data-[state=expanded]/sidebar:sm:pl-[var(--sidebar-width)] transition-all pt-9">
                <Header />
                <main className="flex-1 p-4 sm:p-6">
                    {children}
                </main>
            </div>
          </div>
      </SidebarProvider>
    </UserProvider>
  );
}
