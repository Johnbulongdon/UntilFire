"use client";

import { Fragment, useCallback, useEffect, useState } from "react";
// Type-only import: erased at compile time, so the server-side email builder
// never reaches the client bundle. The composer and the renderer described the
// same item in two places, which is how a field added to one silently goes
// missing in the other.
import {
  buildAdminAnnouncementEmail,
  buildMonthlyUpdateEmail,
  type UpdateItem,
} from "@/lib/email-html";

type Segment = "all" | "free" | "pro";
type Template = "announcement" | "monthly_update";
type SendResult = { sent: number; total: number } | string | null;
type Stage = { key: string; label: string; count: number; of: number | null };
type SendStat = {
  id: string; subject: string; segment: string; recipients: number; sentAt: string;
  tracked: boolean; delivered: number; opened: number; clicked: number;
  openRate: number | null; clickRate: number | null;
  stages: Stage[];
};
type Recipient = {
  email: string;
  stage: "sent" | "delivered" | "opened" | "clicked";
  at: Partial<Record<string, string>>;
  opens: number; clicks: number; link: string | null;
  bounced: boolean; complained: boolean;
};
type TrackingState = { domain?: string; status?: string; openTracking: boolean; clickTracking: boolean };

interface Draft {
  id: string;
  name: string;
  template: Template;
  segment: Segment;
  subject: string;
  content: Record<string, unknown>;
  updated_at: string;
}

function defaultMonthLabel(): string {
  return new Date().toLocaleString("en-US", { month: "long", year: "numeric" });
}

/**
 * Turns the plain text of the composer into email HTML, and — the part that
 * matters — turns bare URLs into real anchors.
 *
 * Resend's click tracking works by rewriting <a href> at send time. A URL
 * typed into a textarea is just text, so it was never rewritten and never
 * counted, even though most mail clients render it as clickable. That is why
 * a link pasted into the body produced no click events.
 */
function paragraphsToHtml(body: string): string {
  return body
    .split(/\n{2,}/)
    .filter(Boolean)
    .map((p) => `<p style="margin:0 0 14px">${linkify(p).replace(/\n/g, "<br>")}</p>`)
    .join("");
}

