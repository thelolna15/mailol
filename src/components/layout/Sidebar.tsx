"use client";

import React, { useState, useEffect } from "react";
import { Inbox, RotateCw } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useMailStore } from "@/store/useMailStore";

export function Sidebar() {
  const pathname = usePathname();
  const { messages, token, isSidebarOpen, setSidebarOpen } = useMailStore();
  const [mounted, setMounted] = useState(false);
  
  useEffect(() => {
    // Wrapped in requestAnimationFrame to avoid synchronous setState-in-effect
    requestAnimationFrame(() => setMounted(true));
  }, []);
  
  const messageCount = messages.length;
  const maxMessages = 50;
  const usagePercent = Math.min((messageCount / maxMessages) * 100, 100);

  return (
    <>
      {/* Mobile Overlay */}
      {isSidebarOpen && (
        <div 
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 md:hidden transition-opacity" 
          onClick={() => setSidebarOpen(false)} 
        />
      )}

      {/* Sidebar */}
      <aside className={`fixed inset-y-0 left-0 z-50 w-64 bg-surface border-r border-surface-border flex flex-col h-screen shrink-0 overflow-hidden transform transition-transform duration-300 ease-in-out md:relative md:translate-x-0 ${isSidebarOpen ? "translate-x-0" : "-translate-x-full"}`}>
      {/* Logo Area */}
      <div className="p-6 flex items-center gap-3">
        <div className="bg-accent-primary p-2 rounded-lg">
          <Inbox className="w-5 h-5 text-white" />
        </div>
        <span className="text-xl font-bold bg-linear-to-r from-accent-primary to-purple-400 bg-clip-text text-transparent tracking-wide">
          MaiLoL
        </span>
      </div>

      {/* Primary Navigation */}
      <nav className="flex-1 mt-4 px-3 flex flex-col gap-1">
        <Link
          href="/"
          onClick={() => setSidebarOpen(false)}
          className={`flex items-center gap-3 px-4 py-2.5 rounded-md text-sm font-medium transition-colors ${
            pathname === "/" || pathname?.startsWith("/inbox")
              ? "bg-surface-hover text-primary"
              : "text-secondary hover:text-primary hover:bg-surface-hover/50"
          }`}
        >
          <Inbox className="w-4 h-4" />
          Inbox
        </Link>
        <button
          onClick={() => {
             setSidebarOpen(false);
             window.location.reload();
          }}
          className="flex items-center gap-3 px-4 py-2.5 rounded-md text-sm font-medium text-secondary hover:text-primary hover:bg-surface-hover/50 transition-colors w-full text-left"
        >
          <RotateCw className="w-4 h-4" />
          Refresh
        </button>

      </nav>



      {/* Quota */}
      {mounted && token && (
        <div className="px-4 pb-6 mt-auto">
          <div className="bg-surface-hover/30 border border-white/5 p-3.5 rounded-xl shadow-sm">
             <div className="flex items-center justify-between mb-2.5">
                <span className="text-[11px] font-bold text-primary/70 uppercase tracking-widest drop-shadow-sm">Storage</span>
                <span className="text-xs font-bold text-accent-primary">{messageCount} <span className="text-secondary/70 font-medium">/ {maxMessages}</span></span>
             </div>
             
             <div className="w-full h-2 bg-background border border-surface-border rounded-full overflow-hidden relative mb-2.5">
                <div 
                   className="h-full bg-linear-to-r from-blue-400 to-purple-500 transition-all duration-1000 ease-out absolute left-0 top-0 rounded-full shadow-[0_0_10px_rgba(59,130,246,0.5)]" 
                   style={{ width: `${usagePercent}%` }}
                ></div>
             </div>
             
             <p className="text-[10px] text-secondary text-center leading-relaxed">
                {messageCount >= maxMessages 
                   ? "Inbox full. Oldest mail is auto-deleted." 
                   : `${maxMessages - messageCount} slots remaining.`}
             </p>
          </div>
          
          <div className="text-[11px] text-secondary/50 mt-5 text-center font-medium tracking-widest">
            © {new Date().getFullYear()} MaiLoL
          </div>
        </div>
      )}
    </aside>
    </>
  );
}
