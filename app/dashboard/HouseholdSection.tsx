"use client";

import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { Badge, Button, Input } from "@/components/ui";
import SectionTitle from "./SectionTitle";

/**
 * Household, in Profile.
 *
 * Profile because a household is about the account, not the money — rule 4 of
 * the app-structure rules. The money itself shows up as a You/Together scope
 * toggle on Money and a conditional card on Home, neither of which exists yet.
 *
 * There is no sidebar entry for any of this, deliberately: a permanent nav item
 * would cost every user space for something almost none of them use. This
 * section and the prompt after the reveal are the whole discoverability plan.
 */

interface Member {
  userId: string;
  email: string | null;
  displayName: string | null;
  role: "owner" | "member";
  slot: number;
  isYou: boolean;
}

interface HouseholdView {
  householdId: string | null;
  members: Member[];
  pendingInvite: { email: string; expiresAt: string } | null;
  incomingInvite: { token: string; fromName: string | null; fromEmail: string | null } | null;
}

const cardStyle: React.CSSProperties = {
  background: "var(--uf-card)",
  borderRadius: 12,
  border: "1px solid var(--uf-border)",
  padding: 20,
  marginBottom: 20,
};

const noteStyle: React.CSSProperties = {
  fontSize: 12,
  color: "var(--uf-ink-3)",
  marginTop: 8,
  marginBottom: 0,
  lineHeight: 1.6,
};

function labelFor(m: Member): string {
  return m.displayName?.trim() || m.email || "Your partner";
}

/**
 * `bare` drops the card and title when Profile shows this inside its Household
 * row (D-48); `onSummary` reports one word for that row's value.
 */
