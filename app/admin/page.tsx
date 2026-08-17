"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import OverviewTab from "./OverviewTab";
import UsersTab from "./UsersTab";
import EmailsTab from "./EmailsTab";
import SupportTab from "./SupportTab";

type AdminTab = "overview" | "users" | "emails" | "support";

export default function AdminPage() {
  const [status, setStatus] = useState<"checking" | "denied" | "ok">("checking");
  const [token, setToken] = useState<string | null>(null);
  const [tab, setTab] = useState<AdminTab>("overview");

  // The session/email check here is UX only — every /api/admin/* route
  // independently re-verifies the caller against ADMIN_EMAILS server-side
  // (see lib/admin-auth.ts). This just avoids flashing the page contents
  // at someone who's logged in but not an admin.
  useEffect(() => {
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (!session) {
        window.location.href = "/login?next=/admin";
        return;
      }
      setToken(session.access_token);
      try {
        const res = await fetch("/api/admin/overview", {
          headers: { Authorization: `Bearer ${session.access_token}` },
        });
        setStatus(res.ok ? "ok" : "denied");
      } catch {
        setStatus("denied");
      }
    });
  }, []);

  if (status === "checking") return <Centered>Checking access&hellip;</Centered>;
  if (status === "denied") return <Centered>You don&apos;t have access to this page.</Centered>;

  return (
    <div style={{ minHeight: "100vh", background: "#F8FAFC", fontFamily: "Manrope, system-ui, -apple-system, sans-serif" }}>
      <div style={{ maxWidth: 1100, margin: "0 auto", padding: "32px 24px 80px" }}>
        <h1 style={{ fontSize: 24, fontWeight: 800, color: "#19181E", margin: "0 0 4px" }}>UntilFire Admin</h1>
        <p style={{ color: "#64748B", fontSize: 14, margin: "0 0 24px" }}>Operations, users, and email &mdash; internal only.</p>

        <nav style={{ display: "flex", gap: 6, marginBottom: 24, borderBottom: "1px solid #E2E8F0" }}>
          {([
            { key: "overview" as const, label: "Overview" },
            { key: "users" as const, label: "Users" },
            { key: "emails" as const, label: "Emails" },
            { key: "support" as const, label: "Support" },
          ]).map((t) => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              style={{
                padding: "10px 16px",
                background: "none",
                border: "none",
                borderBottom: tab === t.key ? "2px solid #059669" : "2px solid transparent",
                color: tab === t.key ? "#059669" : "#64748B",
                fontWeight: 700,
                fontSize: 14,
                cursor: "pointer",
                fontFamily: "inherit",
              }}
            >
              {t.label}
            </button>
          ))}
        </nav>

        {token && tab === "overview" && <OverviewTab token={token} />}
        {token && tab === "users" && <UsersTab token={token} />}
        {token && tab === "emails" && <EmailsTab token={token} />}
        {token && tab === "support" && <SupportTab token={token} />}
      </div>
    </div>
  );
}

function Centered({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "Manrope, system-ui, -apple-system, sans-serif", color: "#64748B" }}>
      {children}
    </div>
  );
}
