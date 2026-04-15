"use client";

import React, { useState, useEffect, useRef } from "react";
import { Sun, Moon, LogOut, UserPlus, LogIn, Trash2, Copy, Check } from "lucide-react";
import { useMailStore } from "@/store/useMailStore";
import { motion, AnimatePresence } from "framer-motion";

export function TopBar() {
  const [theme, setTheme] = useState("dark");
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [copied, setCopied] = useState(false);
  const [mounted, setMounted] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  
  const { account, token, logout, setLoginModal, setCreateModal, setDeleteModal, savedAccounts, switchAccount, removeSavedAccount, messages } = useMailStore();
  
  const hasUnread = messages.some((m) => !m.seen);

  useEffect(() => {
    // Deferred to avoid synchronous setState-in-effect cascading render
    requestAnimationFrame(() => {
      setMounted(true);
      if (localStorage.getItem("theme") === "light" || document.documentElement.classList.contains("light")) {
        setTheme("light");
        document.documentElement.classList.remove("dark");
        document.documentElement.classList.add("light");
      } else {
        setTheme("dark");
        document.documentElement.classList.add("dark");
      }
    });
  }, []);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const toggleTheme = () => {
    if (theme === "dark") {
      document.documentElement.classList.remove("dark");
      document.documentElement.classList.add("light");
      setTheme("light");
      localStorage.setItem("theme", "light");
    } else {
      document.documentElement.classList.remove("light");
      document.documentElement.classList.add("dark");
      setTheme("dark");
      localStorage.setItem("theme", "dark");
    }
  };

  const handleLogout = async () => {
     const loggedOutAddress = account?.address;
     logout();
     setDropdownOpen(false);
     
     if (loggedOutAddress) {
        removeSavedAccount(loggedOutAddress);
     }
     
      // Fallback seamlessly if we have remaining saved accounts
      const remainingAccounts = useMailStore.getState().savedAccounts;
      if (remainingAccounts.length > 0) {
         const fallback = remainingAccounts.find(a => a.password);
         if (fallback) {
            await switchAccount(fallback.address, fallback.password);
         }
      }
   };

   const handleCopy = () => {
      if (account?.address) {
         navigator.clipboard.writeText(account.address);
         setCopied(true);
         setTimeout(() => setCopied(false), 2000);
      }
   };

  const initial = account?.address ? account.address.charAt(0).toUpperCase() : "U";
  const activeSavedAcc = savedAccounts.find(a => a.address === account?.address);

  return (
    <header className="h-16 bg-background border-b border-surface-border flex items-center justify-between px-4 md:px-6 sticky top-0 z-20 shrink-0">
      {/* Left side: Active Email */}
      <div className="flex items-center gap-3">
        <div className="text-secondary hidden md:block">
          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <rect width="20" height="16" x="2" y="4" rx="2" />
            <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" />
          </svg>
        </div>
        <button 
           onClick={handleCopy}
           className="flex items-center gap-2 px-3 py-1.5 rounded-full hover:bg-surface-hover/50 text-[14px] md:text-[15px] font-medium text-primary tracking-wide transition-all group cursor-pointer active:scale-95"
           title="Copy Address"
        >
          {mounted ? (account?.address || "Awaiting Login ...") : "Awaiting Login ..."}
          {mounted && account?.address && (
             copied 
               ? <Check className="w-4 h-4 text-status-success ml-1" /> 
               : <Copy className="w-4 h-4 text-secondary group-hover:text-primary transition-colors ml-1" />
          )}
        </button>
      </div>

      {/* Right side: Actions */}
      <div className="flex items-center gap-1 md:gap-2 relative">
        <button onClick={toggleTheme} className="p-2 rounded-full text-secondary hover:text-primary hover:bg-surface-hover/80 transition-colors" title="Toggle Theme">
          {theme === "dark" ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
        </button>

        {/* Profile Dropdown Container */}
        <div className="relative ml-1" ref={dropdownRef}>
          <button 
            onClick={() => setDropdownOpen(!dropdownOpen)}
            className="w-8 h-8 rounded-full bg-surface-border/80 flex items-center justify-center font-bold text-sm text-primary hover:ring-2 hover:ring-accent-primary transition-all cursor-pointer relative"
          >
            {mounted ? initial : "U"}
            {mounted && token && hasUnread && <span className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-status-unread border-2 border-background rounded-full"></span>}
          </button>

          {/* Dropdown Menu */}
          <AnimatePresence>
          {dropdownOpen && (
            <motion.div 
              initial={{ opacity: 0, y: -10, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -10, scale: 0.95 }}
              transition={{ duration: 0.2, ease: "easeOut" }}
              className="absolute right-0 top-12 w-72 bg-surface/90 backdrop-blur-xl border border-white/5 rounded-xl shadow-2xl py-2 z-50 origin-top-right"
            >
              {token ? (
                <>
                  <div className="px-4 py-3 border-b border-surface-border bg-surface-hover/30">
                    <p className="text-xs text-secondary mb-1">You are signed in as:</p>
                    <p className="text-[15px] font-semibold text-primary truncate mb-1.5 tracking-tight" title={account?.address}>{account?.address}</p>
                    <div className="flex items-center gap-1.5 text-sm text-secondary">
                        <span className="text-[13px] font-medium">Password:</span>
                        <span 
                           className={`font-mono text-primary cursor-pointer select-all transition-all duration-200 bg-background/50 px-1 rounded ${!showPassword ? 'blur-xs hover:blur-[2px]' : ''}`}
                           onClick={(e) => {
                              e.stopPropagation();
                              setShowPassword(!showPassword);
                           }}
                           title="Click to reveal"
                        >
                           {activeSavedAcc?.password || "unknown"}
                        </span>
                    </div>
                  </div>
                  
                  {/* Account Switcher List */}
                  {savedAccounts.filter(a => a.address !== account?.address).length > 0 && (
                     <div className="py-2 border-b border-surface-border max-h-48 overflow-y-auto custom-scrollbar">
                        {savedAccounts.filter(a => a.address !== account?.address).map(acc => {
                           const accInitial = acc.address.charAt(0).toUpperCase();
                           const colors = ["bg-blue-500", "bg-purple-500", "bg-green-500", "bg-yellow-500", "bg-red-500"];
                           const bgC = colors[accInitial.charCodeAt(0) % colors.length];

                           return (
                              <button 
                                 key={acc.address}
                                 onClick={() => {
                                    setDropdownOpen(false);
                                    switchAccount(acc.address, acc.password);
                                 }}
                                 className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-surface-hover transition-colors text-left group"
                              >
                                 <div className={`w-7 h-7 rounded-full flex items-center justify-center text-white text-xs font-bold ${bgC}`}>
                                    {accInitial}
                                 </div>
                                 <span className="text-[14px] font-medium text-secondary truncate group-hover:text-primary transition-colors">
                                    {acc.address}
                                 </span>
                              </button>
                           )
                        })}
                     </div>
                  )}

                  <div className="py-2">
                    <button onClick={() => { setCreateModal(true); setDropdownOpen(false); }} className="w-full flex items-center gap-3 px-4 py-2.5 text-[14px] text-blue-500 hover:bg-surface-hover transition-colors text-left tracking-wide">
                      <UserPlus className="w-4.5 h-4.5" />
                      Create an account
                    </button>
                    <button onClick={() => { setLoginModal(true); setDropdownOpen(false); }} className="w-full flex items-center gap-3 px-4 py-2.5 text-[14px] text-blue-500 hover:bg-surface-hover transition-colors text-left tracking-wide">
                      <LogIn className="w-4.5 h-4.5" />
                      Login
                    </button>
                    <button onClick={() => { setDeleteModal(true); setDropdownOpen(false); }} className="w-full flex items-center gap-3 px-4 py-2.5 text-[14px] text-status-error hover:bg-surface-hover transition-colors text-left tracking-wide">
                      <Trash2 className="w-4.5 h-4.5" />
                      Delete account
                    </button>
                  </div>
                </>
              ) : (
                <div className="py-2">
                  <button onClick={() => { setCreateModal(true); setDropdownOpen(false); }} className="w-full flex items-center gap-3 px-4 py-2.5 text-[14px] text-blue-500 hover:bg-surface-hover transition-colors text-left tracking-wide">
                    <UserPlus className="w-4.5 h-4.5" />
                    Create an account
                  </button>
                  <button onClick={() => { setLoginModal(true); setDropdownOpen(false); }} className="w-full flex items-center gap-3 px-4 py-2.5 text-[14px] text-blue-500 hover:bg-surface-hover transition-colors text-left tracking-wide">
                    <LogIn className="w-4.5 h-4.5" />
                    Login
                  </button>
                </div>
              )}
            </motion.div>
          )}
          </AnimatePresence>
        </div>

        {mounted && token && (
           <button onClick={handleLogout} className="p-2.5 rounded-full text-secondary hover:text-primary hover:bg-surface-hover/80 transition-colors ml-1 hidden md:block" title="Logout">
              <LogOut className="w-5 h-5" />
           </button>
        )}
      </div>
    </header>
  );
}
