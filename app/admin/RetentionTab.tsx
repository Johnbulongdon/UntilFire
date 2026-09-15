"use client";

import { Fragment, useEffect, useState } from "react";

/**
 * Retention — job health, funnel, and one row per user.
 *
 * Ordered by what you'd want to know if you opened this cold: is the machinery
 * running, where are people stopping, and then who specifically. Job health is
 * first because a broken job silently invalidates everything below it.
 */

type EmailState = "sent" | "missed" | "pending";

interface UserRow {
  id: string;
  email: string;
  displayName: string | null;
  createdAt: string;
  ageDays: number;
  lastSignInAt: string | null;
  returned: boolean;
  unsubscribed: boolean;
  emails: { event: string; label: string; sentAt: string | null; state: EmailState }[];
  activatedAt: string | null;
  bankConnectedAt: string | null;
  subscribedAt: string | null;
}

interface JobRun {
  id: string;
  started_at: string;
  finished_at: string | null;
  status: string;
  considered: number;
  acted: number;
  error: string | null;
}

interface JobHealth {
  job: string;
  health: "ok" | "stale" | "failing" | "never";
  expectedHours: number;
  lastRunAt: string | null;
  lastOkAt: string | null;
  runs: JobRun[];
}

interface Data {
  total: number;
  funnel: { event: string; label: string; count: number; fromPrevious: number; fromTop: number; drop?: boolean }[];
  cohorts: { week: string; size: number; steps: { event: string; count: number }[] }[];
  jobs: JobHealth[];
  users: UserRow[];
}

const INK = "#19181E";
const MUTED = "#64748B";
const FAINT = "#94A3B8";
const LINE = "#E2E8F0";
const GOOD = "#059669";
const BAD = "#DC2626";
const WARN = "#B45309";

const card: React.CSSProperties = {
  background: "#fff",
  border: `1px solid ${LINE}`,
  borderRadius: 12,
  padding: 18,
  marginBottom: 20,
};

const h2: React.CSSProperties = { fontSize: 15, fontWeight: 800, color: INK, margin: "0 0 2px" };
const sub: React.CSSProperties = { fontSize: 12.5, color: MUTED, margin: "0 0 16px" };

function ago(iso: string | null): string {
  if (!iso) return "never";
  const mins = Math.floor((Date.now() - new Date(iso).getTime()) / 60000);
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 48) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

function shortDate(iso: string | null): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "short" });
}

const HEALTH: Record<JobHealth["health"], { label: string; fg: string; bg: string }> = {
  ok: { label: "Running", fg: GOOD, bg: "#ECFDF5" },
  stale: { label: "Stale", fg: WARN, bg: "#FFFBEB" },
  failing: { label: "Failing", fg: BAD, bg: "#FEF2F2" },
  never: { label: "Never run", fg: BAD, bg: "#FEF2F2" },
};

