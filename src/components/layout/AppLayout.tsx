"use client";

import React, { useEffect } from "react";
import { Sidebar } from "./Sidebar";
import { TopBar } from "./TopBar";
import { CreateAccountModal } from "@/components/auth/CreateAccountModal";
import { LoginModal } from "@/components/auth/LoginModal";
import { DeleteAccountModal } from "@/components/auth/DeleteAccountModal";
import { useMailStore } from "@/store/useMailStore";

export function AppLayout({ children }: { children: React.ReactNode }) {
  const { init } = useMailStore();

  useEffect(() => {
    init();
  }, [init]);

  return (
    <div className="flex h-screen w-full bg-background overflow-hidden relative">
      <Sidebar />
      <div className="flex-1 flex flex-col h-screen min-w-0">
        <TopBar />
        <main className="flex-1 overflow-y-auto relative">
          {children}
        </main>
      </div>
      
      {/* Root level mount points for modals */}
      <CreateAccountModal />
      <LoginModal />
      <DeleteAccountModal />
    </div>
  );
}
