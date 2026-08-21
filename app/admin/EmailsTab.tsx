"use client";

import { useCallback, useEffect, useState } from "react";

type Segment = "all" | "free" | "pro";
type Template = "announcement" | "monthly_update";
type UpdateItem = { title: string; desc: string };
type SendResult = { sent: number; total: number } | string | null;

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

function paragraphsToHtml(body: string): string {
  return body
    .split(/\n{2,}/)
    .filter(Boolean)
    .map((p) => `<p style="margin:0 0 14px">${p.replace(/\n/g, "<br>")}</p>`)
    .join("");
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
      setCtaLabel("");
      setCtaHref("");
    }
    setResult(null);
  }

  function currentContent(): Record<string, unknown> {
    if (template === "monthly_update") {
      return { monthLabel, intro, newItems, fixItems, ctaLabel, ctaHref };
    }
    return { heading, body };
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
        : { template, subject, segment, heading, bodyHtml };
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
            <div style={{ display: "flex", gap: 10 }}>
              <Field label="CTA label (optional)">
                <input value={ctaLabel} onChange={(e) => setCtaLabel(e.target.value)} style={inputStyle} placeholder="e.g. See what's new" />
              </Field>
              <Field label="CTA link (optional)">
                <input value={ctaHref} onChange={(e) => setCtaHref(e.target.value)} style={inputStyle} placeholder="https://untilfire.com/..." />
              </Field>
            </div>
          </>
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
        <div style={{ fontSize: 11, fontWeight: 700, color: "#94A3B8", textTransform: "uppercase", marginBottom: 8 }}>Preview</div>
        {template === "announcement" ? (
          <div style={{ background: "#fff", border: "1px solid #E2E8F0", borderRadius: 12, padding: 20 }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: "#22D3A5", textTransform: "uppercase", letterSpacing: 1 }}>Update</div>
            <div style={{ fontSize: 22, fontWeight: 800, color: "#003527", margin: "6px 0 14px" }}>{heading || "Your heading here"}</div>
            <div style={{ fontSize: 14, color: "#374151", lineHeight: 1.7, whiteSpace: "pre-wrap" }}>{body || "Your message here."}</div>
            <p style={{ marginTop: 20, paddingTop: 16, borderTop: "1px solid #F0F4F1", fontSize: 11, color: "#9CA3AF" }}>
              You&apos;re receiving this because you have an UntilFire account. Unsubscribe from these emails.
            </p>
          </div>
        ) : (
          <div style={{ background: "#fff", border: "1px solid #E2E8F0", borderRadius: 12, padding: 20, display: "flex", flexDirection: "column", gap: 16 }}>
            <div>
              <div style={{ fontSize: 11, fontWeight: 700, color: "#22D3A5", textTransform: "uppercase", letterSpacing: 1 }}>Monthly Update</div>
              <div style={{ fontSize: 22, fontWeight: 800, color: "#003527", margin: "6px 0 8px" }}>{`What's new in ${monthLabel || "…"}`}</div>
              <div style={{ fontSize: 14, color: "#374151", lineHeight: 1.7 }}>{intro || "Intro sentence here."}</div>
            </div>
            {newItems.length > 0 && <PreviewItemSection label="New this month" items={newItems} />}
            {fixItems.length > 0 && <PreviewItemSection label="Fixed & improved" items={fixItems} />}
            {ctaLabel && ctaHref && (
              <div>
                <span style={{ display: "inline-block", background: "#059669", color: "#fff", fontWeight: 700, fontSize: 13, padding: "10px 18px", borderRadius: 8 }}>
                  {ctaLabel}
                </span>
              </div>
            )}
            <p style={{ margin: 0, paddingTop: 16, borderTop: "1px solid #F0F4F1", fontSize: 11, color: "#9CA3AF" }}>
              You&apos;re receiving this because you have an UntilFire account. Unsubscribe from these emails.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

function PreviewItemSection({ label, items }: { label: string; items: UpdateItem[] }) {
  return (
    <div>
      <div style={{ fontSize: 11, fontWeight: 700, color: "#94A3B8", textTransform: "uppercase", marginBottom: 8 }}>{label}</div>
      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        {items.map((it, i) => (
          <div key={i}>
            <div style={{ fontSize: 14, fontWeight: 700, color: "#19181E" }}>{it.title || "Untitled"}</div>
            {it.desc && <div style={{ fontSize: 13, color: "#64748B" }}>{it.desc}</div>}
          </div>
        ))}
      </div>
    </div>
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
  function update(i: number, field: "title" | "desc", value: string) {
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
