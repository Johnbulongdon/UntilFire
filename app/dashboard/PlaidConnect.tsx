"use client";

import { useState, useEffect, useCallback } from "react";
import { usePlaidLink } from "react-plaid-link";
import { supabase } from "@/lib/supabase";

type PlaidItem = {
  id: string;
  institution_name: string;
  last_synced_at: string | null;
};

type SyncResult = { added: number; modified: number; removed: number };

type Props = {
  onTransactionsImported?: () => void;
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

export default function PlaidConnect({ onTransactionsImported }: Props) {
  const [items, setItems] = useState<PlaidItem[]>([]);
  const [linkToken, setLinkToken] = useState<string | null>(null);
  const [loadingLink, setLoadingLink] = useState(false);
  const [syncingId, setSyncingId] = useState<string | null>(null);
  const [disconnectingId, setDisconnectingId] = useState<string | null>(null);
  const [syncResults, setSyncResults] = useState<Record<string, SyncResult>>({});
  const [error, setError] = useState<string | null>(null);

  // Load connected accounts on mount
  useEffect(() => {
    (async () => {
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
    const session = await getSession();
    if (!session) return;
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

  return (
    <div style={{ marginBottom: 24 }}>
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
        <button
          onClick={handleConnectClick}
          disabled={loadingLink}
          style={btnStyle("primary")}
        >
          {loadingLink ? "Opening…" : items.length === 0 ? "Connect bank →" : "+ Add account"}
        </button>
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

      {error && (
        <div style={{ fontSize: 13, color: "#DC2626", marginTop: 8, padding: "8px 12px", background: "#FEF2F2", borderRadius: 8, border: "1px solid #FCA5A5" }}>
          {error}
        </div>
      )}
    </div>
  );
}