export default function HouseholdSection({ bare = false, onSummary }: { bare?: boolean; onSummary?: (summary: string) => void } = {}) {
  const [view, setView] = useState<HouseholdView | null>(null);
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState<null | "invite" | "revoke" | "disconnect">(null);
  const [error, setError] = useState<string | null>(null);
  const [confirmingDisconnect, setConfirmingDisconnect] = useState(false);

  const call = useCallback(async (path: string, body?: unknown) => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) throw new Error("Your session expired. Reload the page.");
    const res = await fetch(path, {
      method: body === undefined ? "GET" : "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${session.access_token}` },
      ...(body === undefined ? {} : { body: JSON.stringify(body) }),
    });
    const json = (await res.json()) as Record<string, unknown>;
    if (!res.ok) throw new Error((json.error as string) ?? "Something went wrong.");
    return json;
  }, []);

  const refresh = useCallback(async () => {
    try {
      setView((await call("/api/household/status")) as unknown as HouseholdView);
    } catch {
      // A household that cannot be read is not worth an error banner on a
      // Profile page that works otherwise. It reappears on the next load.
      setView({ householdId: null, members: [], pendingInvite: null, incomingInvite: null });
    }
  }, [call]);

  useEffect(() => { void refresh(); }, [refresh]);

  useEffect(() => {
    if (!view || !onSummary) return;
    const partner = view.members.find((m) => !m.isYou);
    onSummary(partner ? `With ${labelFor(partner)}` : view.pendingInvite ? "Invite sent" : view.incomingInvite ? "Invite waiting" : "Just you");
  }, [view, onSummary]);

  async function run(kind: "invite" | "revoke" | "disconnect", fn: () => Promise<unknown>) {
    setBusy(kind);
    setError(null);
    try {
      await fn();
      await refresh();
      if (kind === "invite") setEmail("");
      if (kind === "disconnect") setConfirmingDisconnect(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setBusy(null);
    }
  }

  if (!view) {
    return (
      <div style={bare ? undefined : cardStyle}>
        {!bare && <SectionTitle icon="users">Household</SectionTitle>}
        <p style={{ ...noteStyle, marginTop: 0 }}>Loading…</p>
      </div>
    );
  }

  const partner = view.members.find((m) => !m.isYou);

  return (
    <div style={bare ? undefined : cardStyle}>
      {!bare && <SectionTitle icon="users">Household</SectionTitle>}

      {error && (
        <p style={{ fontSize: 13, color: "var(--uf-neg)", margin: "0 0 14px", lineHeight: 1.5 }}>{error}</p>
      )}

      {/* Connected — the state this whole feature exists to reach. */}
      {partner ? (
        <>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
            <div>
              <div style={{ fontSize: 14, fontWeight: 700, color: "var(--uf-ink)" }}>{labelFor(partner)}</div>
              {partner.email && partner.displayName && (
                <div style={{ fontSize: 12, color: "var(--uf-ink-3)", marginTop: 2 }}>{partner.email}</div>
              )}
            </div>
            <Badge tone="positive">Connected</Badge>
          </div>
          <p style={noteStyle}>
            You can each see the other&rsquo;s numbers. Neither of you can change the
            other&rsquo;s.
          </p>

          {confirmingDisconnect ? (
            <div style={{ marginTop: 16, paddingTop: 16, borderTop: "1px solid var(--uf-border)" }}>
              <p style={{ fontSize: 13, color: "var(--uf-ink-2)", margin: "0 0 12px", lineHeight: 1.6 }}>
                Disconnect from {labelFor(partner)}? You&rsquo;ll both stop seeing each
                other&rsquo;s numbers straight away. Nobody&rsquo;s own data is deleted.
              </p>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                <Button
                  variant="danger"
                  size="sm"
                  disabled={busy === "disconnect"}
                  onClick={() => run("disconnect", () => call("/api/household/disconnect", {}))}
                >
                  {busy === "disconnect" ? "Disconnecting…" : "Yes, disconnect"}
                </Button>
                <Button variant="ghost" size="sm" onClick={() => setConfirmingDisconnect(false)}>
                  Keep connected
                </Button>
              </div>
            </div>
          ) : (
            <div style={{ marginTop: 16 }}>
              <Button variant="ghost" size="sm" onClick={() => setConfirmingDisconnect(true)}>
                Disconnect
              </Button>
            </div>
          )}
        </>
      ) : view.incomingInvite ? (
        /* Invited by someone else. */
        <>
          <p style={{ fontSize: 14, color: "var(--uf-ink-2)", margin: "0 0 14px", lineHeight: 1.6 }}>
            <strong style={{ color: "var(--uf-ink)" }}>
              {view.incomingInvite.fromName || view.incomingInvite.fromEmail || "Someone"}
            </strong>{" "}
            invited you to share a household.
          </p>
          <Button
            variant="primary"
            size="sm"
            onClick={() => { window.location.href = `/household/join?token=${encodeURIComponent(view.incomingInvite!.token)}`; }}
          >
            See the invitation
          </Button>
        </>
      ) : view.pendingInvite ? (
        /* Sent, waiting. */
        <>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
            <div style={{ fontSize: 14, color: "var(--uf-ink)" }}>{view.pendingInvite.email}</div>
            <Badge tone="warning">Invited</Badge>
          </div>
          <p style={noteStyle}>
            Waiting for them to accept. The link expires{" "}
            {new Date(view.pendingInvite.expiresAt).toLocaleDateString("en-GB", { day: "numeric", month: "long" })}.
          </p>
          <div style={{ marginTop: 14 }}>
            <Button
              variant="ghost"
              size="sm"
              disabled={busy === "revoke"}
              onClick={() => run("revoke", () => call("/api/household/revoke", {}))}
            >
              {busy === "revoke" ? "Cancelling…" : "Cancel invitation"}
            </Button>
          </div>
        </>
      ) : (
        /* Nothing yet. */
        <>
          <p style={{ fontSize: 14, color: "var(--uf-ink-2)", margin: "0 0 14px", lineHeight: 1.6 }}>
            Planning with a partner? Invite them and you&rsquo;ll each keep your own
            account, plus one shared view of where the two of you are heading.
          </p>
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
            <Input
              type="email"
              placeholder="their@email.com"
              value={email}
              autoComplete="off"
              style={{ flex: "1 1 220px", minWidth: 0 }}
              onChange={(e) => setEmail(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && email.trim() && busy === null) {
                  void run("invite", () => call("/api/household/invite", { email }));
                }
              }}
            />
            <Button
              variant="primary"
              disabled={busy === "invite" || !email.trim()}
              onClick={() => run("invite", () => call("/api/household/invite", { email }))}
            >
              {busy === "invite" ? "Sending…" : "Send invitation"}
            </Button>
          </div>
          <p style={noteStyle}>
            They&rsquo;ll get an email with a link. Nothing is shared until they accept,
            and either of you can disconnect at any time.
          </p>
        </>
      )}
    </div>
  );
}
