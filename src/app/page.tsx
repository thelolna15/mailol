"use client";

import React from "react";
import { useMailStore } from "@/store/useMailStore";
import { EmailList } from "@/components/mail/EmailList";
import { EmailViewer } from "@/components/mail/EmailViewer";
import { motion } from "framer-motion";

export default function Home() {
  const { messages, selectedId, token, setCreateModal, setLoginModal } = useMailStore();
  const [mounted, setMounted] = React.useState(false);

  React.useEffect(() => {
     setMounted(true);
  }, []);
  
  if (selectedId) {
     return <EmailViewer />;
  }
  
  if (messages.length > 0) {
     return <EmailList />;
  }

  // Null Routing Default empty state behavior
  return (
    <div className="relative flex flex-col items-center justify-center h-full p-8 text-center min-h-125 overflow-hidden">
      
      <motion.div 
         initial={{ opacity: 0, filter: "blur(10px)", y: 20 }}
         animate={{ opacity: 1, filter: "blur(0px)", y: 0 }}
         transition={{ duration: 0.8, ease: "easeOut" }}
         className="relative z-10 w-full flex flex-col items-center"
      >
        <h1 className="text-3xl md:text-5xl font-extrabold mb-6 tracking-tight bg-clip-text text-transparent bg-linear-to-r from-blue-400 to-purple-500 drop-shadow-lg">
          {(!mounted || !token) ? "Welcome to MaiLoL" : "Temp Mail"}
        </h1>
        
        {mounted && token && (
           <div className="relative mb-8 flex justify-center animate-in fade-in zoom-in duration-500">
             <div className="w-32 h-32 md:w-48 md:h-48 bg-surface-hover rounded-full flex items-center justify-center opacity-70">
               <svg xmlns="http://www.w3.org/2000/svg" width="96" height="96" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round" className="text-accent-primary drop-shadow-md w-16 md:w-24">
                 <path d="M21.2 8.4c.5.38.8.97.8 1.6v10a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V10a2 2 0 0 1 .8-1.6l8-6a2 2 0 0 1 2.4 0l8 6Z"/>
                 <path d="m22 10-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 10"/>
               </svg>
             </div>
           </div>
        )}
        
        <p className="max-w-lg text-secondary leading-relaxed mx-auto text-[15px] backdrop-blur-xl bg-background/40 p-4 rounded-2xl border border-white/5">
          Use our free temporary disposable email service to protect your personal email address from spam, bots, phishing, and other online abuse. Get a secure, instant, and fast temporary email now.
        </p>

        {mounted && !token && (
           <motion.div 
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.2 }}
              className="flex flex-col sm:flex-row items-center justify-center gap-4 mt-10"
           >
              <motion.button 
                 whileHover={{ scale: 1.03 }}
                 whileTap={{ scale: 0.97 }}
                 onClick={() => setCreateModal(true)} 
                 className="px-8 py-3.5 bg-accent-primary text-white text-[15px] font-bold rounded-xl shadow-[0_0_30px_rgba(59,130,246,0.4)] hover:shadow-[0_0_40px_rgba(59,130,246,0.6)] hover:bg-blue-500 transition-colors w-full sm:w-auto backdrop-blur-md"
              >
                 Create an account
              </motion.button>
              <motion.button 
                 whileHover={{ scale: 1.03 }}
                 whileTap={{ scale: 0.97 }}
                 onClick={() => setLoginModal(true)} 
                 className="px-8 py-3.5 bg-surface/50 border border-surface-border text-primary text-[15px] font-bold rounded-xl hover:bg-surface-hover transition-colors w-full sm:w-auto backdrop-blur-md"
              >
                 Login Existing
              </motion.button>
           </motion.div>
        )}
      </motion.div>
    </div>
  );
}
