"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { trackCancelFlow } from "@/lib/analytics";
import { CANCEL_REASONS, type CancelReason } from "@/lib/cancel-reasons";
import { Alert, Button, Icon, type IconName } from "@/components/ui";

/** Your own Pro, as Profile needs it to offer cancel or keep (D-99). */
export type ProBilling = {
  /** stripe: cancel here. apple: only iPhone Settings. other: a reward month, nothing renews. */
  source: "stripe" | "apple" | "other";
  renews: boolean;
  endsAt: string | null;
};

const REASON_ICON: Record<CancelReason, IconName> = {
  budget: "money",
  break: "calendar",
  free_enough: "positive",
  bank_sync: "bank",
  goal_reached: "target",
};

export function fmtEnds(iso: string | null): string {
  return iso ? new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) : "the end of this period";
}

export async function changePro(body: Record<string, unknown>): Promise<{ ok: boolean; endsAt?: string | null; error?: string }> {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) return { ok: false, error: "Sign in again, then try once more." };
  try {
    const res = await fetch("/api/stripe/cancel", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${session.access_token}` },
      body: JSON.stringify(body),
    });
    const data = await res.json().catch(() => ({}));
    return res.ok ? { ok: true, endsAt: data.endsAt ?? null } : { ok: false, error: data.error ?? "Something went wrong. Try again." };
  } catch {
    return { ok: false, error: "No connection. Try again." };
  }
}

/**
 * Cancel Pro in three short steps (D-99): one reason, what you keep, goodbye.
 * Cancelling is one tap from every step, and the close button keeps Pro.
 * Renewal stops at the end of the period; nothing ends early.
 */
export default function CancelProSheet({
  open, onClose, onCancelled, firstName, freedomLabel, bankCount, endsAt,
}: {
  open: boolean;
  onClose: () => void;
  onCancelled: (endsAt: string | null) => void;
  firstName: string;
  freedomLabel: string | null;
  bankCount: number;
  endsAt: string | null;
}) {
  const [step, setStep] = useState<"reason" | "keep" | "done">("reason");
  const [reason, setReason] = useState<CancelReason | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [note, setNote] = useState("");
  const [noteSent, setNoteSent] = useState(false);
  const [endedAt, setEndedAt] = useState<string | null>(endsAt);

  useEffect(() => {
    if (!open) return;
    setStep("reason"); setReason(null); setError(""); setNote(""); setNoteSent(false); setEndedAt(endsAt);
    trackCancelFlow({ step: "opened" });
  }, [open]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!open) return null;

  const close = () => {
    if (step !== "done") trackCancelFlow({ step: "kept", ...(reason ? { reason } : {}) });
    onClose();
  };

  async function cancel(picked: CancelReason | null) {
    setBusy(true); setError("");
    const res = await changePro({ action: "cancel", ...(picked ? { reason: picked } : {}) });
    setBusy(false);
    if (!res.ok) { setError(res.error ?? "Something went wrong. Try again."); return; }
    const ends = res.endsAt ?? endsAt;
    setEndedAt(ends);
    trackCancelFlow({ step: "cancelled", ...(picked ? { reason: picked } : {}) });
    onCancelled(ends);
    setStep("done");
  }

  async function sendNote() {
    if (!note.trim()) return;
    setBusy(true);
    const res = await changePro({ action: "note", note });
    setBusy(false);
    if (res.ok) setNoteSent(true);
    else setError(res.error ?? "Something went wrong. Try again.");
  }

  const tile = (kept: boolean, label: string) => (
    <div key={label} style={{
      padding: "var(--uf-s3) var(--uf-s4)", borderRadius: "var(--uf-r-card)", display: "flex", flexDirection: "column", gap: "var(--uf-s2)",
      background: kept ? "var(--uf-card)" : "var(--uf-surface-2)", border: kept ? "1px solid var(--uf-border-2)" : "1px solid transparent",
    }}>
      <span style={{ color: kept ? "var(--uf-green)" : "var(--uf-ink-2)", display: "flex" }} aria-label={kept ? "You keep" : "Ends"} role="img">
        {kept ? <Icon name="positive" size={20} /> : <svg width={20} height={20} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" aria-hidden><path d="M6 12h12" /></svg>}
      </span>
      <span style={{ fontSize: 15, fontWeight: 600, color: "var(--uf-ink)" }}>{label}</span>
    </div>
  );

  const stepLabel = step === "reason" ? "Step 1 of 3" : step === "keep" ? "Step 2 of 3" : "Step 3 of 3";
  const title = step === "reason" ? "What changed?"
    : step === "keep" ? (freedomLabel ? "Your freedom date stays" : "Your plan stays")
    : reason === "goal_reached" ? `You did it${firstName ? `, ${firstName}` : ""}` : `Thanks${firstName ? `, ${firstName}` : ""}`;

  return (
    <div onClick={close} style={{ position: "fixed", inset: 0, zIndex: 10000, background: "var(--uf-scrim)", display: "flex", alignItems: "center", justifyContent: "center", padding: "var(--uf-s4)" }}>
      <div role="dialog" aria-modal="true" aria-labelledby="uf-cancel-title" onClick={(e) => e.stopPropagation()}
        onKeyDown={(e) => { if (e.key === "Escape") close(); }}
        style={{ background: "var(--uf-bg)", border: "1px solid var(--uf-border)", borderRadius: "var(--uf-r-modal)", padding: "var(--uf-s5)", maxWidth: 420, width: "100%", maxHeight: "92vh", overflowY: "auto", boxShadow: "var(--uf-e3)", display: "flex", flexDirection: "column", gap: "var(--uf-s3)" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <span className="uf-t-small" style={{ fontWeight: 700, color: "var(--uf-ink-2)" }}>{stepLabel}</span>
          <button type="button" aria-label={step === "done" ? "Close" : "Close and keep Pro"} onClick={close}
            style={{ width: 44, height: 44, border: 0, background: "transparent", color: "var(--uf-ink-2)", cursor: "pointer", display: "grid", placeItems: "center" }}>
            <svg width={20} height={20} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" aria-hidden><path d="M6 6l12 12M18 6L6 18" /></svg>
          </button>
        </div>
        <h2 id="uf-cancel-title" style={{ margin: 0, fontFamily: "var(--uf-font-display)", fontSize: 28, fontWeight: 600, lineHeight: 1.15, color: "var(--uf-ink)" }}>{title}</h2>

        {step === "reason" && (<>
          {CANCEL_REASONS.map((r) => (
            <button key={r.key} type="button" onClick={() => { setReason(r.key); trackCancelFlow({ step: "reason", reason: r.key }); setStep("keep"); }}
              style={{ display: "flex", alignItems: "center", gap: "var(--uf-s3)", minHeight: 64, padding: "var(--uf-s3) var(--uf-s4)", borderRadius: "var(--uf-r-card)", border: "1px solid var(--uf-border-2)", background: "var(--uf-card)", textAlign: "left", font: "inherit", fontSize: 15, fontWeight: 600, color: "var(--uf-ink)", cursor: "pointer" }}>
              <span aria-hidden style={{ width: 40, height: 40, flex: "none", borderRadius: 12, display: "grid", placeItems: "center", background: r.key === "goal_reached" ? "var(--uf-teal-soft)" : "var(--uf-surface)", color: "var(--uf-ink)" }}>
                <Icon name={REASON_ICON[r.key]} size={20} />
              </span>
              {r.label}
            </button>
          ))}
          <Button variant="ghost" onClick={() => cancel(null)} disabled={busy}>{busy ? "Cancelling…" : "Skip and cancel Pro"}</Button>
        </>)}

        {step === "keep" && (<>
          {freedomLabel && (
            <div style={{ padding: "var(--uf-s4)", borderRadius: "var(--uf-r-card)", background: "var(--uf-teal-soft)", display: "flex", flexDirection: "column", gap: 4 }}>
              <span className="uf-t-small" style={{ fontWeight: 700, color: "var(--uf-teal-deep)" }}>Free forever</span>
              <span style={{ fontFamily: "var(--uf-font-display)", fontSize: 32, color: "var(--uf-ink)" }}>{freedomLabel}</span>
            </div>
          )}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(2, minmax(0, 1fr))", gap: "var(--uf-s2)" }}>
            {tile(true, "Budget, plan, Today")}
            {tile(true, "1 bank")}
            {tile(false, bankCount > 1 ? `Your other ${bankCount - 1} bank${bankCount > 2 ? "s" : ""}` : "More banks")}
            {tile(false, "AI spending tags")}
          </div>
          <Button variant="primary" size="lg" onClick={close} disabled={busy}>Keep Pro</Button>
          <Button variant="danger" onClick={() => cancel(reason)} disabled={busy}>{busy ? "Cancelling…" : "Cancel Pro"}</Button>
        </>)}

        {step === "done" && (<>
          <div style={{ padding: "var(--uf-s4)", borderRadius: "var(--uf-r-card)", background: "var(--uf-card)", border: "1px solid var(--uf-border-2)", display: "flex", alignItems: "center", gap: "var(--uf-s3)" }}>
            <span style={{ color: "var(--uf-green)", display: "flex" }} aria-hidden><Icon name="calendar" size={22} /></span>
            <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
              <span className="uf-t-small" style={{ fontWeight: 700, color: "var(--uf-ink-2)" }}>Pro until</span>
              <span style={{ fontFamily: "var(--uf-font-mono)", fontSize: 18, fontVariantNumeric: "tabular-nums", color: "var(--uf-ink)" }}>{fmtEnds(endedAt)}</span>
            </div>
          </div>
          <div style={{ padding: "var(--uf-s4)", borderRadius: "var(--uf-r-card)", background: "var(--uf-card)", border: "1px solid var(--uf-border-2)", display: "flex", alignItems: "center", gap: "var(--uf-s3)" }}>
            <span style={{ color: "var(--uf-green)", display: "flex" }} aria-hidden><Icon name="card" size={22} /></span>
            <span style={{ fontSize: 15, fontWeight: 600, color: "var(--uf-ink)" }}>No more charges</span>
          </div>
          {noteSent ? (
            <span className="uf-t-small" style={{ color: "var(--uf-ink-2)" }}>Got it. Thank you.</span>
          ) : (<>
            <label htmlFor="uf-cancel-note" className="uf-t-small" style={{ fontWeight: 700, color: "var(--uf-ink-2)", marginTop: "var(--uf-s2)" }}>
              {reason === "bank_sync" ? "Which bank? (optional)" : "One thing we should fix? (optional)"}
            </label>
            <textarea id="uf-cancel-note" rows={3} maxLength={500} value={note} onChange={(e) => setNote(e.target.value)}
              style={{ borderRadius: "var(--uf-r-control)", border: "1px solid var(--uf-border-2)", background: "var(--uf-card)", color: "var(--uf-ink)", padding: "var(--uf-s3)", font: "inherit", fontSize: 15, resize: "none" }} />
            {note.trim() && <Button variant="secondary" size="sm" onClick={sendNote} disabled={busy}>{busy ? "Sending…" : "Send"}</Button>}
          </>)}
          <Button variant="secondary" size="lg" onClick={onClose}>Back to Profile</Button>
        </>)}

        {error && <Alert tone="critical" title={error} />}
      </div>
    </div>
  );
}
