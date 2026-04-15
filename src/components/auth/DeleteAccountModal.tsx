"use client";

import React, { useState } from "react";
import { TriangleAlert } from "lucide-react";
import { Modal } from "@/components/ui/Modal";
import { useMailStore } from "@/store/useMailStore";

export function DeleteAccountModal() {
  const { isDeleteModalOpen, setDeleteModal, logout, account, token, removeSavedAccount, switchAccount } = useMailStore();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleDelete = async () => {
    if (!account?.id || !token) return;
    
    setLoading(true);
    setError("");

    try {
      const res = await fetch(`/api/accounts/${account.id}`, {
        method: "DELETE",
        headers: { "Authorization": `Bearer ${token}` }
      });

      if (!res.ok && res.status !== 204) {
        throw new Error("Failed to delete account");
      }

      setDeleteModal(false);
      
      const deletedAddress = account.address;
      // 1. Cleans up the dead account natively from Store Memory
      removeSavedAccount(deletedAddress);
      // 2. Destroys the active session
      logout();

      // 3. UX: Attempt an automatic session seamless transfer 
      const remainingAccounts = useMailStore.getState().savedAccounts;
      if (remainingAccounts.length > 0) {
         await switchAccount(remainingAccounts[0].address, remainingAccounts[0].password);
      }

    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "An unexpected error occurred");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal isOpen={isDeleteModalOpen} onClose={() => setDeleteModal(false)}>
      <div className="flex flex-col">
        <div className="flex gap-4">
          <div className="w-10 h-10 shrink-0 rounded-full bg-status-error/10 flex items-center justify-center">
            <TriangleAlert className="w-5.5 h-5.5 text-status-error" />
          </div>
          <div className="flex flex-col mt-0.5">
             <h3 className="text-base font-bold text-primary mb-1.5 tracking-tight">Delete account</h3>
             <p className="text-[14px] text-secondary leading-relaxed pr-2">
               Are you sure you want to delete your account? All your data will be permanently deleted.
             </p>
          </div>
        </div>
        
        {error && <p className="text-xs text-status-error mt-4 ml-14">{error}</p>}

        {/* Buttons right aligned overlay styling matches screenshot context */}
        <div className="flex justify-end gap-3 mt-8 bg-surface border-t border-surface-border -mx-6 -mb-6 p-4 rounded-b-xl">
          <button
            type="button"
            onClick={() => setDeleteModal(false)}
            className="px-5 py-2.5 rounded-md bg-surface-hover bg-opacity-50 hover:bg-surface-border text-primary text-sm font-medium transition-colors"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleDelete}
            disabled={loading}
            className="px-5 py-2.5 rounded-md bg-status-error hover:bg-red-600 text-white text-sm transition-colors disabled:opacity-50 font-bold tracking-wide"
          >
            {loading ? "Deleting..." : "Delete"}
          </button>
        </div>
      </div>
    </Modal>
  );
}
