"use client";

import { useEffect, useState } from "react";

interface AdminUser {
  id: string;
  email: string;
  displayName: string | null;
  createdAt: string;
  lastSignInAt: string | null;
  plan: string;
  unsubscribed: boolean;
}

export default function UsersTab({ token }: { token: string }) {
  const [users, setUsers] = useState<AdminUser[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [confirmText, setConfirmText] = useState("");

  function load() {
    fetch("/api/admin/users", { headers: { Authorization: `Bearer ${token}` } })
      .then((r) => r.json())
      .then((d) => (d.error ? setError(d.error) : setUsers(d.users)))
      .catch(() => setError("Failed to load"));
  }

  useEffect(load, [token]);

  async function togglePro(u: AdminUser) {
    setBusyId(u.id);
    await fetch(`/api/admin/users/${u.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({ pro: u.plan !== "pro" }),
    });
    setBusyId(null);
    load();
  }

  async function confirmDelete(u: AdminUser) {
    if (confirmText !== u.email) return;
    setBusyId(u.id);
    await fetch(`/api/admin/users/${u.id}`, { method: "DELETE", headers: { Authorization: `Bearer ${token}` } });
    setBusyId(null);
    setConfirmDeleteId(null);
    setConfirmText("");
    load();
  }

  if (error) return <p style={{ color: "#DC2626" }}>{error}</p>;
  if (!users) return <p style={{ color: "#64748B" }}>Loading&hellip;</p>;

  return (
    <div style={{ background: "#fff", border: "1px solid #E2E8F0", borderRadius: 12, overflow: "auto" }}>
      <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
        <thead>
          <tr style={{ background: "#F8FAFC", textAlign: "left" }}>
            {["Email", "Joined", "Last seen", "Plan", "Marketing", "Actions"].map((h) => (
              <th key={h} style={{ padding: "10px 14px", fontWeight: 700, color: "#64748B", fontSize: 11, textTransform: "uppercase", whiteSpace: "nowrap" }}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {users.map((u) => (
            <tr key={u.id} style={{ borderTop: "1px solid #F1F5F9" }}>
              <td style={{ padding: "10px 14px" }}>{u.email}{u.displayName ? ` (${u.displayName})` : ""}</td>
              <td style={{ padding: "10px 14px", color: "#64748B", whiteSpace: "nowrap" }}>{new Date(u.createdAt).toLocaleDateString()}</td>
              <td style={{ padding: "10px 14px", color: "#64748B", whiteSpace: "nowrap" }}>{u.lastSignInAt ? new Date(u.lastSignInAt).toLocaleDateString() : "—"}</td>
              <td style={{ padding: "10px 14px" }}>
                <span style={{ fontWeight: 700, color: u.plan === "pro" ? "#059669" : "#94A3B8" }}>{u.plan === "pro" ? "Pro" : "Free"}</span>
              </td>
              <td style={{ padding: "10px 14px", color: u.unsubscribed ? "#DC2626" : "#94A3B8", whiteSpace: "nowrap" }}>{u.unsubscribed ? "Unsubscribed" : "Subscribed"}</td>
              <td style={{ padding: "10px 14px" }}>
                <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
                  <button disabled={busyId === u.id} onClick={() => togglePro(u)} style={btnStyle}>
                    {u.plan === "pro" ? "Revoke Pro" : "Grant Pro"}
                  </button>
                  {confirmDeleteId === u.id ? (
                    <>
                      <input
                        value={confirmText}
                        onChange={(e) => setConfirmText(e.target.value)}
                        placeholder="type email to confirm"
                        style={{ fontSize: 12, padding: "5px 8px", border: "1px solid #E2E8F0", borderRadius: 6, fontFamily: "inherit" }}
                      />
                      <button
                        disabled={confirmText !== u.email || busyId === u.id}
                        onClick={() => confirmDelete(u)}
                        style={{ ...btnStyle, color: "#fff", background: "#DC2626", borderColor: "#DC2626", opacity: confirmText === u.email ? 1 : 0.5 }}
                      >
                        Confirm delete
                      </button>
                      <button onClick={() => { setConfirmDeleteId(null); setConfirmText(""); }} style={btnStyle}>Cancel</button>
                    </>
                  ) : (
                    <button onClick={() => setConfirmDeleteId(u.id)} style={{ ...btnStyle, color: "#DC2626" }}>Delete</button>
                  )}
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

const btnStyle: React.CSSProperties = {
  fontSize: 12,
  fontWeight: 700,
  padding: "6px 10px",
  borderRadius: 6,
  border: "1px solid #E2E8F0",
  background: "#fff",
  cursor: "pointer",
  fontFamily: "inherit",
  whiteSpace: "nowrap",
};
