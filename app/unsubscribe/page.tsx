"use client";

import { useEffect, useState } from "react";

export default function UnsubscribePage() {
  const [status, setStatus] = useState<"pending" | "done" | "error">("pending");

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const u = params.get("u");
    const t = params.get("t");
    if (!u || !t) {
      setStatus("error");
      return;
    }
    fetch("/api/unsubscribe", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ u, t }),
    })
      .then((r) => setStatus(r.ok ? "done" : "error"))
      .catch(() => setStatus("error"));
  }, []);

  return (
    <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "#08080e", color: "#fff", fontFamily: "system-ui, -apple-system, sans-serif", padding: 24, textAlign: "center" }}>
      <div style={{ maxWidth: 380 }}>
        {status === "pending" && <p>Unsubscribing&hellip;</p>}
        {status === "done" && (
          <>
            <h1 style={{ fontSize: 22, marginBottom: 8 }}>You&apos;re unsubscribed</h1>
            <p style={{ color: "rgba(255,255,255,0.6)" }}>
              You won&apos;t receive further email updates from UntilFire. You can still use your account as normal.
            </p>
          </>
        )}
        {status === "error" && (
          <>
            <h1 style={{ fontSize: 22, marginBottom: 8 }}>Something went wrong</h1>
            <p style={{ color: "rgba(255,255,255,0.6)" }}>This unsubscribe link may be invalid or expired.</p>
          </>
        )}
      </div>
    </div>
  );
}
