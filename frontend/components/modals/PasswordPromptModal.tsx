"use client";
import { useState } from "react";
import api from "@/lib/api";
import toast from "react-hot-toast";

interface PasswordPromptModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  actionName: string;
}

export default function PasswordPromptModal({
  isOpen,
  onClose,
  onSuccess,
  actionName,
}: PasswordPromptModalProps) {
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!password) {
      toast.error("Password is required.");
      return;
    }

    setLoading(true);
    try {
      await api.post("/auth/verify-password", { password });
      toast.success("Identity verified.");
      setPassword("");
      onSuccess();
    } catch (err: any) {
      toast.error(err.response?.data?.message || "Verification failed. Incorrect password.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
      <div className="bg-surface-1 w-full max-w-sm rounded-2xl border border-white/10 shadow-2xl overflow-hidden flex flex-col">
        <div className="px-5 py-4 border-b border-white/5 flex items-center justify-between bg-white/[0.02]">
          <h2 className="font-semibold text-primary">Security Verification</h2>
          <button onClick={onClose} className="text-muted hover:text-primary transition-colors text-xl leading-none">
            &times;
          </button>
        </div>

        <div className="p-5">
          <p className="text-sm text-muted mb-4">
            Please enter your password to continue with <strong className="text-primary">{actionName}</strong>.
          </p>
          
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <input
                type="password"
                required
                className="input w-full"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter your password"
                autoFocus
              />
            </div>
            
            <div className="flex justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={onClose}
                className="btn-secondary"
                disabled={loading}
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading}
                className="btn-primary"
              >
                {loading ? "Verifying..." : "Verify & Continue"}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
