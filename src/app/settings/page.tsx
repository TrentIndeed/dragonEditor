"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function SettingsPage() {
  const router = useRouter();

  // Change password
  const [currentPw, setCurrentPw] = useState("");
  const [newPw, setNewPw] = useState("");
  const [confirmPw, setConfirmPw] = useState("");
  const [pwLoading, setPwLoading] = useState(false);
  const [pwMessage, setPwMessage] = useState("");
  const [pwError, setPwError] = useState("");

  // Delete account
  const [deleteConfirm, setDeleteConfirm] = useState(false);
  const [deletePw, setDeletePw] = useState("");
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [deleteError, setDeleteError] = useState("");

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPwMessage("");
    setPwError("");

    if (newPw !== confirmPw) {
      setPwError("Passwords don't match");
      return;
    }

    setPwLoading(true);
    try {
      const username = prompt("Enter your username:");
      if (!username) { setPwLoading(false); return; }

      const res = await fetch("/api/auth/change-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, current_password: currentPw, new_password: newPw }),
      });

      if (!res.ok) {
        const data = await res.json();
        setPwError(data.detail || "Failed");
      } else {
        setPwMessage("Password changed successfully");
        setCurrentPw("");
        setNewPw("");
        setConfirmPw("");
      }
    } catch {
      setPwError("Cannot reach server");
    }
    setPwLoading(false);
  };

  const handleDeleteAccount = async () => {
    setDeleteError("");
    setDeleteLoading(true);
    try {
      const username = prompt("Enter your username to confirm deletion:");
      if (!username) { setDeleteLoading(false); return; }

      const res = await fetch("/api/auth/delete-account", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password: deletePw }),
      });

      if (!res.ok) {
        const data = await res.json();
        setDeleteError(data.detail || "Failed");
      } else {
        document.cookie = "dragon_editor_token=; path=/; max-age=0";
        router.push("/login");
      }
    } catch {
      setDeleteError("Cannot reach server");
    }
    setDeleteLoading(false);
  };

  const handleLogout = () => {
    document.cookie = "dragon_editor_token=; path=/; max-age=0";
    router.push("/login");
  };

  return (
    <div className="min-h-screen bg-background p-6 max-w-2xl mx-auto space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Settings</h1>
        <p className="text-sm text-muted-foreground mt-1">Manage your account</p>
      </div>

      {/* Logout */}
      <section className="border border-border rounded-xl p-6">
        <h2 className="text-lg font-semibold text-foreground mb-4">Session</h2>
        <button
          onClick={handleLogout}
          className="px-6 py-2.5 rounded-lg text-sm font-medium text-foreground border border-border hover:bg-muted transition-all"
        >
          Log Out
        </button>
      </section>

      {/* Change Password */}
      <section className="border border-border rounded-xl p-6">
        <h2 className="text-lg font-semibold text-foreground mb-4">Change Password</h2>
        <form onSubmit={handleChangePassword} className="space-y-3 max-w-sm">
          <input type="password" value={currentPw} onChange={(e) => setCurrentPw(e.target.value)} placeholder="Current password"
            className="w-full bg-muted border border-border rounded-lg px-4 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary" />
          <input type="password" value={newPw} onChange={(e) => setNewPw(e.target.value)} placeholder="New password"
            className="w-full bg-muted border border-border rounded-lg px-4 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary" />
          <input type="password" value={confirmPw} onChange={(e) => setConfirmPw(e.target.value)} placeholder="Confirm new password"
            className="w-full bg-muted border border-border rounded-lg px-4 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary" />
          {pwError && <p className="text-sm text-destructive">{pwError}</p>}
          {pwMessage && <p className="text-sm text-green-500">{pwMessage}</p>}
          <button type="submit" disabled={pwLoading || !currentPw || !newPw || !confirmPw}
            className="px-6 py-2.5 rounded-lg text-sm font-semibold text-primary-foreground bg-primary hover:bg-primary/90 disabled:opacity-50 transition-all">
            {pwLoading ? "Changing..." : "Change Password"}
          </button>
        </form>
      </section>

      {/* Danger Zone */}
      <section className="border border-destructive/30 rounded-xl p-6">
        <h2 className="text-lg font-semibold text-destructive mb-2">Danger Zone</h2>
        <p className="text-sm text-muted-foreground mb-4">
          Permanently delete your account. This cannot be undone.
        </p>

        {!deleteConfirm ? (
          <button onClick={() => setDeleteConfirm(true)}
            className="px-6 py-2.5 rounded-lg text-sm font-semibold text-destructive border border-destructive/30 hover:bg-destructive/10 transition-all">
            Delete Account
          </button>
        ) : (
          <div className="space-y-3 max-w-sm">
            <p className="text-sm text-destructive font-medium">Enter your password to confirm:</p>
            <input type="password" value={deletePw} onChange={(e) => setDeletePw(e.target.value)} placeholder="Your password"
              className="w-full bg-muted border border-destructive/30 rounded-lg px-4 py-2.5 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-destructive" />
            {deleteError && <p className="text-sm text-destructive">{deleteError}</p>}
            <div className="flex gap-3">
              <button onClick={handleDeleteAccount} disabled={deleteLoading || !deletePw}
                className="px-6 py-2.5 rounded-lg text-sm font-semibold text-white bg-destructive hover:bg-destructive/90 disabled:opacity-50 transition-all">
                {deleteLoading ? "Deleting..." : "Permanently Delete"}
              </button>
              <button onClick={() => { setDeleteConfirm(false); setDeletePw(""); setDeleteError(""); }}
                className="px-6 py-2.5 rounded-lg text-sm text-muted-foreground border border-border hover:text-foreground transition-all">
                Cancel
              </button>
            </div>
          </div>
        )}
      </section>
    </div>
  );
}
