"use client";

import { useState, useEffect, useCallback } from "react";
import { usePlaidLink } from "react-plaid-link";
import { supabase, isPro } from "@/lib/supabase";

type PlaidItem = {
  id: string;
  institution_name: string;
  last_synced_at: string | null;
};

type SyncResult = { added: number; modified: number; removed: number };

type Props = {
  onTransactionsImported?: () => void;
  onUpgradeClick?: () => void;
};

async function getSession() {
  const { data: { session } } = await supabase.auth.getSession();
  return session;
}

function fmtSynced(ts: string | null): string {
  if (!ts) return "never synced";
  const diff = Date.now() - new Date(ts).getTime();
  const mins = Math.floor(diff / 60_000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

export default function PlaidConnect({ onTransactionsImported, onUpgradeClick }: Props) {
  const [items, setItems] = useState<PlaidItem[]>([]);
  const [isProUser, setIsProUser] = useState<boolean | null>(null);
  const [linkToken, setLinkToken] = useState<string | null>(null);
  const [loadingLink, setLoadingLink] = useState(false);
  const [importing, setImporting] = useState(false);
  const [connectResult, setConnectResult] = useState<{ name: string; added: number } | null>(null);
  const [syncingId, setSyncingId] = useState<string | null>(null);
  const [disconnectingId, setDisconnectingId] = useState<string | null>(null);
  const [syncResults, setSyncResults] = useState<Record<string, SyncResult>>({});
  const [error, setError] = useState<string | null>(null);

  // Load connected accounts and Pro status on mount
  useEffect(() => {
    (async () => {
      setIsProUser(await isPro());
      const session = await getSession();
      if (!session) return;
      const res = await fetch("/api/plaid/items", {
        headers: { Authorization: `Bearer ${session.access_token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setItems(data.items ?? []);
      }
    })();
  }, []);

  const handleConnectClick = async () => {
    setLoadingLink(true);
    setError(null);
    setConnectResult(null);
    const session = await getSession();
    if (!session) { setLoadingLink(false); return; }
    const res = await fetch("/api/plaid/create-link-token", {
      method: "POST",
      headers: { Authorization: `Bearer ${session.access_token}` },
    });
    const data = await res.json();
    if (!res.ok) {
      setError(data.error ?? "Failed to initialize bank connection");
      setLoadingLink(false);
      return;
    }
    setLinkToken(data.link_token);
    setLoadingLink(false);
  };


  const onPlaidSuccess = useCallback(async (publicToken: string, metadata: { institution: { name: string; institution_id: string } | null }) => {
    setError(null);
    setConnectResult(null);
    setImporting(true);
    const session = await getSession();
    if (!session) { setImporting(false); return; }
    const institution = metadata.institution;
    const res = await fetch("/api/plaid/exchange-token", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${session.access_token}`,
      },
      body: JSON.stringify({
        public_token: publicToken,
        institution_name: institution?.name ?? "Unknown Bank",
        institution_id: institution?.institution_id ?? "",
      }),
    });
    const data = await res.json();
    setImporting(false);
    setLinkToken(null);
    if (!res.ok) {
      setError(data.error ?? "Failed to import transactions");
      return;
    }
    const newItem: PlaidItem = {
      id: data.item_id,
      institution_name: data.institution_name,
      last_synced_at: new Date().toISOString(),
    };
    setItems((prev) => {
      const exists = prev.find((it) => it.id === newItem.id);
      return exists ? prev.map((it) => it.id === newItem.id ? newItem : it) : [...prev, newItem];
    });
    setSyncResults((prev) => ({ ...prev, [data.item_id]: { added: data.added_count, modified: 0, removed: 0 } }));
    const result = { name: data.institution_name, added: data.added_count };
    setConnectResult(result);
    setTimeout(() => setConnectResult(null), 4000);
    onTransactionsImported?.();
  }, [onTransactionsImported]);

  const { open, ready } = usePlaidLink({
    token: linkToken,
    onSuccess: onPlaidSuccess,
    onExit: () => { setLinkToken(null); setLoadingLink(false); },
  });

  // Auto-open when link token is ready
  useEffect(() => {
    if (ready && linkToken) open();
  }, [ready, linkToken, open]);

  const handleSync = async (itemId: string) => {
    setSyncingId(itemId);
    setError(null);
    const session = await getSession();
    if (!session) { setSyncingId(null); return; }
    const res = await fetch("/api/plaid/sync", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${session.access_token}`,
      },
      body: JSON.stringify({ item_id: itemId }),
    });
    const data = await res.json();
    setSyncingId(null);
    if (!res.ok) { setError(data.error ?? "Sync failed"); return; }
    setSyncResults((prev) => ({ ...prev, [itemId]: data }));
    setItems((prev) => prev.map((it) =>
      it.id === itemId ? { ...it, last_synced_at: new Date().toISOString() } : it,
    ));
    onTransactionsImported?.();
  };

  const handleDisconnect = async (itemId: string, name: string) => {
    if (!confirm(`Disconnect ${name}? Your imported transactions will be kept.`)) return;
    setDisconnectingId(itemId);
    const session = await getSession();
    if (!session) { setDisconnectingId(null); return; }
    await fetch("/api/plaid/disconnect", {
      method: "DELETE",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${session.access_token}`,
      },
      body: JSON.stringify({ item_id: itemId }),
    });
    setDisconnectingId(null);
    setItems((prev) => prev.filter((it) => it.id !== itemId));
    setSyncResults((prev) => { const n = { ...prev }; delete n[itemId]; return n; });
  };

  const btnStyle = (variant: "primary" | "ghost"): React.CSSProperties => ({
    padding: variant === "primary" ? "9px 18px" : "7px 12px",
    borderRadius: 8,
    border: variant === "primary" ? "none" : "1px solid #E2E8F0",
    background: variant === "primary" ? "#047857" : "#ffffff",
    color: variant === "primary" ? "#ffffff" : "#64748B",
    fontSize: 13,
    fontWeight: 700,
    cursor: "pointer",
    fontFamily: "inherit",
    whiteSpace: "nowrap" as const,
  });

  const atFreeLimit = isProUser === false && items.length >= 1;

  return (
    <div style={{ marginBottom: 24 }}>
      <style>{`
        @keyframes plaid-spin { to { transform: rotate(360deg); } }
        @keyframes plaid-slide-in { from { opacity: 0; transform: translateX(12px); } to { opacity: 1; transform: translateX(0); } }
      `}</style>

      {/* Floating toast — success / info */}
      {connectResult && (
        <div style={{
          position: "fixed", top: 24, right: 24, zIndex: 9999,
          maxWidth: 360, padding: "14px 18px", borderRadius: 12,
          background: connectResult.added > 0 ? "#064E3B" : "#78350F",
          color: "#ffffff",
          boxShadow: "0 8px 32px rgba(0,0,0,0.18)",
          display: "flex", alignItems: "flex-start", gap: 12,
          animation: "plaid-slide-in 0.2s ease",
        }}>
          <span style={{ fontSize: 16, flexShrink: 0, marginTop: 1 }}>
            {connectResult.added > 0 ? "✓" : "ℹ"}
          </span>
          <span style={{ fontSize: 13, lineHeight: 1.5, flex: 1 }}>
            {connectResult.added > 0
              ? `Connected! ${connectResult.added} transactions imported from ${connectResult.name}.`
              : `${connectResult.name} connected. No transactions found yet — tap Sync now, or check back in a few minutes.`}
          </span>
          <button
            onClick={() => setConnectResult(null)}
            style={{ background: "none", border: "none", color: "rgba(255,255,255,0.7)", cursor: "pointer", fontSize: 18, padding: 0, flexShrink: 0, lineHeight: 1 }}
          >×</button>
        </div>
      )}

      {/* Floating toast — error */}
      {error && (
        <div style={{
          position: "fixed", top: connectResult ? 92 : 24, right: 24, zIndex: 9999,
          maxWidth: 360, padding: "14px 18px", borderRadius: 12,
          background: "#7F1D1D", color: "#ffffff",
          boxShadow: "0 8px 32px rgba(0,0,0,0.18)",
          display: "flex", alignItems: "flex-start", gap: 12,
          animation: "plaid-slide-in 0.2s ease",
        }}>
          <span style={{ fontSize: 16, flexShrink: 0, marginTop: 1 }}>✕</span>
          <span style={{ fontSize: 13, lineHeight: 1.5, flex: 1 }}>{error}</span>
          <button
            onClick={() => setError(null)}
            style={{ background: "none", border: "none", color: "rgba(255,255,255,0.7)", cursor: "pointer", fontSize: 18, padding: 0, flexShrink: 0, lineHeight: 1 }}
          >×</button>
        </div>
      )}

      {/* Header row */}
      <div style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        gap: 16,
        background: "#F8FAFC",
        border: "1px solid #E2E8F0",
        borderRadius: 12,
        padding: "14px 18px",
        marginBottom: items.length > 0 ? 10 : 0,
        flexWrap: "wrap",
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <span style={{ fontSize: 20 }}>🏦</span>
          <div>
            <div style={{ fontSize: 14, fontWeight: 700, color: "#19181E" }}>
              {items.length === 0 ? "Connect your bank account" : "Connected accounts"}
            </div>
            {items.length === 0 && (
              <div style={{ fontSize: 12, color: "#64748B", marginTop: 1 }}>
                Auto-import transactions via Plaid
              </div>
            )}
          </div>
        </div>

        {importing ? (
          <div style={{ display: "flex", alignItems: "center", gap: 8, color: "#047857", fontSize: 13, fontWeight: 600 }}>
            <span style={{
              display: "inline-block", width: 14, height: 14,
              border: "2px solid #D1FAE5", borderTopColor: "#047857",
              borderRadius: "50%", animation: "plaid-spin 0.8s linear infinite",
            }} />
            Importing transactions…
          </div>
        ) : atFreeLimit ? (
          <button onClick={onUpgradeClick} style={btnStyle("primary")}>
            Upgrade for more →
          </button>
        ) : (
          <button
            onClick={handleConnectClick}
            disabled={loadingLink}
            style={btnStyle("primary")}
          >
            {loadingLink ? "Opening…" : items.length === 0 ? "Connect bank →" : "+ Add account"}
          </button>
        )}
      </div>

      {/* Connected institution list */}
      {items.map((item) => {
        const result = syncResults[item.id];
        const isSyncing = syncingId === item.id;
        const isDisconnecting = disconnectingId === item.id;
        return (
          <div key={item.id} style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 12,
            background: "#ffffff",
            border: "1px solid #E2E8F0",
            borderRadius: 10,
            padding: "12px 16px",
            marginBottom: 6,
            flexWrap: "wrap",
          }}>
            <div style={{ minWidth: 0 }}>
              <div style={{ fontSize: 14, fontWeight: 700, color: "#064E3B" }}>
                {item.institution_name}
              </div>
              <div style={{ fontSize: 12, color: "#94A3B8", marginTop: 2 }}>
                Last synced: {fmtSynced(item.last_synced_at)}
                {result && result.added > 0 && (
                  <span style={{ color: "#059669", marginLeft: 8 }}>
                    ✓ {result.added} imported
                  </span>
                )}
                {result && result.added === 0 && result.modified === 0 && result.removed === 0 && (
                  <span style={{ color: "#94A3B8", marginLeft: 8 }}>up to date</span>
                )}
              </div>
            </div>
            <div style={{ display: "flex", gap: 8, flexShrink: 0 }}>
              <button
                onClick={() => handleSync(item.id)}
                disabled={isSyncing || isDisconnecting}
                style={btnStyle("ghost")}
              >
                {isSyncing ? "Syncing…" : "Sync now"}
              </button>
              <button
                onClick={() => handleDisconnect(item.id, item.institution_name)}
                disabled={isSyncing || isDisconnecting}
                style={{ ...btnStyle("ghost"), color: "#DC2626", borderColor: "#FCA5A5" }}
              >
                {isDisconnecting ? "Removing…" : "Disconnect"}
              </button>
            </div>
          </div>
        );
      })}

      {/* Free plan limit notice */}
      {atFreeLimit && (
        <div style={{ fontSize: 12, color: "#64748B", marginTop: 6, padding: "6px 12px", background: "#F8FAFC", borderRadius: 8, border: "1px solid #E2E8F0" }}>
          Free plan · 1 bank included ·{" "}
          <button
            onClick={onUpgradeClick}
            style={{ background: "none", border: "none", color: "#047857", fontWeight: 700, cursor: "pointer", padding: 0, fontSize: 12, fontFamily: "inherit" }}
          >
            Upgrade to Pro
          </button>
          {" "}for unlimited
        </div>
      )}

    </div>
  );
}
