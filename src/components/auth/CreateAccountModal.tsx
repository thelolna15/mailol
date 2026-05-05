"use client";

import React, { useState } from "react";
import { UserPlus, Mail, KeyRound, Eye, EyeOff } from "lucide-react";
import { Modal } from "@/components/ui/Modal";
import { useMailStore } from "@/store/useMailStore";

export function CreateAccountModal() {
  const { isCreateModalOpen, setCreateModal, setToken } = useMailStore();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const domain = process.env.NEXT_PUBLIC_DOMAIN || "xneine.site";

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username || !password) {
      setError("Required");
      return;
    }
    
    setError("");
    setLoading(true);

    const emailAddress = `${username}@${domain}`;

    try {
      // 1. Create Account
      const accRes = await fetch("/api/accounts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ address: emailAddress, password }),
      });

      if (!accRes.ok) {
        const errData = await accRes.json();
        throw new Error(errData["hydra:description"] || "Failed to create account");
      }

      // 2. Fetch Token
      const tokenRes = await fetch("/api/token", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ address: emailAddress, password }),
      });

      if (!tokenRes.ok) {
        throw new Error("Failed to login after creation");
      }

      const { token, id } = await tokenRes.json();
      setToken(token);
      useMailStore.getState().saveCredentials(id, emailAddress, password);
      setCreateModal(false);

    } catch (err: any) {
      setError(err.message || "An unexpected error occurred");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal isOpen={isCreateModalOpen} onClose={() => setCreateModal(false)}>
      <div className="flex flex-col items-center">
        <div className="bg-accent-primary w-12 h-12 rounded-full flex justify-center items-center mb-4 shadow-lg shadow-accent-primary/20">
          <UserPlus className="w-6 h-6 text-white" />
        </div>
        
        <h2 className="text-xl font-bold text-primary mb-1">Create an account</h2>
        <p className="text-sm text-secondary text-center mb-6 max-w-[80%]">
          Here you can create a new account for this you need to select a username, then domain and password!
        </p>

        <form onSubmit={handleCreate} className="w-full">
          {/* Email Field */}
          <div className="mb-4">
            <label className="block text-xs font-medium text-secondary mb-1">Email</label>
            <div className={`flex bg-background border ${error ? 'border-status-error' : 'border-surface-border'} rounded-md focus-within:ring-1 focus-within:ring-accent-primary overflow-hidden`}>
              <div className="flex items-center pl-3.5 pr-2 border-r border-surface-border bg-surface text-secondary">
                <Mail className="w-4 h-4" />
              </div>
              <input 
                type="text" 
                placeholder="johndoe"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="flex-1 bg-transparent px-3 py-2 text-sm text-primary focus:outline-none"
              />
              <div className="flex items-center px-3 border-l border-surface-border text-sm text-secondary bg-surface select-none">
                {domain}
              </div>
            </div>
            {error && <p className="text-xs text-status-error mt-1">{error}</p>}
          </div>

          {/* Password Field */}
          <div className="mb-6">
            <label className="block text-xs font-medium text-secondary mb-1">Password</label>
            <div className="flex bg-background border border-surface-border rounded-md focus-within:ring-1 focus-within:ring-accent-primary overflow-hidden">
              <div className="flex items-center px-3.5 border-r border-surface-border bg-surface text-secondary">
                <KeyRound className="w-4 h-4" />
              </div>
              <input 
                type={showPassword ? "text" : "password"} 
                placeholder="••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="flex-1 bg-transparent px-3 py-2 text-sm text-primary focus:outline-none"
              />
              <button 
                type="button" 
                onClick={() => setShowPassword(!showPassword)}
                className="px-3 flex items-center text-secondary hover:text-primary transition-colors cursor-pointer"
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-3 mt-2">
            <button
              type="button"
              onClick={() => setCreateModal(false)}
              className="flex-1 py-2.5 rounded-md bg-surface-border hover:bg-surface-border/80 text-primary text-sm font-medium transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 py-2.5 rounded-md bg-accent-primary hover:bg-accent-hover text-white text-sm font-medium drop-shadow-md transition-colors disabled:opacity-50"
            >
              {loading ? "Creating..." : "Create"}
            </button>
          </div>
        </form>
      </div>
    </Modal>
  );
}
