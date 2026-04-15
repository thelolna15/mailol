"use client";

import React, { useState } from "react";
import { LogIn, KeyRound, Mail, Eye, EyeOff } from "lucide-react";
import { Modal } from "@/components/ui/Modal";
import { useMailStore } from "@/store/useMailStore";

export function LoginModal() {
  const { isLoginModalOpen, setLoginModal, setToken } = useMailStore();
  const [address, setAddress] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!address || !password) {
      setError("Required");
      return;
    }
    
    setError("");
    setLoading(true);

    try {
      const res = await fetch("/api/token", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ address, password }),
      });

      if (!res.ok) {
        throw new Error("Invalid credentials");
      }

      const { token, id } = await res.json();
      setToken(token);
      useMailStore.getState().saveCredentials(id, address, password);
      setLoginModal(false);

    } catch (err: any) {
      setError(err.message || "An unexpected error occurred");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal isOpen={isLoginModalOpen} onClose={() => setLoginModal(false)}>
      <div className="flex flex-col items-center">
        <div className="bg-transparent border-2 border-surface-border w-12 h-12 rounded-full flex justify-center items-center mb-4">
          <LogIn className="w-5 h-5 text-secondary" />
        </div>
        
        <h2 className="text-xl font-bold text-primary mb-1">Log in to your account</h2>
        <p className="text-sm text-secondary text-center mb-6 max-w-[80%]">
          Here you can log in to your existing account
        </p>

        <form onSubmit={handleLogin} className="w-full">
          {/* Email Field */}
          <div className="mb-4">
            <label className="block text-xs font-medium text-secondary mb-1">Email</label>
            <div className={`flex bg-background border ${error ? 'border-status-error' : 'border-surface-border'} rounded-md focus-within:ring-1 focus-within:ring-accent-primary overflow-hidden`}>
              <div className="flex items-center pl-3.5 pr-2 border-r border-surface-border bg-surface text-secondary">
                <Mail className="w-4 h-4" />
              </div>
              <input 
                type="text" 
                placeholder="test@test.com"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                className="flex-1 bg-transparent px-3 py-2 text-sm text-primary focus:outline-none"
              />
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
              onClick={() => setLoginModal(false)}
              className="flex-1 py-2.5 rounded-md bg-surface-border hover:bg-surface-border/80 text-primary text-sm font-medium transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 py-2.5 rounded-md bg-accent-primary hover:bg-accent-hover text-white text-sm font-medium drop-shadow-md transition-colors disabled:opacity-50"
            >
              {loading ? "Logging in..." : "Login"}
            </button>
          </div>
        </form>
      </div>
    </Modal>
  );
}