function linkify(text: string): string {
  return text.replace(/(https?:\/\/[^\s<>"']+)/g, (raw) => {
    // Peel trailing punctuation back out of the href. "…/dashboard." at the
    // end of a sentence would otherwise link to a path with a full stop on
    // it, and "(…/pricing)" would carry the bracket — both dead links, and
    // dead in a way that still looks fine in the composer.
    let url = raw;
    let tail = "";
    while (url.length > 0) {
      const last = url[url.length - 1];
      const isSentence = ".,;:!?".includes(last);
      // Only strip a closing bracket the URL did not open itself — some real
      // URLs legitimately contain a balanced pair.
      const isStrayCloser = last === ")" && !url.includes("(");
      if (!isSentence && !isStrayCloser) break;
      tail = last + tail;
      url = url.slice(0, -1);
    }
    if (!url) return raw;
    return `<a href="${url}" style="color:#12856A;text-decoration:underline">${url}</a>${tail}`;
  });
}

export default function EmailsTab({ token }: { token: string }) {
  const [template, setTemplate] = useState<Template>("announcement");
  const [segment, setSegment] = useState<Segment>("all");
  const [subject, setSubject] = useState("");

  // Announcement fields
  const [heading, setHeading] = useState("");
  const [body, setBody] = useState("");

  // Monthly update fields
  const [monthLabel, setMonthLabel] = useState(defaultMonthLabel());
  const [intro, setIntro] = useState("");
  const [newItems, setNewItems] = useState<UpdateItem[]>([]);
  const [fixItems, setFixItems] = useState<UpdateItem[]>([]);
  const [ctaLabel, setCtaLabel] = useState("");
  const [ctaHref, setCtaHref] = useState("");

  // Drafts / templates
  const [drafts, setDrafts] = useState<Draft[]>([]);
  const [draftsLoading, setDraftsLoading] = useState(true);
  const [currentDraftId, setCurrentDraftId] = useState<string | null>(null);
  const [draftName, setDraftName] = useState("");
  const [draftSaving, setDraftSaving] = useState(false);
  const [draftError, setDraftError] = useState("");
  const [confirmDeleteDraft, setConfirmDeleteDraft] = useState(false);

  const [sending, setSending] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [result, setResult] = useState<SendResult>(null);

  const loadDrafts = useCallback(async () => {
    setDraftsLoading(true);
    try {
      const res = await fetch("/api/admin/emails/drafts", { headers: { Authorization: `Bearer ${token}` } });
      const data = await res.json();
      if (res.ok) setDrafts(data.drafts ?? []);
    } catch {
      // draft list is a convenience, not required to compose/send
    }
    setDraftsLoading(false);
  }, [token]);

  useEffect(() => {
    loadDrafts();
  }, [loadDrafts]);

  function resetForm() {
    setCurrentDraftId(null);
    setDraftName("");
    setConfirmDeleteDraft(false);
    setTemplate("announcement");
    setSegment("all");
    setSubject("");
    setHeading("");
    setBody("");
    setMonthLabel(defaultMonthLabel());
    setIntro("");
    setNewItems([]);
    setFixItems([]);
    setCtaLabel("");
    setCtaHref("");
    setResult(null);
  }

  function loadDraft(draft: Draft) {
    const c = draft.content ?? {};
    setCurrentDraftId(draft.id);
    setDraftName(draft.name);
    setConfirmDeleteDraft(false);
    setTemplate(draft.template);
    setSegment(draft.segment);
    setSubject(draft.subject);
    if (draft.template === "monthly_update") {
      setMonthLabel(typeof c.monthLabel === "string" ? c.monthLabel : defaultMonthLabel());
      setIntro(typeof c.intro === "string" ? c.intro : "");
      setNewItems(Array.isArray(c.newItems) ? (c.newItems as UpdateItem[]) : []);
      setFixItems(Array.isArray(c.fixItems) ? (c.fixItems as UpdateItem[]) : []);
      setCtaLabel(typeof c.ctaLabel === "string" ? c.ctaLabel : "");
      setCtaHref(typeof c.ctaHref === "string" ? c.ctaHref : "");
      setHeading("");
      setBody("");
    } else {
      setHeading(typeof c.heading === "string" ? c.heading : "");
      setBody(typeof c.body === "string" ? c.body : "");
      setMonthLabel(defaultMonthLabel());
      setIntro("");
      setNewItems([]);
      setFixItems([]);
      // Announcements carry a button too now, so it has to survive a reload —
      // clearing it here would drop it from every saved draft on open.
      setCtaLabel(typeof c.ctaLabel === "string" ? c.ctaLabel : "");
      setCtaHref(typeof c.ctaHref === "string" ? c.ctaHref : "");
    }
    setResult(null);
  }

  // Mirrors app/api/admin/emails/send/route.ts. A name is passed so the
  // greeting is visible here rather than only discovered after sending.
  const previewHtml =
    template === "monthly_update"
      ? buildMonthlyUpdateEmail({
          monthLabel: monthLabel || "this month",
          intro: intro || "Your intro sentence here.",
          newItems,
          fixItems,
          ctaLabel: ctaLabel || undefined,
          ctaHref: ctaHref || undefined,
          unsubscribeUrl: "#",
          recipientName: "Alex Rivera",
        })
      : buildAdminAnnouncementEmail({
          heading: heading || "Your heading here",
          bodyHtml: paragraphsToHtml(body || "Your message here."),
          unsubscribeUrl: "#",
          ctaLabel: ctaLabel || undefined,
          ctaHref: ctaHref || undefined,
        });

  function currentContent(): Record<string, unknown> {
    if (template === "monthly_update") {
      return { monthLabel, intro, newItems, fixItems, ctaLabel, ctaHref };
    }
    return { heading, body, ctaLabel, ctaHref };
  }

  async function saveDraft(asNew: boolean) {
    setDraftSaving(true);
    setDraftError("");
    const name =
      draftName.trim() || (template === "monthly_update" ? `Monthly update — ${monthLabel}` : "Untitled draft");
    const payload = { name, template, segment, subject, content: currentContent() };
    const useId = !asNew && currentDraftId;
    try {
      const res = await fetch(
        useId ? `/api/admin/emails/drafts/${currentDraftId}` : "/api/admin/emails/drafts",
        {
          method: useId ? "PATCH" : "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
          body: JSON.stringify(payload),
        }
      );
      const data = await res.json();
      if (!res.ok) {
        setDraftError(data.error ?? "Could not save draft");
      } else {
        setCurrentDraftId(data.draft.id);
        setDraftName(data.draft.name);
        await loadDrafts();
      }
    } catch {
      setDraftError("Could not save draft");
    }
    setDraftSaving(false);
  }

  async function deleteDraft() {
    if (!currentDraftId) return;
    setDraftSaving(true);
    try {
      await fetch(`/api/admin/emails/drafts/${currentDraftId}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
    } catch {
      // best-effort; refresh the list regardless
    }
    resetForm();
    await loadDrafts();
    setDraftSaving(false);
  }

  async function send() {
    setSending(true);
    setResult(null);
    const bodyHtml = paragraphsToHtml(body);
    const payload =
      template === "monthly_update"
        ? { template, subject, segment, monthLabel, intro, newItems, fixItems, ctaLabel, ctaHref }
        : { template, subject, segment, heading, bodyHtml, ctaLabel, ctaHref };
    try {
      const res = await fetch("/api/admin/emails/send", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      setResult(res.ok ? { sent: data.sent, total: data.total } : (data.error ?? "Send failed"));
    } catch {
      setResult("Send failed");
    }
    setSending(false);
    setConfirming(false);
  }

  const canSend =
    subject.trim() &&
    (template === "announcement"
      ? heading.trim() && body.trim()
      : monthLabel.trim() && intro.trim() && (newItems.length > 0 || fixItems.length > 0));

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
    <SendStats token={token} />
    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 24 }}>
      <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
        <div style={{ background: "#F8FAFC", border: "1px solid #E2E8F0", borderRadius: 10, padding: 12, display: "flex", flexDirection: "column", gap: 10 }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: "#94A3B8", textTransform: "uppercase" }}>
            Drafts &amp; templates
          </div>
          <select
            value=""
            disabled={draftsLoading || drafts.length === 0}
            onChange={(e) => {
              const draft = drafts.find((d) => d.id === e.target.value);
              if (draft) loadDraft(draft);
            }}
            style={inputStyle}
          >
            <option value="" disabled>
              {draftsLoading ? "Loading…" : drafts.length === 0 ? "No saved drafts yet" : "Load a draft or template…"}
            </option>
            {drafts.map((d) => (
              <option key={d.id} value={d.id}>
                {d.name} — {new Date(d.updated_at).toLocaleDateString()}
              </option>
            ))}
          </select>

          <div style={{ display: "flex", gap: 6 }}>
            <input
              value={draftName}
              onChange={(e) => setDraftName(e.target.value)}
              placeholder="Draft name (e.g. Monthly update base)"
              style={{ ...inputStyle, flex: 1 }}
            />
          </div>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <button disabled={draftSaving} onClick={() => saveDraft(false)} style={smallBtn}>
              {currentDraftId ? "Save draft" : "Save as draft"}
            </button>
            {currentDraftId && (
              <button disabled={draftSaving} onClick={() => saveDraft(true)} style={smallBtn}>
                Save as new
              </button>
            )}
            {currentDraftId && !confirmDeleteDraft && (
              <button disabled={draftSaving} onClick={() => setConfirmDeleteDraft(true)} style={{ ...smallBtn, color: "#DC2626" }}>
                Delete draft
              </button>
            )}
            {currentDraftId && confirmDeleteDraft && (
              <>
                <button disabled={draftSaving} onClick={deleteDraft} style={{ ...smallBtn, color: "#fff", background: "#DC2626", borderColor: "#DC2626" }}>
                  Confirm delete
                </button>
                <button disabled={draftSaving} onClick={() => setConfirmDeleteDraft(false)} style={smallBtn}>
                  Cancel
                </button>
              </>
            )}
            <button disabled={draftSaving} onClick={resetForm} style={smallBtn}>
              New
            </button>
          </div>
          {draftError && <p style={{ margin: 0, fontSize: 12, color: "#DC2626" }}>{draftError}</p>}
        </div>

        <Field label="Template">
          <select value={template} onChange={(e) => setTemplate(e.target.value as Template)} style={inputStyle}>
            <option value="announcement">Announcement (freeform)</option>
            <option value="monthly_update">Monthly update (New / Fixed)</option>
          </select>
        </Field>
        <Field label="Segment">
          <select value={segment} onChange={(e) => setSegment(e.target.value as Segment)} style={inputStyle}>
            <option value="all">All users</option>
            <option value="free">Free users only</option>
            <option value="pro">Pro users only</option>
          </select>
        </Field>
        <Field label="Subject (email subject line)">
          <input
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            style={inputStyle}
            placeholder={template === "monthly_update" ? `What's new in ${monthLabel}` : "e.g. New: Expat FIRE globe"}
          />
        </Field>

        {template === "announcement" ? (
          <>
            <Field label="Heading (large text inside the email)">
              <input value={heading} onChange={(e) => setHeading(e.target.value)} style={inputStyle} placeholder="e.g. We just shipped something new" />
            </Field>
            <Field label="Message">
              <textarea
                value={body}
                onChange={(e) => setBody(e.target.value)}
                rows={10}
                style={{ ...inputStyle, resize: "vertical" }}
                placeholder="Write your update. Leave a blank line to start a new paragraph."
              />
            </Field>
          </>
        ) : (
          <>
            <Field label="Month label">
              <input value={monthLabel} onChange={(e) => setMonthLabel(e.target.value)} style={inputStyle} placeholder="e.g. August 2026" />
            </Field>
            <Field label="Intro">
              <textarea
                value={intro}
                onChange={(e) => setIntro(e.target.value)}
                rows={3}
                style={{ ...inputStyle, resize: "vertical" }}
                placeholder="One or two sentences summarizing the month."
              />
            </Field>
            <ItemListEditor label="New this month" items={newItems} onChange={setNewItems} />
            <ItemListEditor label="Fixed & improved" items={fixItems} onChange={setFixItems} />
          </>
        )}

        {/* Both templates take a button. A tracked click needs a real <a>, and
            a button is the one the reader is most likely to press. */}
        <div style={{ display: "flex", gap: 10 }}>
          <Field label="Button label (optional)">
            <input value={ctaLabel} onChange={(e) => setCtaLabel(e.target.value)} style={inputStyle} placeholder="e.g. See what's new" />
          </Field>
          <Field label="Button link (optional)">
            <input value={ctaHref} onChange={(e) => setCtaHref(e.target.value)} style={inputStyle} placeholder="https://www.untilfire.com/..." />
          </Field>
        </div>
        {ctaHref && !/^https:\/\//i.test(ctaHref.trim()) && (
          <p style={{ fontSize: 12, color: "#B45309", margin: 0 }}>
            The button link must start with https:// or it will be dropped from the email.
          </p>
        )}

        {!confirming ? (
          <button disabled={!canSend} onClick={() => setConfirming(true)} style={{ ...primaryBtn, opacity: canSend ? 1 : 0.5 }}>
            Review &amp; send
          </button>
        ) : (
          <div style={{ background: "#FFFBEB", border: "1px solid #FDE68A", borderRadius: 10, padding: 14 }}>
            <p style={{ margin: "0 0 10px", fontSize: 13, color: "#92400E" }}>
              This sends a real email now to every {segment === "all" ? "" : segment + " "}user who hasn&apos;t unsubscribed. This can&apos;t be undone.
            </p>
            <div style={{ display: "flex", gap: 8 }}>
              <button disabled={sending} onClick={send} style={primaryBtn}>{sending ? "Sending…" : "Yes, send now"}</button>
              <button disabled={sending} onClick={() => setConfirming(false)} style={{ ...primaryBtn, background: "#fff", color: "#19181E", border: "1px solid #E2E8F0" }}>Cancel</button>
            </div>
          </div>
        )}

        {result && (
          <p style={{ fontSize: 13, color: typeof result === "string" ? "#DC2626" : "#059669", fontWeight: 700 }}>
            {typeof result === "string" ? result : `Sent ${result.sent} of ${result.total} emails.`}
          </p>
        )}
      </div>

      <div>
        <div style={{ display: "flex", alignItems: "baseline", gap: 8, marginBottom: 8 }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: "#94A3B8", textTransform: "uppercase" }}>Preview</div>
          <div style={{ fontSize: 11, color: "#94A3B8" }}>the real email, rendered</div>
        </div>
        {/* The preview used to be a hand-built React approximation of the
            email, which meant it could look right while the thing that
            actually sends looked wrong. This renders the exact HTML the send
            route builds, in an iframe so the email's own CSS cannot leak into
            the admin page. */}
        <iframe
          title="Email preview"
          srcDoc={previewHtml}
          sandbox=""
          style={{
            width: "100%", height: 900, border: "1px solid #E2E8F0",
            borderRadius: 12, background: "#fff", display: "block",
          }}
        />
      </div>
    </div>
    </div>
  );
}

/**
 * What happened to the mail already sent. Lives above the composer because
 * the last send is the most useful thing to know before writing the next one.
 */
function SendStats({ token }: { token: string | null }) {
  const [rows, setRows] = useState<SendStat[] | null>(null);
  const [tracking, setTracking] = useState<TrackingState | null>(null);
  const [openSend, setOpenSend] = useState<string | null>(null);
  // Cached per send so collapsing and reopening does not refetch.
  const [people, setPeople] = useState<Record<string, Recipient[]>>({});
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  const load = useCallback(() => {
    if (!token) return;
    const h = { Authorization: `Bearer ${token}` };
    fetch("/api/admin/emails/stats", { headers: h })
      .then((r) => r.json())
      .then((d) => setRows(d.sends ?? []))
      .catch(() => setRows([]));
    fetch("/api/admin/emails/tracking", { headers: h })
      .then((r) => r.json())
      .then((d) => setTracking(d.error ? null : d))
      .catch(() => setTracking(null));
  }, [token]);

  useEffect(load, [load]);

  async function toggleSend(id: string) {
    if (openSend === id) { setOpenSend(null); return; }
    setOpenSend(id);
    if (people[id] || !token) return;
    try {
      const res = await fetch(`/api/admin/emails/stats?sendId=${encodeURIComponent(id)}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const d = await res.json();
      setPeople((p) => ({ ...p, [id]: d.recipients ?? [] }));
    } catch {
      setPeople((p) => ({ ...p, [id]: [] }));
    }
  }

  async function enable() {
    if (!token) return;
    setBusy(true);
    setErr("");
    try {
      const res = await fetch("/api/admin/emails/tracking", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ openTracking: true, clickTracking: true }),
      });
      const d = await res.json();
      if (!res.ok) setErr(d.error ?? "Could not update tracking");
      else load();
    } catch {
      setErr("Could not update tracking");
    }
    setBusy(false);
  }

  const on = tracking?.openTracking && tracking?.clickTracking;

  return (
    <div style={{ background: "#fff", border: "1px solid #E2E8F0", borderRadius: 12, padding: 16 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12, flexWrap: "wrap" }}>
        <div style={{ fontSize: 11, fontWeight: 700, color: "#94A3B8", textTransform: "uppercase" }}>Results</div>
        {tracking && (
          <span style={{
            fontSize: 11, fontWeight: 700, padding: "3px 9px", borderRadius: 999,
            background: on ? "#ECFDF5" : "#FEF3C7", color: on ? "#065F46" : "#92400E",
          }}>
            {on ? "Tracking on" : "Tracking off"}
          </span>
        )}
        {tracking && !on && (
          <button onClick={enable} disabled={busy} style={smallBtn}>
            {busy ? "Turning on…" : "Turn on open + click tracking"}
          </button>
        )}
        {err && <span style={{ fontSize: 12, color: "#DC2626" }}>{err}</span>}
      </div>

      {tracking && !on && (
        <p style={{ fontSize: 12, color: "#64748B", margin: "0 0 12px", lineHeight: 1.6 }}>
          Tracking applies to mail sent after it is switched on — it cannot be applied to a send that already went out.
        </p>
      )}

      {rows === null ? (
        <p style={{ fontSize: 13, color: "#94A3B8", margin: 0 }}>Loading…</p>
      ) : rows.length === 0 ? (
        <p style={{ fontSize: 13, color: "#94A3B8", margin: 0 }}>Nothing sent yet.</p>
      ) : (
        <div style={{ overflow: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
            <thead>
              <tr style={{ background: "#F8FAFC", textAlign: "left" }}>
                {["Subject", "Sent", "To", "Delivered", "Opened", "Clicked"].map((h) => (
                  <th key={h} style={{ padding: "8px 10px", fontWeight: 700, color: "#64748B", fontSize: 11, textTransform: "uppercase", whiteSpace: "nowrap" }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <Fragment key={r.id}>
                  <tr
                    onClick={() => r.tracked && toggleSend(r.id)}
                    style={{ borderTop: "1px solid #F1F5F9", cursor: r.tracked ? "pointer" : "default" }}
                  >
                    <td style={{ padding: "8px 10px", maxWidth: 260, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {r.tracked && (
                        <span style={{ color: "#94A3B8", marginRight: 6, fontSize: 10 }}>
                          {openSend === r.id ? "\u25bc" : "\u25b6"}
                        </span>
                      )}
                      {r.subject}
                    </td>
                    <td style={{ padding: "8px 10px", color: "#64748B", whiteSpace: "nowrap" }}>
                      {new Date(r.sentAt).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                    </td>
                    <td style={{ padding: "8px 10px", color: "#64748B" }}>{r.recipients}</td>
                    {/* A send with no events at all is not a zero — it is a send
                        that predates tracking, and saying "0%" would be a lie. */}
                    {!r.tracked ? (
                      <td colSpan={3} style={{ padding: "8px 10px", color: "#94A3B8" }}>Not tracked</td>
                    ) : (
                      <>
                        <td style={{ padding: "8px 10px" }}>{r.delivered}</td>
                        <td style={{ padding: "8px 10px" }}>{r.openRate === null ? "—" : `${r.openRate}% (${r.opened})`}</td>
                        <td style={{ padding: "8px 10px" }}>{r.clickRate === null ? "—" : `${r.clickRate}% (${r.clicked})`}</td>
                      </>
                    )}
                  </tr>

                  {openSend === r.id && (
                    <tr>
                      <td colSpan={6} style={{ padding: "4px 10px 16px", background: "#F8FAFC" }}>
                        <StageStrip stages={r.stages} />
                        <RecipientList rows={people[r.id]} />
                      </td>
                    </tr>
                  )}
                </Fragment>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

/**
 * The stages of one send, each as a share of the stage before it.
 *
 * Opened and clicked are measured against DELIVERED, not against recipients:
 * a message that bounced was never a chance to be opened, and dividing by it
 * understates how the mail that actually arrived performed.
 */
function StageStrip({ stages }: { stages: Stage[] }) {
  const top = stages[0]?.count || 1;
  return (
    <div style={{ display: "flex", gap: 8, flexWrap: "wrap", margin: "10px 0 14px" }}>
      {stages.map((st) => (
        <div key={st.key} style={{ flex: "1 1 120px", minWidth: 120 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 4 }}>
            <span style={{ fontSize: 11, fontWeight: 700, color: "#64748B", textTransform: "uppercase" }}>{st.label}</span>
            <span style={{ fontSize: 13, fontWeight: 800, color: "#19181E" }}>{st.count}</span>
          </div>
          <div style={{ height: 6, background: "#E2E8F0", borderRadius: 99, overflow: "hidden" }}>
            <div style={{ width: `${Math.min(100, (st.count / top) * 100)}%`, height: "100%", background: "#059669", borderRadius: 99 }} />
          </div>
          <div style={{ fontSize: 11, color: "#94A3B8", marginTop: 3 }}>
            {st.of === null ? "recipients" : `${st.of}% of previous`}
          </div>
        </div>
      ))}
    </div>
  );
}

const STAGE_LABEL: Record<string, { text: string; fg: string; bg: string }> = {
  sent: { text: "Sent", fg: "#64748B", bg: "#F1F5F9" },
  delivered: { text: "Delivered", fg: "#0369A1", bg: "#E0F2FE" },
  opened: { text: "Opened", fg: "#92400E", bg: "#FEF3C7" },
  clicked: { text: "Clicked", fg: "#065F46", bg: "#ECFDF5" },
};

/** Who reached how far. At this list size the names matter more than the rate. */
function RecipientList({ rows }: { rows: Recipient[] | undefined }) {
  if (!rows) return <p style={{ fontSize: 12.5, color: "#94A3B8", margin: 0 }}>Loading recipients…</p>;
  if (rows.length === 0) return <p style={{ fontSize: 12.5, color: "#94A3B8", margin: 0 }}>No events for this send.</p>;

  return (
    <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12.5 }}>
      <thead>
        <tr style={{ textAlign: "left", color: "#94A3B8" }}>
          <th style={{ padding: "4px 8px 4px 0", fontWeight: 700 }}>Recipient</th>
          <th style={{ padding: "4px 8px", fontWeight: 700 }}>Reached</th>
          <th style={{ padding: "4px 8px", fontWeight: 700 }}>Opens</th>
          <th style={{ padding: "4px 8px", fontWeight: 700 }}>Clicks</th>
          <th style={{ padding: "4px 0", fontWeight: 700 }}>Link clicked</th>
        </tr>
      </thead>
      <tbody>
        {rows.map((p) => {
          const lab = STAGE_LABEL[p.stage] ?? STAGE_LABEL.sent;
          return (
            <tr key={p.email} style={{ borderTop: "1px solid #E2E8F0" }}>
              <td style={{ padding: "6px 8px 6px 0", color: "#19181E", maxWidth: 220, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                {p.email}
                {p.bounced && <span style={{ color: "#DC2626", fontWeight: 800, marginLeft: 6, fontSize: 10.5 }}>BOUNCED</span>}
                {p.complained && <span style={{ color: "#DC2626", fontWeight: 800, marginLeft: 6, fontSize: 10.5 }}>SPAM</span>}
              </td>
              <td style={{ padding: "6px 8px" }}>
                <span style={{ fontSize: 10.5, fontWeight: 800, color: lab.fg, background: lab.bg, padding: "2px 8px", borderRadius: 99, textTransform: "uppercase" }}>
                  {lab.text}
                </span>
              </td>
              <td style={{ padding: "6px 8px", color: p.opens ? "#19181E" : "#CBD5E1" }}>{p.opens || "–"}</td>
              <td style={{ padding: "6px 8px", color: p.clicks ? "#19181E" : "#CBD5E1" }}>{p.clicks || "–"}</td>
              <td style={{ padding: "6px 0", color: "#64748B", maxWidth: 260, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                {p.link ?? ""}
              </td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}

function ItemListEditor({
  label,
  items,
  onChange,
}: {
  label: string;
  items: UpdateItem[];
  onChange: (items: UpdateItem[]) => void;
}) {
  function update(i: number, field: "title" | "desc" | "image", value: string) {
    const next = items.slice();
    next[i] = { ...next[i], [field]: value };
    onChange(next);
  }
  function remove(i: number) {
    onChange(items.filter((_, idx) => idx !== i));
  }
  function add() {
    onChange([...items, { title: "", desc: "" }]);
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
      <div style={{ fontSize: 12, fontWeight: 700, color: "#64748B" }}>{label}</div>
      {items.map((it, i) => (
        <div key={i} style={{ display: "flex", gap: 6, alignItems: "flex-start", background: "#F8FAFC", border: "1px solid #E2E8F0", borderRadius: 8, padding: 8 }}>
          <div style={{ display: "flex", flexDirection: "column", gap: 4, flex: 1 }}>
            <input value={it.title} onChange={(e) => update(i, "title", e.target.value)} placeholder="Title" style={inputStyle} />
            <input value={it.desc} onChange={(e) => update(i, "desc", e.target.value)} placeholder="One-line description" style={inputStyle} />
            <input
              value={it.image || ""}
              onChange={(e) => update(i, "image", e.target.value)}
              placeholder="Screenshot URL (optional) — https://www.untilfire.com/email/..."
              style={inputStyle}
            />
          </div>
          <button onClick={() => remove(i)} style={smallBtn}>Remove</button>
        </div>
      ))}
      <button onClick={add} style={{ ...smallBtn, alignSelf: "flex-start" }}>+ Add item</button>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label style={{ display: "flex", flexDirection: "column", gap: 6, fontSize: 12, fontWeight: 700, color: "#64748B" }}>
      {label}
      {children}
    </label>
  );
}

const inputStyle: React.CSSProperties = {
  fontSize: 14,
  padding: "10px 12px",
  border: "1px solid #E2E8F0",
  borderRadius: 8,
  fontFamily: "inherit",
  color: "#19181E",
};

const primaryBtn: React.CSSProperties = {
  fontSize: 14,
  fontWeight: 700,
  padding: "10px 18px",
  borderRadius: 8,
  border: "none",
  background: "#059669",
  color: "#fff",
  cursor: "pointer",
  fontFamily: "inherit",
};

const smallBtn: React.CSSProperties = {
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