export default function RetentionTab({ token }: { token: string }) {
  const [data, setData] = useState<Data | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [expanded, setExpanded] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/admin/retention", { headers: { Authorization: `Bearer ${token}` } })
      .then((r) => r.json())
      .then((d) => (d.error ? setError(d.error) : setData(d)))
      .catch(() => setError("Failed to load"));
  }, [token]);

  if (error) return <p style={{ color: BAD }}>{error}</p>;
  if (!data) return <p style={{ color: MUTED }}>Loading&hellip;</p>;

  return (
    <div>
      {/* ── Job health ──────────────────────────────────────────────────── */}
      <div style={card}>
        <h2 style={h2}>Scheduled jobs</h2>
        <p style={sub}>
          Every run writes a row. A job that stops running shows as stale instead of showing nothing.
        </p>

        {data.jobs.map((j) => {
          const h = HEALTH[j.health];
          return (
            <div key={j.job} style={{ marginBottom: 12 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap", marginBottom: 8 }}>
                <span style={{ fontSize: 13.5, fontWeight: 700, color: INK, fontFamily: "'DM Mono', monospace" }}>
                  {j.job}
                </span>
                <span style={{
                  fontSize: 11, fontWeight: 800, color: h.fg, background: h.bg,
                  padding: "3px 9px", borderRadius: 99, textTransform: "uppercase", letterSpacing: 0.4,
                }}>
                  {h.label}
                </span>
                <span style={{ fontSize: 12, color: MUTED }}>
                  expected every {j.expectedHours}h · last ran {ago(j.lastRunAt)}
                </span>
              </div>

              {j.runs.length === 0 ? (
                <p style={{ fontSize: 12.5, color: BAD, margin: 0 }}>
                  No run has ever been recorded for this job.
                </p>
              ) : (
                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12.5 }}>
                  <thead>
                    <tr style={{ color: FAINT, textAlign: "left" }}>
                      <th style={{ padding: "4px 8px 4px 0", fontWeight: 700 }}>Started</th>
                      <th style={{ padding: "4px 8px", fontWeight: 700 }}>Status</th>
                      <th style={{ padding: "4px 8px", fontWeight: 700 }}>Considered</th>
                      <th style={{ padding: "4px 8px", fontWeight: 700 }}>Sent</th>
                      <th style={{ padding: "4px 0", fontWeight: 700 }}>Error</th>
                    </tr>
                  </thead>
                  <tbody>
                    {j.runs.map((r) => (
                      <tr key={r.id} style={{ borderTop: `1px solid ${LINE}` }}>
                        <td style={{ padding: "6px 8px 6px 0", color: MUTED, whiteSpace: "nowrap" }}>
                          {new Date(r.started_at).toLocaleString("en-GB", {
                            day: "numeric", month: "short", hour: "2-digit", minute: "2-digit",
                          })}
                        </td>
                        <td style={{ padding: "6px 8px", fontWeight: 700, color: r.status === "ok" ? GOOD : r.status === "error" ? BAD : WARN }}>
                          {r.status}
                        </td>
                        <td style={{ padding: "6px 8px", fontFamily: "'DM Mono', monospace" }}>{r.considered}</td>
                        <td style={{ padding: "6px 8px", fontFamily: "'DM Mono', monospace" }}>{r.acted}</td>
                        <td style={{ padding: "6px 0", color: BAD, maxWidth: 260, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                          {r.error ?? ""}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          );
        })}
      </div>

      {/* ── Funnel ──────────────────────────────────────────────────────── */}
      <div style={card}>
        <h2 style={h2}>Funnel</h2>
        <p style={sub}>
          Each bar is measured against the step above it &mdash; the number that says where to work.
        </p>

        {data.funnel.map((s, i) => (
          <div key={s.event} style={{ marginBottom: 10 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 4 }}>
              <span style={{ fontSize: 13, fontWeight: 700, color: INK }}>{s.label}</span>
              <span style={{ fontSize: 12.5, color: MUTED, fontFamily: "'DM Mono', monospace" }}>
                {s.count}
                {i > 0 && (
                  <span style={{ color: s.fromPrevious < 25 && s.drop ? BAD : FAINT, marginLeft: 8 }}>
                    {s.fromPrevious}% of previous
                  </span>
                )}
              </span>
            </div>
            <div style={{ height: 8, background: "#F1F5F9", borderRadius: 99, overflow: "hidden" }}>
              <div style={{
                width: `${s.fromTop}%`, height: "100%",
                background: s.drop && s.fromPrevious < 25 ? BAD : GOOD,
                borderRadius: 99,
              }} />
            </div>
          </div>
        ))}
      </div>

      {/* ── Cohorts ─────────────────────────────────────────────────────── */}
      {data.cohorts.length > 1 && (
        <div style={card}>
          <h2 style={h2}>By signup week</h2>
          <p style={sub}>Whether the funnel is getting better, not just what it is today.</p>
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12.5, minWidth: 520 }}>
              <thead>
                <tr style={{ color: FAINT, textAlign: "left" }}>
                  <th style={{ padding: "4px 8px 4px 0", fontWeight: 700 }}>Week of</th>
                  {data.funnel.map((s) => (
                    <th key={s.event} style={{ padding: "4px 8px", fontWeight: 700 }}>{s.label}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {data.cohorts.map((c) => (
                  <tr key={c.week} style={{ borderTop: `1px solid ${LINE}` }}>
                    <td style={{ padding: "6px 8px 6px 0", color: MUTED, whiteSpace: "nowrap" }}>{shortDate(c.week)}</td>
                    {c.steps.map((st) => (
                      <td key={st.event} style={{ padding: "6px 8px", fontFamily: "'DM Mono', monospace", color: st.count === 0 ? FAINT : INK }}>
                        {st.count}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── Per user ────────────────────────────────────────────────────── */}
      <div style={card}>
        <h2 style={h2}>Every user</h2>
        <p style={sub}>
          Click a row for the dates. A missing email only counts as missed once it was actually due.
        </p>

        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13, minWidth: 720 }}>
            <thead>
              <tr style={{ color: FAINT, textAlign: "left" }}>
                <th style={{ padding: "6px 8px 6px 0", fontWeight: 700 }}>User</th>
                <th style={{ padding: "6px 8px", fontWeight: 700 }}>Age</th>
                {data.users[0]?.emails.map((e) => (
                  <th key={e.event} style={{ padding: "6px 8px", fontWeight: 700 }}>{e.label}</th>
                ))}
                <th style={{ padding: "6px 8px", fontWeight: 700 }}>Numbers</th>
                <th style={{ padding: "6px 8px", fontWeight: 700 }}>Bank</th>
                <th style={{ padding: "6px 8px", fontWeight: 700 }}>Pro</th>
                <th style={{ padding: "6px 0", fontWeight: 700 }}>Returned</th>
              </tr>
            </thead>
            <tbody>
              {data.users.map((u) => (
                <Fragment key={u.id}>
                  <tr
                    onClick={() => setExpanded(expanded === u.id ? null : u.id)}
                    style={{ borderTop: `1px solid ${LINE}`, cursor: "pointer" }}
                  >
                    <td style={{ padding: "8px 8px 8px 0", maxWidth: 210, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      <span style={{ color: INK }}>{u.displayName || u.email}</span>
                      {u.unsubscribed && (
                        <span style={{ fontSize: 10.5, fontWeight: 800, color: WARN, marginLeft: 6 }}>UNSUB</span>
                      )}
                    </td>
                    <td style={{ padding: "8px", color: MUTED, fontFamily: "'DM Mono', monospace", whiteSpace: "nowrap" }}>{u.ageDays}d</td>
                    {u.emails.map((e) => (
                      <td key={e.event} style={{ padding: "8px" }}>
                        <Dot state={e.state} />
                      </td>
                    ))}
                    <td style={{ padding: "8px" }}><Tick on={!!u.activatedAt} /></td>
                    <td style={{ padding: "8px" }}><Tick on={!!u.bankConnectedAt} /></td>
                    <td style={{ padding: "8px" }}><Tick on={!!u.subscribedAt} /></td>
                    <td style={{ padding: "8px 0" }}><Tick on={u.returned} /></td>
                  </tr>
                  {expanded === u.id && (
                    <tr style={{ background: "#F8FAFC" }}>
                      <td colSpan={5 + u.emails.length} style={{ padding: "10px 0 14px", fontSize: 12.5, color: MUTED }}>
                        <div style={{ display: "flex", gap: 20, flexWrap: "wrap" }}>
                          <span>{u.email}</span>
                          <span>Joined {shortDate(u.createdAt)}</span>
                          <span>Last seen {u.lastSignInAt ? ago(u.lastSignInAt) : "never"}</span>
                          {u.emails.filter((e) => e.sentAt).map((e) => (
                            <span key={e.event}>{e.label} {shortDate(e.sentAt)}</span>
                          ))}
                          {u.activatedAt && <span>Numbers {shortDate(u.activatedAt)}</span>}
                          {u.bankConnectedAt && <span>Bank {shortDate(u.bankConnectedAt)}</span>}
                          {u.subscribedAt && <span>Pro {shortDate(u.subscribedAt)}</span>}
                        </div>
                      </td>
                    </tr>
                  )}
                </Fragment>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

/** Sent, missed, or not due yet — three states, because two would lie. */
function Dot({ state }: { state: EmailState }) {
  const map = { sent: GOOD, missed: BAD, pending: "#CBD5E1" } as const;
  const title = { sent: "Sent", missed: "Due but never sent", pending: "Not due yet" } as const;
  return (
    <span
      title={title[state]}
      style={{
        display: "inline-block", width: 9, height: 9, borderRadius: "50%",
        background: map[state],
      }}
    />
  );
}

function Tick({ on }: { on: boolean }) {
  return (
    <span style={{ color: on ? GOOD : "#CBD5E1", fontWeight: 800 }}>{on ? "✓" : "–"}</span>
  );
}
