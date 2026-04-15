"use client";

import React from "react";
import { ChevronRight } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { useMailStore } from "@/store/useMailStore";

export function EmailList() {
  const { messages, setSelectedId } = useMailStore();

  const getInitials = (name: string, email: string) => {
    if (name) return name.charAt(0).toUpperCase();
    if (email) return email.charAt(0).toUpperCase();
    return "U";
  };

  const getColorClass = (char: string) => {
     const colors = ["bg-blue-500", "bg-purple-500", "bg-green-500", "bg-yellow-500", "bg-red-500", "bg-pink-500", "bg-indigo-500"];
     const code = char.charCodeAt(0) || 0;
     return colors[code % colors.length];
  };

  return (
    <div className="p-6 md:p-8 animate-in fade-in duration-300 min-h-full">
      <h1 className="text-2xl md:text-3xl font-bold text-primary mb-6 tracking-tight">Inbox</h1>
      
      <div className="bg-surface rounded-xl border border-surface-border flex flex-col overflow-hidden shadow-sm">
        {messages.map((msg) => {
           const initial = getInitials(msg.from?.name, msg.from?.address);
           const bgClass = getColorClass(initial);

           return (
            <div 
              key={msg.id}
              onClick={() => setSelectedId(msg.id)}
              className="flex items-start md:items-center gap-4 p-4 border-b border-surface-border last:border-0 hover:bg-surface-hover cursor-pointer transition-colors group"
            >
              <div className="shrink-0 relative mt-1 md:mt-0">
                <div className={`w-10 h-10 rounded-full flex items-center justify-center text-white font-bold text-sm shadow-sm ${bgClass}`}>
                  {initial}
                </div>
                {!msg.seen && (
                  <span className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 border-2 border-surface bg-status-unread rounded-full"></span>
                )}
              </div>
              
              <div className="flex-1 min-w-0 flex flex-col md:flex-row md:items-center gap-1 md:gap-4 overflow-hidden">
                 <div className="md:w-[32%] shrink-0 flex flex-col">
                    <span className="text-accent-primary font-medium text-sm truncate">
                       {msg.from?.name || (msg.from?.address?.split('@')[0]) || "Unknown Sender"}
                    </span>
                    <span className="text-xs text-secondary truncate">{msg.from?.address}</span>
                 </div>
                 
                 <div className="flex-1 min-w-0 flex flex-col mt-0.5 md:mt-0">
                    <span className={`text-[15px] truncate ${!msg.seen ? 'font-semibold text-primary' : 'font-medium text-primary'}`}>
                       {msg.subject || "(No Subject)"}
                    </span>
                    <span className="text-sm text-secondary truncate mt-0.5">{msg.intro || "..."}</span>
                 </div>
              </div>
              
              <div className="shrink-0 flex flex-col items-end justify-center gap-2 ml-2 pl-4">
                 <span className="text-[11px] text-secondary hidden md:block opacity-60">
                   {formatDistanceToNow(new Date(msg.createdAt), { addSuffix: true })}
                 </span>
                 <ChevronRight className="w-5 h-5 text-surface-border group-hover:text-secondary group-hover:-translate-x-0.5 transition-all" />
              </div>
            </div>
           );
        })}
      </div>
    </div>
  );
}
