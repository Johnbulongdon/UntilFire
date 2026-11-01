"use client";

import { useCallback, useEffect, useState } from "react";
import { usePlaidLink } from "react-plaid-link";
import { trackHysaEmptyStateCtaClicked } from "@/lib/analytics";
import { isPro, supabase } from "@/lib/supabase";
import { Button, ConfirmDialog } from "@/components/ui";
import { BankLogo, MoneyList, MoneyRow } from "./MoneyCards";
import BankWorking, { type BankFound } from "./BankWorking";

export type PlaidItem = {
  id: string;
  institution_name: string;
  institution_logo: string | null;
  institution_color: string | null;
  last_synced_at: string | null;
};

type SyncResult = { added: number; modified: number; removed: number };

export type BankStatus = { loaded: boolean; banks: number; lastSynced: string | null };

type Props = {
  onTransactionsImported?: () => void;
  onUpgradeClick?: () => void;
  /** Hide the connected-banks list; the caller shows a one-line status and can expand it. */
  collapsed?: boolean;
  onStatus?: (status: BankStatus) => void;
  /** Rows in the calm style (Net Worth) instead of tiles (D-53). */
  layout?: "tiles" | "rows";
  /** The connected banks, so the caller can show their logos on account rows. */
  onItems?: (items: PlaidItem[]) => void;
};

async function getSession() {
  const {
    data: { session },
  } = await supabase.auth.getSession();
  return session;
}

