"use client";

import React, { useEffect, useState } from "react";
import { Forward, MailPlus, X } from "lucide-react";
import { Modal } from "@/components/ui/Modal";
import { useMailStore } from "@/store/useMailStore";

const gmailRegex = /^[^\s@]+@gmail\.com$/i;

export function ForwardingModal() {
  const { isForwardingModalOpen, setForwardingModal, token, account } = useMailStore();
  const [recipients, setRecipients] = useState<string[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!isForwardingModalOpen || !token) return;

    let ignore = false;
    setLoading(true);
    setError("");

    fetch("/api/forwarding", {
      headers: { "Authorization": `Bearer ${token}` }
    })
      .then(async (res) => {
        if (!res.ok) throw new Error("Failed to load forwarding");
        return res.json();
      })
      .then((data) => {
        if (!ignore) setRecipients(Array.isArray(data.recipients) ? data.recipients : []);
      })
      .catch((err) => {
        if (!ignore) setError(err.message || "Failed to load forwarding");
      })
      .finally(() => {
        if (!ignore) setLoading(false);
      });

    return () => {
      ignore = true;
    };
  }, [isForwardingModalOpen, token]);

  const addRecipient = () => {
    const value = input.trim().toLowerCase();
    if (!value) return;
    if (!gmailRegex.test(value)) {
      setError("Only gmail.com addresses are allowed.");
      return;
    }
    if (recipients.includes(value)) {
      setInput("");
      setError("");
      return;
    }
    if (recipients.length >= 10) {
      setError("Maximum 10 Gmail addresses.");
      return;
    }

    setRecipients([...recipients, value]);
    setInput("");
    setError("");
  };

  const removeRecipient = (recipient: string) => {
    setRecipients(recipients.filter((item) => item !== recipient));
  };

  const saveRecipients = async () => {
    if (!token) return;

    setSaving(true);
    setError("");

    try {
      const res = await fetch("/api/forwarding", {
        method: "PUT",
        headers: {
          "Authorization": `Bearer ${token}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ recipients })
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data["hydra:description"] || data.message || "Failed to save forwarding");
      }

      const data = await res.json();
      setRecipients(Array.isArray(data.recipients) ? data.recipients : []);
      setForwardingModal(false);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to save forwarding");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal isOpen={isForwardingModalOpen} onClose={() => setForwardingModal(false)}>
      <div className="flex flex-col items-center">
        <div className="bg-accent-primary w-12 h-12 rounded-full flex justify-center items-center mb-4 shadow-lg shadow-accent-primary/20">
          <Forward className="w-6 h-6 text-white" />
        </div>

        <h2 className="text-xl font-bold text-primary mb-1">Forwarding</h2>
        <p className="text-sm text-secondary text-center mb-6 max-w-full truncate" title={account?.address}>
          {account?.address || "Temp account"}
        </p>

        <div className="w-full">
          <label className="block text-xs font-medium text-secondary mb-1">Gmail recipient</label>
          <div className={`flex bg-background border ${error ? "border-status-error" : "border-surface-border"} rounded-md focus-within:ring-1 focus-within:ring-accent-primary overflow-hidden`}>
            <div className="flex items-center pl-3.5 pr-2 border-r border-surface-border bg-surface text-secondary">
              <MailPlus className="w-4 h-4" />
            </div>
            <input
              type="email"
              inputMode="email"
              placeholder="name@gmail.com"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  addRecipient();
                }
              }}
              className="flex-1 min-w-0 bg-transparent px-3 py-2 text-sm text-primary focus:outline-none"
            />
            <button
              type="button"
              onClick={addRecipient}
              className="px-3 flex items-center text-secondary hover:text-primary transition-colors cursor-pointer"
              title="Add recipient"
            >
              <MailPlus className="w-4 h-4" />
            </button>
          </div>
          {error && <p className="text-xs text-status-error mt-1">{error}</p>}
        </div>

        <div className="w-full mt-4 min-h-24 max-h-48 overflow-y-auto custom-scrollbar rounded-md border border-surface-border bg-background/50">
          {loading ? (
            <div className="px-3 py-3 text-sm text-secondary">Loading...</div>
          ) : recipients.length === 0 ? (
            <div className="px-3 py-3 text-sm text-secondary">No recipients</div>
          ) : (
            recipients.map((recipient) => (
              <div key={recipient} className="flex items-center gap-2 px-3 py-2 border-b border-surface-border last:border-b-0">
                <span className="min-w-0 flex-1 truncate text-sm text-primary" title={recipient}>{recipient}</span>
                <button
                  type="button"
                  onClick={() => removeRecipient(recipient)}
                  className="p-1.5 rounded-md text-secondary hover:text-status-error hover:bg-surface-hover transition-colors"
                  title="Remove recipient"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            ))
          )}
        </div>

        <div className="flex gap-3 mt-6 w-full">
          <button
            type="button"
            onClick={() => setForwardingModal(false)}
            className="flex-1 py-2.5 rounded-md bg-surface-border hover:bg-surface-border/80 text-primary text-sm font-medium transition-colors"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={saveRecipients}
            disabled={saving || loading}
            className="flex-1 py-2.5 rounded-md bg-accent-primary hover:bg-accent-hover text-white text-sm font-medium drop-shadow-md transition-colors disabled:opacity-50"
          >
            {saving ? "Saving..." : "Save"}
          </button>
        </div>
      </div>
    </Modal>
  );
}
