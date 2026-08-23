"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { usePlaidLink } from "react-plaid-link";
import { trackHysaEmptyStateCtaClicked } from "@/lib/analytics";
import { isPro, supabase } from "@/lib/supabase";

type PlaidItem = {
  id: string;
  institution_name: string;
  institution_logo: string | null;
  institution_color: string | null;
  last_synced_at: string | null;
};

type SyncResult = { added: number; modified: number; removed: number };

type Props = {
  onTransactionsImported?: () => void;
  onUpgradeClick?: () => void;
};

async function getSession() {
  const {
    data: { session },
  } = await supabase.auth.getSession();
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
  const [itemsLoaded, setItemsLoaded] = useState(false);
  const [isProUser, setIsProUser] = useState<boolean | null>(null);
  const [linkToken, setLinkToken] = useState<string | null>(null);
  const [loadingLink, setLoadingLink] = useState(false);
  const [importing, setImporting] = useState(false);
  const [connectResult, setConnectResult] = useState<{ name: string; added: number } | null>(null);
  const [syncingId, setSyncingId] = useState<string | null>(null);
  const [disconnectingId, setDisconnectingId] = useState<string | null>(null);
  const [syncResults, setSyncResults] = useState<Record<string, SyncResult>>({});
  const [error, setError] = useState<string | null>(null);
  const [selectedItemId, setSelectedItemId] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      setIsProUser(await isPro());
      const session = await getSession();
      if (!session) {
        setItemsLoaded(true);
        return;
      }
      const res = await fetch("/api/plaid/items", {
        headers: { Authorization: `Bearer ${session.access_token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setItems(data.items ?? []);
      }
      setItemsLoaded(true);
    })();
  }, []);

  const handleConnectClick = async () => {
    if (items.length === 0) {
      trackHysaEmptyStateCtaClicked({
        cta: 'connect_account',
        destination: 'plaid_connect',
      });
    }
    setLoadingLink(true);
    setError(null);
    setConnectResult(null);
    const session = await getSession();
    if (!session) {
      setLoadingLink(false);
      return;
    }
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

  const onPlaidSuccess = useCallback(
    async (
      publicToken: string,
      metadata: { institution: { name: string; institution_id: string } | null },
    ) => {
      setError(null);
      setConnectResult(null);
      setImporting(true);
      const session = await getSession();
      if (!session) {
        setImporting(false);
        return;
      }
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
      setItems((prev) => {
        const existing = prev.find((it) => it.id === data.item_id);
        const newItem: PlaidItem = {
          id: data.item_id,
          institution_name: data.institution_name,
          institution_logo: existing?.institution_logo ?? null,
          institution_color: existing?.institution_color ?? null,
          last_synced_at: new Date().toISOString(),
        };
        return existing ? prev.map((it) => (it.id === newItem.id ? newItem : it)) : [...prev, newItem];
      });
      setSyncResults((prev) => ({
        ...prev,
        [data.item_id]: { added: data.added_count, modified: 0, removed: 0 },
      }));
      const result = { name: data.institution_name, added: data.added_count };
      setConnectResult(result);
      setTimeout(() => setConnectResult(null), 4000);
      onTransactionsImported?.();
    },
    [onTransactionsImported],
  );

  const { open, ready } = usePlaidLink({
    token: linkToken,
    onSuccess: onPlaidSuccess,
    onExit: () => {
      setLinkToken(null);
      setLoadingLink(false);
    },
  });

  useEffect(() => {
    if (ready && linkToken) open();
  }, [ready, linkToken, open]);

  const handleSync = async (itemId: string) => {
    setSyncingId(itemId);
    setError(null);
    const session = await getSession();
    if (!session) {
      setSyncingId(null);
      return;
    }
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
    if (!res.ok) {
      setError(data.error ?? "Sync failed");
      return;
    }
    setSyncResults((prev) => ({ ...prev, [itemId]: data }));
    setItems((prev) =>
      prev.map((it) => (it.id === itemId ? { ...it, last_synced_at: new Date().toISOString() } : it)),
    );
    onTransactionsImported?.();
  };

  const handleDisconnect = async (itemId: string, name: string) => {
    if (!confirm(`Disconnect ${name}? Your imported transactions will be kept.`)) return;
    setDisconnectingId(itemId);
    const session = await getSession();
    if (!session) {
      setDisconnectingId(null);
      return;
    }
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
    setSelectedItemId((cur) => (cur === itemId ? null : cur));
    setSyncResults((prev) => {
      const next = { ...prev };
      delete next[itemId];
      return next;
    });
  };

  const btnStyle = (variant: "primary" | "ghost"): React.CSSProperties => ({
    padding: variant === "primary" ? "9px 18px" : "7px 12px",
    borderRadius: 8,
    border: variant === "primary" ? "none" : "1px solid var(--uf-border)",
    background: variant === "primary" ? "#047857" : "var(--uf-card)",
    color: variant === "primary" ? "#ffffff" : "var(--uf-text-2)",
    fontSize: 13,
    fontWeight: 700,
    cursor: "pointer",
    fontFamily: "inherit",
    whiteSpace: "nowrap",
  });

  const atFreeLimit = isProUser === false && items.length >= 1;
  const showEmptyStateCard = itemsLoaded && items.length === 0;

  return (
    <div style={{ marginBottom: 24 }}>
      <style>{`
        @keyframes plaid-spin { to { transform: rotate(360deg); } }
        @keyframes plaid-slide-in { from { opacity: 0; transform: translateX(12px); } to { opacity: 1; transform: translateX(0); } }
      `}</style>

      {connectResult && (
        <div
          style={{
            position: "fixed",
            top: 24,
            right: 24,
            zIndex: 9999,
            maxWidth: 360,
            padding: "14px 18px",
            borderRadius: 12,
            background: connectResult.added > 0 ? "#064E3B" : "#78350F",
            color: "#ffffff",
            boxShadow: "0 8px 32px rgba(0,0,0,0.18)",
            display: "flex",
            alignItems: "flex-start",
            gap: 12,
            animation: "plaid-slide-in 0.2s ease",
          }}
        >
          <span style={{ fontSize: 13, lineHeight: 1.5, flex: 1 }}>
            {connectResult.added > 0
              ? `Connected! ${connectResult.added} transactions imported from ${connectResult.name}.`
              : `${connectResult.name} connected. No transactions found yet - tap Sync now, or check back in a few minutes.`}
          </span>
          <button
            onClick={() => setConnectResult(null)}
            style={{
              background: "none",
              border: "none",
              color: "rgba(255,255,255,0.7)",
              cursor: "pointer",
              fontSize: 18,
              padding: 0,
              flexShrink: 0,
              lineHeight: 1,
            }}
          >
            x
          </button>
        </div>
      )}

      {error && (
        <div
          style={{
            position: "fixed",
            top: connectResult ? 92 : 24,
            right: 24,
            zIndex: 9999,
            maxWidth: 360,
            padding: "14px 18px",
            borderRadius: 12,
            background: "#7F1D1D",
            color: "#ffffff",
            boxShadow: "0 8px 32px rgba(0,0,0,0.18)",
            display: "flex",
            alignItems: "flex-start",
            gap: 12,
            animation: "plaid-slide-in 0.2s ease",
          }}
        >
          <span style={{ fontSize: 16, flexShrink: 0, marginTop: 1 }}>!</span>
          <span style={{ fontSize: 13, lineHeight: 1.5, flex: 1 }}>{error}</span>
          <button
            onClick={() => setError(null)}
            style={{
              background: "none",
              border: "none",
              color: "rgba(255,255,255,0.7)",
              cursor: "pointer",
              fontSize: 18,
              padding: 0,
              flexShrink: 0,
              lineHeight: 1,
            }}
          >
            x
          </button>
        </div>
      )}

      {items.length === 0 && (
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 16,
            background: "var(--uf-surface)",
            border: "1px solid var(--uf-border)",
            borderRadius: 12,
            padding: "14px 18px",
            flexWrap: "wrap",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <span style={{ fontSize: 12, fontWeight: 800, color: "#047857", letterSpacing: "0.08em" }}>
              BANK
            </span>
            <div>
              <div style={{ fontSize: 14, fontWeight: 700, color: "var(--uf-text)" }}>
                {!itemsLoaded ? "Checking connected accounts" : "Connect your bank account"}
              </div>
              {showEmptyStateCard && (
                <div style={{ fontSize: 12, color: "#64748B", marginTop: 1 }}>
                  Auto-import transactions via Plaid
                </div>
              )}
            </div>
          </div>

          {importing ? (
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 8,
                color: "#047857",
                fontSize: 13,
                fontWeight: 600,
              }}
            >
              <span
                style={{
                  display: "inline-block",
                  width: 14,
                  height: 14,
                  border: "2px solid #D1FAE5",
                  borderTopColor: "#047857",
                  borderRadius: "50%",
                  animation: "plaid-spin 0.8s linear infinite",
                }}
              />
              Importing transactions...
            </div>
          ) : showEmptyStateCard ? null : (
            <button onClick={handleConnectClick} disabled={loadingLink} style={btnStyle("primary")}>
              {loadingLink ? "Opening..." : "+ Add account"}
            </button>
          )}
        </div>
      )}

      {showEmptyStateCard && (
        <div
          style={{
            marginTop: 12,
            padding: "18px 18px 16px",
            borderRadius: 12,
            border: "1px solid rgba(20,184,166,0.25)",
            background: "var(--uf-card)",
            display: "flex",
            flexDirection: "column",
            gap: 12,
          }}
        >
          <div style={{ display: "flex", alignItems: "flex-start", gap: 10 }}>
            <div
              aria-hidden="true"
              style={{
                width: 36,
                height: 36,
                borderRadius: 10,
                background: "#CCFBF1",
                color: "#0F766E",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: 18,
                flexShrink: 0,
              }}
            >
              💧
            </div>
            <div style={{ minWidth: 0 }}>
              <div style={{ fontSize: 15, fontWeight: 800, color: "var(--uf-text)", fontFamily: "Manrope, sans-serif" }}>
                Park your emergency fund where it can quietly earn more.
              </div>
              <p style={{ fontSize: 13, lineHeight: 1.6, color: "#475569", margin: "6px 0 0" }}>
                A high-yield savings account can help idle cash earn interest while staying easy to reach for true emergencies.
                We are not recommending any bank here yet — first we want to learn whether people want education or account connection.
              </p>
            </div>
          </div>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
              gap: 10,
            }}
          >
            <div style={{ background: "var(--uf-surface)", border: "1px solid rgba(20,184,166,0.18)", borderRadius: 10, padding: "12px 14px" }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: "#0F766E", marginBottom: 4 }}>Why it matters</div>
              <div style={{ fontSize: 13, color: "var(--uf-text-2)", lineHeight: 1.55 }}>
                If your emergency fund is sitting in low-yield cash, even a modest APY can add a little progress without changing your risk.
              </div>
            </div>
            <div style={{ background: "var(--uf-surface)", border: "1px solid rgba(20,184,166,0.18)", borderRadius: 10, padding: "12px 14px" }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: "#0F766E", marginBottom: 4 }}>What to check</div>
              <div style={{ fontSize: 13, color: "var(--uf-text-2)", lineHeight: 1.55 }}>
                Compare APY, any minimum balance rules, transfer speed, and whether the account still feels simple enough for emergencies.
              </div>
            </div>
          </div>

          <div style={{ display: "flex", flexWrap: "wrap", gap: 10, alignItems: "center" }}>
            <Link
              href="/calculators/apy?source=dashboard-hysa-card"
              onClick={() =>
                trackHysaEmptyStateCtaClicked({
                  cta: 'learn_more',
                  destination: 'apy_calculator',
                })
              }
              style={{
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                padding: "10px 14px",
                borderRadius: 8,
                border: "1px solid rgba(20,184,166,0.3)",
                background: "var(--uf-card)",
                color: "#0F766E",
                fontSize: 13,
                fontWeight: 700,
                textDecoration: "none",
                minWidth: 0,
              }}
            >
              Learn more
            </Link>
            <button
              onClick={handleConnectClick}
              disabled={loadingLink}
              style={btnStyle("primary")}
            >
              {loadingLink ? "Opening..." : "Connect account"}
            </button>
          </div>
        </div>
      )}

      {items.length > 0 && (
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {importing && (
            <div style={{ display: "flex", alignItems: "center", gap: 8, color: "#047857", fontSize: 13, fontWeight: 600 }}>
              <span
                style={{
                  display: "inline-block", width: 14, height: 14,
                  border: "2px solid #D1FAE5", borderTopColor: "#047857",
                  borderRadius: "50%", animation: "plaid-spin 0.8s linear infinite",
                }}
              />
              Importing transactions...
            </div>
          )}

          <div style={{ fontSize: 11, fontWeight: 800, color: "#047857", letterSpacing: "0.08em" }}>
            CONNECTED BANKS
          </div>

          <div style={{ display: "flex", flexWrap: "wrap", gap: 10 }}>
            {items.map((item) => {
              const armed = selectedItemId === item.id;
              const result = syncResults[item.id];
              const isSyncing = syncingId === item.id;
              const isDisconnecting = disconnectingId === item.id;

              const metaText = isSyncing
                ? "Syncing…"
                : result && result.added > 0
                  ? `+${result.added} imported`
                  : result
                    ? "up to date"
                    : fmtSynced(item.last_synced_at);
              const metaColor = isSyncing ? "#047857" : result && result.added > 0 ? "#059669" : "#94A3B8";

              const tileBody = (
                <>
                  {armed ? (
                    <button
                      onClick={(e) => { e.stopPropagation(); handleSync(item.id); }}
                      disabled={isSyncing || isDisconnecting}
                      title="Sync now"
                      aria-label="Sync now"
                      style={{
                        width: 36, height: 36, borderRadius: 9, border: "none",
                        background: "#047857", color: "#fff",
                        display: "flex", alignItems: "center", justifyContent: "center",
                        fontSize: 16, cursor: isSyncing || isDisconnecting ? "default" : "pointer",
                        animation: isSyncing ? "plaid-spin 0.8s linear infinite" : "none",
                      }}
                    >
                      ⟳
                    </button>
                  ) : item.institution_logo ? (
                    <img
                      src={item.institution_logo}
                      alt=""
                      width={36}
                      height={36}
                      style={{ borderRadius: 9, objectFit: "cover" }}
                    />
                  ) : (
                    <div
                      style={{
                        width: 36, height: 36, borderRadius: 9,
                        background: item.institution_color || "#047857",
                        color: "#fff", display: "flex", alignItems: "center", justifyContent: "center",
                        fontWeight: 700, fontSize: 15, fontFamily: "Manrope, sans-serif",
                      }}
                    >
                      {item.institution_name.charAt(0).toUpperCase()}
                    </div>
                  )}
                  <div
                    style={{
                      fontSize: 11.5, fontWeight: 700, color: "var(--uf-text)",
                      maxWidth: 80, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                    }}
                  >
                    {item.institution_name}
                  </div>
                  <div style={{ fontSize: 10, color: metaColor, fontWeight: metaColor === "#94A3B8" ? 400 : 700 }}>
                    {metaText}
                  </div>
                </>
              );

              if (!armed) {
                return (
                  <button
                    key={item.id}
                    onClick={() => setSelectedItemId(item.id)}
                    style={{
                      width: 92,
                      display: "flex", flexDirection: "column", alignItems: "center", gap: 6,
                      background: "var(--uf-card)", border: "1px solid var(--uf-border)", borderRadius: 12,
                      padding: "10px 8px", cursor: "pointer", fontFamily: "inherit", textAlign: "center",
                    }}
                  >
                    {tileBody}
                  </button>
                );
              }

              return (
                <div
                  key={item.id}
                  onClick={() => setSelectedItemId(null)}
                  style={{
                    width: 92, position: "relative",
                    display: "flex", flexDirection: "column", alignItems: "center", gap: 6,
                    background: "var(--uf-surface)", border: "1.5px solid #047857", borderRadius: 12,
                    padding: "10px 8px", cursor: "pointer", textAlign: "center",
                  }}
                >
                  <button
                    onClick={(e) => { e.stopPropagation(); handleDisconnect(item.id, item.institution_name); }}
                    disabled={isSyncing || isDisconnecting}
                    title="Disconnect"
                    aria-label={`Disconnect ${item.institution_name}`}
                    style={{
                      position: "absolute", top: -6, right: -6, width: 20, height: 20, borderRadius: "50%",
                      border: "1px solid var(--uf-border)", background: "#fff", color: "#DC2626",
                      fontSize: 11, lineHeight: 1, display: "flex", alignItems: "center", justifyContent: "center",
                      cursor: isSyncing || isDisconnecting ? "default" : "pointer",
                    }}
                  >
                    {isDisconnecting ? "…" : "✕"}
                  </button>
                  {tileBody}
                </div>
              );
            })}

            <button
              onClick={atFreeLimit ? onUpgradeClick : handleConnectClick}
              disabled={!atFreeLimit && loadingLink}
              style={{
                width: 92,
                display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 6,
                background: "var(--uf-card)", border: "1.5px dashed var(--uf-border)", borderRadius: 12,
                padding: "10px 8px", cursor: "pointer", fontFamily: "inherit", color: "#047857",
              }}
            >
              <div
                style={{
                  width: 36, height: 36, borderRadius: 9, border: "1.5px dashed #047857",
                  display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18, fontWeight: 300,
                }}
              >
                +
              </div>
              <div style={{ fontSize: 11.5, fontWeight: 700 }}>
                {atFreeLimit ? "Upgrade" : loadingLink ? "Opening…" : "Add bank"}
              </div>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
