"use client";

import React, { useEffect, useState } from "react";
import { ChevronLeft, Loader2, Trash2, Paperclip, Download } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import DOMPurify from "dompurify";
import { useMailStore } from "@/store/useMailStore";
import { Modal } from "@/components/ui/Modal";

interface Attachment {
  filename: string;
  size: number;
  contentType: string;
  index: number;
}

interface MessageDetail {
  id: string;
  from?: { address: string; name: string };
  to?: { address: string; name: string }[];
  subject?: string;
  intro?: string;
  html?: string[];
  text?: string;
  seen: boolean;
  hasAttachments: boolean;
  attachments?: Attachment[];
  createdAt: string;
}

export function EmailViewer() {
  const { selectedId, setSelectedId, token, fetchMessages, markMessageSeen } = useMailStore();
  const [msgDetail, setMsgDetail] = useState<MessageDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  
  useEffect(() => {
    if (!selectedId || !token) return;
    
    setLoading(true);
    fetch(`/api/messages/${selectedId}`, {
       headers: { "Authorization": `Bearer ${token}` }
    })
    .then(r => r.json())
    .then(data => {
       if(data.id) {
         setMsgDetail(data);
         markMessageSeen(data.id);
       }
    })
    .catch(err => console.error(err))
    .finally(() => setLoading(false));

  }, [selectedId, token, markMessageSeen]);

  const handleDelete = async () => {
     if (!selectedId || !token) return;
     
     setIsDeleting(true);
     try {
        await fetch(`/api/messages/${selectedId}`, {
           method: 'DELETE',
           headers: { "Authorization": `Bearer ${token}` }
        });
        
        setShowDeleteConfirm(false);
        setSelectedId(null);
        fetchMessages(); 
     } catch (error) {
        console.error("Failed to delete message", error);
     } finally {
        setIsDeleting(false);
     }
  };

  const handleDownloadAttachment = async (attachment: Attachment) => {
     if (!selectedId || !token) return;
     try {
        const res = await fetch(`/api/messages/${selectedId}/attachments/${attachment.index}`, {
           headers: { "Authorization": `Bearer ${token}` }
        });
        if (!res.ok) throw new Error("Failed to download attachment");
        
        const blob = await res.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = attachment.filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        window.URL.revokeObjectURL(url);
     } catch (err) {
        console.error("Download Error", err);
        alert("Failed to download attachment. It may have expired.");
     }
  };

  if (!selectedId) return null;

  if (loading || !msgDetail) {
     return (
        <div className="p-8 flex items-center justify-center h-full">
           <Loader2 className="w-8 h-8 text-accent-primary animate-spin" />
        </div>
     );
  }

  const getInitials = (name?: string, email?: string) => {
    if (name) return name.charAt(0).toUpperCase();
    if (email) return email.charAt(0).toUpperCase();
    return "U";
  };
  
  const rawHtml = msgDetail.html?.[0] || msgDetail.text || "<p>No content available.</p>";
  
  // Isolate formatting heavily from external vectors
  const cleanHtml = DOMPurify.sanitize(rawHtml, { USE_PROFILES: { html: true } });

  return (
    <div className="p-6 md:p-8 animate-in fade-in slide-in-from-right-4 duration-300 h-full flex flex-col">
      <div className="flex items-center justify-between mb-6">
         <button 
           onClick={() => setSelectedId(null)}
           className="flex items-center gap-2 text-sm text-secondary hover:text-primary transition-all cursor-pointer font-medium hover:-translate-x-1"
         >
           <ChevronLeft className="w-5 h-5" />
           Back to Inbox
         </button>
         
         <button 
           onClick={() => setShowDeleteConfirm(true)} 
           className="flex items-center gap-2 px-4 py-2 rounded-lg bg-surface-border/50 hover:bg-status-error/10 text-secondary hover:text-status-error transition-all shadow-sm border border-transparent hover:border-status-error/20" 
           title="Delete email"
         >
           <Trash2 className="w-4 h-4" />
           <span className="text-sm font-semibold">Delete</span>
         </button>
      </div>
      
      <h1 className="text-xl md:text-2xl font-bold text-primary mb-6 pr-8 leading-tight">
         {msgDetail.subject || "(No Subject provided)"}
      </h1>
      
      {/* HTML Render Native Canvas isolation zone */}
      <div className="flex-1 bg-white text-gray-900 rounded-xl shadow-lg flex flex-col overflow-hidden border border-gray-200">
         
         <div className="border-b border-gray-200 p-5 md:p-6 flex flex-col md:flex-row gap-4 md:items-center justify-between bg-[#fbfcff]">
            <div className="flex items-center gap-3">
               <div className="w-10 h-10 shrink-0 rounded-full bg-slate-800 text-white flex items-center justify-center font-bold shadow-sm">
                  {getInitials(msgDetail.from?.name, msgDetail.from?.address)}
               </div>
               <div className="flex flex-col">
                  <span className="font-semibold text-[15px] tracking-tight">
                     {msgDetail.from?.name ? `${msgDetail.from.name} ` : ''} 
                     <span className="text-gray-500 font-normal">{msgDetail.from?.address}</span>
                  </span>
                  <span className="text-xs text-gray-500 mt-0.5">
                     To: {msgDetail.to?.[0]?.address}
                  </span>
               </div>
            </div>
            <div className="text-xs text-gray-400 shrink-0">
               {formatDistanceToNow(new Date(msgDetail.createdAt), { addSuffix: true })}
            </div>
          </div>

          {/* Attachments Section */}
          {msgDetail.hasAttachments && msgDetail.attachments && msgDetail.attachments.length > 0 && (
             <div className="border-b border-gray-200 p-4 bg-gray-50 flex gap-3 flex-wrap items-center">
                <span className="text-[11px] font-bold text-gray-500 uppercase tracking-widest px-1">Attachments</span>
                {msgDetail.attachments.map((att: Attachment) => (
                   <button 
                      key={att.index}
                      onClick={() => handleDownloadAttachment(att)}
                      className="group flex items-center gap-2 bg-white border border-gray-300 rounded-lg py-1.5 px-3 hover:border-blue-500 hover:shadow-[0_2px_10px_rgba(59,130,246,0.15)] transition-all cursor-pointer"
                      title="Download file"
                   >
                      <Paperclip className="w-3.5 h-3.5 text-gray-400 group-hover:text-blue-500" />
                      <span className="text-[13px] font-medium text-gray-700 max-w-50 truncate">{att.filename}</span>
                      <span className="text-[11px] text-gray-400 ml-0.5">({Math.round(att.size / 1024)} KB)</span>
                      <Download className="w-3.5 h-3.5 text-gray-300 group-hover:text-blue-500 transition-colors ml-1" />
                   </button>
                ))}
             </div>
          )}
          
          <div className="p-6 md:p-8 overflow-y-auto w-full flex-1 email-content-wrapper" style={{ color: '#222' }}>
              <div dangerouslySetInnerHTML={{ __html: cleanHtml }} />
          </div>
      </div>

      {/* Modern Confirmation Modal */}
      <Modal isOpen={showDeleteConfirm} onClose={() => !isDeleting && setShowDeleteConfirm(false)}>
        <div className="flex flex-col items-center text-center">
          <div className="w-16 h-16 rounded-full bg-status-error/10 flex items-center justify-center mb-4">
            <Trash2 className="w-8 h-8 text-status-error" />
          </div>
          <h3 className="text-xl font-bold text-primary mb-2">Delete Message</h3>
          <p className="text-sm text-secondary mb-8">
            Are you sure you want to permanently delete this email? This action cannot be undone.
          </p>
          <div className="flex flex-col sm:flex-row w-full gap-3">
            <button
              onClick={() => setShowDeleteConfirm(false)}
              disabled={isDeleting}
              className="flex-1 py-3 rounded-lg bg-surface-border/50 hover:bg-surface-border text-primary font-medium transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleDelete}
              disabled={isDeleting}
              className="flex-1 py-3 rounded-lg bg-status-error hover:bg-red-600 text-white font-bold transition-all shadow-[0_0_15px_rgba(244,63,94,0.4)] disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {isDeleting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Deleting...
                </>
              ) : (
                "Yes, Delete"
              )}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