export function fmtSynced(ts: string | null): string {
  if (!ts) return "never synced";
  const diff = Date.now() - new Date(ts).getTime();
  const mins = Math.floor(diff / 60_000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

export default function PlaidConnect({ onTransactionsImported, onUpgradeClick, collapsed = false, onStatus, layout = "tiles", onItems }: Props) {
  const [items, setItems] = useState<PlaidItem[]>([]);
  const [itemsLoaded, setItemsLoaded] = useState(false);
  const [isProUser, setIsProUser] = useState<boolean | null>(null);
  const [linkToken, setLinkToken] = useState<string | null>(null);
  const [loadingLink, setLoadingLink] = useState(false);
  const [importing, setImporting] = useState(false);
  const [connectResult, setConnectResult] = useState<{ name: string; added: number } | null>(null);
  // Linking a bank, shown working (BankWorking): the bank's name while it imports, then what it found.
  const [working, setWorking] = useState<{ name: string; result: BankFound | null } | null>(null);
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

  useEffect(() => {
    const latest = items.map((i) => i.last_synced_at).filter(Boolean).sort().at(-1) ?? null;
    onStatus?.({ loaded: itemsLoaded, banks: items.length, lastSynced: latest });
  }, [items, itemsLoaded, onStatus]);
  useEffect(() => { if (itemsLoaded) onItems?.(items); }, [items, itemsLoaded, onItems]);

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
      setWorking({ name: institution?.name ?? "your bank", result: null });
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
        setWorking(null);
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
      setWorking({ name: data.institution_name, result: {
        name: data.institution_name, added: data.added_count, accounts: data.accounts_count ?? 0,
        found: data.found ?? { payday: false, bills: 0 },
      } });
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

  const [confirmDisconnect, setConfirmDisconnect] = useState<{ id: string; name: string } | null>(null);
  const askDisconnect = (itemId: string, name: string) => setConfirmDisconnect({ id: itemId, name });

  const handleDisconnect = async (itemId: string, name: string) => {
    setDisconnectingId(itemId);
    const session = await getSession();
    if (!session) {
      setDisconnectingId(null);
      return;
    }
    setError(null);
    const res = await fetch("/api/plaid/disconnect", {
      method: "DELETE",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${session.access_token}`,
      },
      body: JSON.stringify({ item_id: itemId }),
    });
    setDisconnectingId(null);
    // A refused disconnect leaves the connection in place; keep it listed.
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(data.error ?? `Couldn't disconnect ${name}. Please try again.`);
      return;
    }
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
    borderRadius: "var(--uf-r-pill)",
    border: variant === "primary" ? "none" : "1px solid var(--uf-border)",
    background: variant === "primary" ? "var(--uf-ink)" : "var(--uf-card)",
    color: variant === "primary" ? "var(--uf-card)" : "var(--uf-text-2)",
    fontSize: 13,
    fontWeight: 700,
    cursor: "pointer",
    fontFamily: "inherit",
    whiteSpace: "nowrap",
  });

  const atFreeLimit = isProUser === false && items.length >= 1;
  const showEmptyStateCard = itemsLoaded && items.length === 0;

  return (
    <div style={{ marginBottom: collapsed && items.length > 0 ? 0 : 24 }}>
      <style>{`
        @keyframes plaid-spin { to { transform: rotate(360deg); } }
        @keyframes plaid-slide-in { from { opacity: 0; transform: translateX(12px); } to { opacity: 1; transform: translateX(0); } }
      `}</style>

      <ConfirmDialog
        open={!!confirmDisconnect}
        title={`Disconnect ${confirmDisconnect?.name ?? "this bank"}?`}
        body="Your imported transactions stay. New ones stop coming in."
        confirmLabel="Disconnect"
        danger
        onConfirm={() => { const c = confirmDisconnect; setConfirmDisconnect(null); if (c) handleDisconnect(c.id, c.name); }}
        onCancel={() => setConfirmDisconnect(null)}
      />

      {working && <BankWorking name={working.name} result={working.result} onClose={() => setWorking(null)} />}

      {connectResult && (
        <div
          style={{
            position: "fixed",
            top: 24,
            right: 24,
            zIndex: 9999,
            maxWidth: 360,
            padding: "14px 18px",
            borderRadius: "var(--uf-r-card)",
            background: connectResult.added > 0 ? "var(--uf-mint)" : "var(--uf-warn-bg)",
            color: connectResult.added > 0 ? "var(--uf-ink)" : "var(--uf-warn-ink)",
            border: "1px solid var(--uf-border)",
            boxShadow: "var(--uf-e2)",
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
            aria-label="Close" onClick={() => setConnectResult(null)}
            style={{
              background: "none",
              border: "none",
              color: "inherit", opacity: 0.7,
              cursor: "pointer",
              fontSize: 18,
              padding: 0,
              flexShrink: 0,
              lineHeight: 1,
            }}
          >
            ✕
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
            borderRadius: "var(--uf-r-card)",
            background: "var(--uf-neg-bg)",
            color: "var(--uf-neg-ink)",
            border: "1px solid var(--uf-neg)",
            boxShadow: "var(--uf-e2)",
            display: "flex",
            alignItems: "flex-start",
            gap: 12,
            animation: "plaid-slide-in 0.2s ease",
          }}
        >
          <span style={{ fontSize: 16, flexShrink: 0, marginTop: 1 }}>!</span>
          <span style={{ fontSize: 13, lineHeight: 1.5, flex: 1 }}>{error}</span>
          <button
            aria-label="Close" onClick={() => setError(null)}
            style={{
              background: "none",
              border: "none",
              color: "inherit", opacity: 0.7,
              cursor: "pointer",
              fontSize: 18,
              padding: 0,
              flexShrink: 0,
              lineHeight: 1,
            }}
          >
            ✕
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
            borderRadius: "var(--uf-r-card)",
            padding: "14px 18px",
            flexWrap: "wrap",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div>
              <div style={{ fontSize: 14, fontWeight: 700, color: "var(--uf-text)" }}>
                {!itemsLoaded ? "Checking connected accounts" : "Connect your bank account"}
              </div>
              {showEmptyStateCard && (
                <div style={{ fontSize: 12, color: "var(--uf-ink-3)", marginTop: 1 }}>
                  Auto-import transactions via Plaid. Read-only access; export or delete your data anytime.
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
                color: "var(--uf-ink)",
                fontSize: 13,
                fontWeight: 600,
              }}
            >
              <span
                style={{
                  display: "inline-block",
                  width: 14,
                  height: 14,
                  border: "2px solid var(--uf-border)",
                  borderTopColor: "var(--uf-ink)",
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
        <div style={{ marginTop: 12, padding: "16px 18px", borderRadius: 20, border: "1px solid var(--uf-border)", background: "var(--uf-card)", display: "flex", flexWrap: "wrap", alignItems: "center", gap: 12 }}>
          <span aria-hidden="true" style={{ width: 36, height: 36, borderRadius: 12, background: "var(--uf-mint)", display: "grid", placeItems: "center", fontSize: 18, flexShrink: 0 }}>💧</span>
          <div style={{ flex: "1 1 260px", minWidth: 0 }}>
            <div className="uf-t-body" style={{ fontWeight: 700, color: "var(--uf-ink)" }}>
              Park your emergency fund where it can quietly earn more.
            </div>
            <p className="uf-t-small" style={{ color: "var(--uf-ink-2)", margin: "2px 0 0" }}>
              At about 4%, every $10,000 earns roughly $400 a year. Offers lists accounts we picked, and says who earns from each link.
            </p>
          </div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
            {/* A full load: the dashboard reads ?tab= when it mounts. */}
            <a
              href="/dashboard?tab=offers"
              onClick={() =>
                trackHysaEmptyStateCtaClicked({
                  cta: 'see_offers',
                  destination: 'offers',
                })
              }
              className="uf-t-small"
              style={{ display: "inline-flex", alignItems: "center", minHeight: 36, padding: "8px 16px", borderRadius: 999, border: "1px solid var(--uf-border-2)", background: "var(--uf-card)", color: "var(--uf-ink)", fontWeight: 700, textDecoration: "none" }}
            >
              See savings accounts
            </a>
            <Button variant="primary" size="sm" onClick={handleConnectClick} disabled={loadingLink}>
              {loadingLink ? "Opening..." : "Connect account"}
            </Button>
          </div>
        </div>
      )}

      {items.length > 0 && !collapsed && layout === "rows" && (
        <MoneyList footer={
          <Button variant="secondary" size="sm" onClick={atFreeLimit ? onUpgradeClick : handleConnectClick} disabled={!atFreeLimit && loadingLink}>
            {atFreeLimit ? "Upgrade to add another bank" : loadingLink ? "Opening…" : "Connect a bank"}
          </Button>
        }>
          {items.map((item) => {
            const open = selectedItemId === item.id;
            const result = syncResults[item.id];
            const isSyncing = syncingId === item.id;
            const isDisconnecting = disconnectingId === item.id;
            const meta = isSyncing ? "Syncing…" : importing && open ? "Importing transactions…"
              : result && result.added > 0 ? `${result.added} new transactions` : result ? "Up to date" : `Synced ${fmtSynced(item.last_synced_at)}`;
            return (
              <MoneyRow key={item.id} dot={item.institution_color || "var(--uf-ink-3)"} name={item.institution_name} meta={meta}
                icon={<BankLogo logo={item.institution_logo} name={item.institution_name} color={item.institution_color} />}
                value={open ? "Close" : "Manage ›"} valueTone="var(--uf-ink-3)" onClick={() => setSelectedItemId(open ? null : item.id)}
                after={open && (
                  <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                    <Button variant="secondary" size="sm" onClick={() => handleSync(item.id)} disabled={isSyncing || isDisconnecting}>{isSyncing ? "Syncing…" : "Sync now"}</Button>
                    <Button variant="danger" size="sm" onClick={() => askDisconnect(item.id, item.institution_name)} disabled={isSyncing || isDisconnecting}>{isDisconnecting ? "Disconnecting…" : "Disconnect"}</Button>
                  </div>
                )} />
            );
          })}
        </MoneyList>
      )}

      {items.length > 0 && !collapsed && layout === "tiles" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {importing && (
            <div style={{ display: "flex", alignItems: "center", gap: 8, color: "var(--uf-ink)", fontSize: 13, fontWeight: 600 }}>
              <span
                style={{
                  display: "inline-block", width: 14, height: 14,
                  border: "2px solid var(--uf-border)", borderTopColor: "var(--uf-ink)",
                  borderRadius: "50%", animation: "plaid-spin 0.8s linear infinite",
                }}
              />
              Importing transactions...
            </div>
          )}

          <div style={{ fontSize: 13, fontWeight: 700, color: "var(--uf-ink)" }}>
            Connected banks
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
              const metaColor = isSyncing ? "var(--uf-ink)" : result && result.added > 0 ? "var(--uf-pos-ink)" : "var(--uf-ink-3)";

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
                        background: "var(--uf-ink)", color: "var(--uf-card)",
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
                        background: item.institution_color || "#151719",
                        color: "#fff", display: "flex", alignItems: "center", justifyContent: "center",
                        fontWeight: 700, fontSize: 15, fontFamily: "Inter, sans-serif",
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
                  <div style={{ fontSize: 10, color: metaColor, fontWeight: metaColor === "var(--uf-ink-3)" ? 400 : 700 }}>
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
                    background: "var(--uf-surface)", border: "1.5px solid var(--uf-ink)", borderRadius: 12,
                    padding: "10px 8px", cursor: "pointer", textAlign: "center",
                  }}
                >
                  <button
                    onClick={(e) => { e.stopPropagation(); askDisconnect(item.id, item.institution_name); }}
                    disabled={isSyncing || isDisconnecting}
                    title="Disconnect"
                    aria-label={`Disconnect ${item.institution_name}`}
                    style={{
                      position: "absolute", top: -6, right: -6, width: 20, height: 20, borderRadius: "50%",
                      border: "1px solid var(--uf-border)", background: "var(--uf-card)", color: "var(--uf-neg)",
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
                padding: "10px 8px", cursor: "pointer", fontFamily: "inherit", color: "var(--uf-ink)",
              }}
            >
              <div
                style={{
                  width: 36, height: 36, borderRadius: 9, border: "1.5px dashed var(--uf-ink)",
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
