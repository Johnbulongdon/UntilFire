"use client";

import { useCallback, useEffect, useState } from "react";
import {
  Mail,
  Users,
  FlaskConical,
  Send,
  Pause,
  Upload,
  RefreshCw,
  ShieldCheck,
} from "lucide-react";
import type { ColdVariant } from "@/lib/cold-email";
import styles from "./ColdEmail.module.css";
import ProspectCollector from "./ProspectCollector";

type Campaign = {
  id: string;
  name: string;
  state: string;
  daily_limit: number;
  variants: Record<"A" | "B", ColdVariant>;
};
type Prospect = {
  id: string;
  email: string;
  first_name: string | null;
  city: string | null;
  fit_note: string;
  source_url: string;
};
type Job = {
  id: string;
  campaign_id: string;
  prospect_id: string;
  variant: "A" | "B";
  state: string;
  clicked_at: string | null;
  replied_at: string | null;
  positive_at: string | null;
  trial_started_at: string | null;
  activated_at: string | null;
  outcome: string | null;
  claimed_at: string | null;
};
type Data = {
  campaigns: Campaign[];
  prospects: Prospect[];
  jobs: Job[];
  suppressions: { email: string; reason: string }[];
  readiness: {
    enabled: boolean;
    signing: boolean;
    worker: boolean;
    postalAddress: boolean;
    from: string;
  };
};
const example =
  '[\n  {"email":"", "first_name":"", "city":"", "country":"US", "source_url":"https://", "fit_note":"Public evidence of FIRE interest"}\n]';
export default function ColdEmailTab({ token }: { token: string }) {
  const [data, setData] = useState<Data | null>(null),
    [error, setError] = useState(""),
    [notice, setNotice] = useState(""),
    [busy, setBusy] = useState(false);
  const [selected, setSelected] = useState(""),
    [section, setSection] = useState<"campaign" | "prospects" | "results">(
      "campaign",
    );
  const [name, setName] = useState("US personal finance · first outreach"),
    [rows, setRows] = useState(""),
    [copy, setCopy] = useState<Record<"A" | "B", ColdVariant> | null>(null),
    [cap, setCap] = useState(25),
    [variant, setVariant] = useState<"A" | "B">("A");
  const [preview, setPreview] = useState("");
  const load = useCallback(async () => {
    const res = await fetch("/api/admin/cold-email", {
      headers: { Authorization: `Bearer ${token}` },
      cache: "no-store",
    });
    const value = await res.json();
    if (!res.ok) throw new Error(value.error || "Could not load outreach");
    setData(value);
    setSelected((old) => old || value.campaigns[0]?.id || "");
  }, [token]);
  useEffect(() => {
    load().catch((e) => setError(e.message));
  }, [load]);
  const campaign = data?.campaigns.find((c) => c.id === selected);
  useEffect(() => {
    setCopy(campaign?.variants || null);
    setCap(campaign?.daily_limit || 25);
  }, [campaign]);
  async function action(body: Record<string, unknown>) {
    setBusy(true);
    setError("");
    setNotice("");
    try {
      const res = await fetch("/api/admin/cold-email", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(body),
      });
      const value = await res.json();
      if (!res.ok) throw new Error(value.error || "Action failed");
      if (body.action === "create") setSelected(value.result.id);
      setNotice(
        body.action === "enqueue"
          ? `${value.result} eligible prospects queued. No messages sent.`
          : body.action === "import"
            ? `${value.result?.length || 0} new prospects imported.`
            : "Saved.",
      );
      await load();
      return true;
    } catch (e) {
      setError(e instanceof Error ? e.message : "Action failed");
      return false;
    } finally {
      setBusy(false);
    }
  }
  async function showPreview() {
    if (!copy) return;
    setError("");
    try {
      const res = await fetch("/api/admin/cold-email/preview", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ variant: copy[variant] }),
      });
      const value = await res.json();
      if (!res.ok) throw new Error(value.error);
      setPreview(value.html);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Preview failed");
    }
  }
  const jobs = data?.jobs.filter((j) => j.campaign_id === selected) || [];
  const frozen = jobs.some((j) => j.claimed_at);
  const ready =
    !!data &&
    Object.entries(data.readiness)
      .filter(([k]) => k !== "from")
      .every(([, v]) => v === true);
  const prospectById = new Map(data?.prospects.map((p) => [p.id, p]) || []);
  return (
    <div className={styles.root}>
      <header className={styles.header}>
        <div>
          <div className={styles.eyebrow}>ACQUISITION</div>
          <h2>Cold outreach</h2>
          <p>A separate pipeline. A clearer picture of what works.</p>
        </div>
        <button
          disabled={busy}
          onClick={() => load().catch((e) => setError(e.message))}
        >
          <RefreshCw size={16} /> Refresh
        </button>
      </header>
      <div className={styles.setup}>
        <ShieldCheck size={24} />
        <div>
          <strong>
            {ready
              ? "Queue is enabled"
              : "Prepare now. Connect sending when ready."}
          </strong>
          <p>John at UntilFire · john.ng@untilfire.com</p>
          <div className={styles.checks}>
            {data &&
              [
                ["Sending switch", data.readiness.enabled],
                ["Link signing", data.readiness.signing],
                ["Worker key", data.readiness.worker],
                ["Postal address", data.readiness.postalAddress],
              ].map(([label, ok]) => (
                <span key={String(label)}>
                  {ok ? "✓" : "○"} {label}
                </span>
              ))}
          </div>
          <small>
            SMTP credentials live in your worker, never in this page. Enabled
            does not confirm delivery or worker connectivity.
          </small>
        </div>
      </div>
      {error && (
        <div className={styles.error} role="alert">
          {error}
        </div>
      )}
      {notice && (
        <div className={styles.notice} role="status">
          {notice}
        </div>
      )}
      <div className={styles.metrics}>
        {[
          ["Prospects", data?.prospects.length || 0],
          ["Queued", jobs.filter((j) => j.state === "queued").length],
          [
            "Server accepted",
            jobs.filter((j) => j.state === "accepted").length,
          ],
          ["Replies logged", jobs.filter((j) => j.replied_at).length],
        ].map(([label, value]) => (
          <div key={label}>
            <span>{label}</span>
            <strong>{value}</strong>
          </div>
        ))}
      </div>
      <nav className={styles.nav} aria-label="Outreach sections">
        {(
          [
            { key: "campaign", label: "Campaign & A/B", Icon: FlaskConical },
            { key: "prospects", label: "Prospects", Icon: Users },
            { key: "results", label: "Results", Icon: Mail },
          ] as const
        ).map(({ key, label, Icon }) => (
          <button
            key={key}
            aria-pressed={section === key}
            onClick={() => setSection(key)}
          >
            <Icon size={16} />
            {label}
          </button>
        ))}
      </nav>
      <div className={styles.campaignPicker}>
        <label>
          Campaign
          <select
            value={selected}
            onChange={(e) => {
              setSelected(e.target.value);
              setPreview("");
            }}
          >
            <option value="">Choose a campaign</option>
            {data?.campaigns.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name} · {c.state}
              </option>
            ))}
          </select>
        </label>
      </div>
      {section === "campaign" && (
        <>
          <section className={styles.panel}>
            <h3>Start an experiment</h3>
            <div className={styles.row}>
              <label className={styles.grow}>
                Campaign name
                <input
                  maxLength={120}
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                />
              </label>
              <button
                disabled={busy || !name.trim() || !data}
                onClick={() => action({ action: "create", name })}
              >
                Create campaign
              </button>
            </div>
          </section>
          {campaign && copy && (
            <section className={styles.panel}>
              <div className={styles.row}>
                <h3 className={styles.grow}>One design. Two hooks.</h3>
                <span className={styles.badge}>{campaign.state}</span>
              </div>
              <p>
                Same cinematic phone image and 30-day Pro trial. Copy freezes
                after the first send reservation.
              </p>
              <div className={styles.variantPicker}>
                {(["A", "B"] as const).map((v) => (
                  <button
                    key={v}
                    aria-pressed={v === variant}
                    onClick={() => setVariant(v)}
                  >
                    Variant {v} · {v === "A" ? "City" : "Freedom"}
                  </button>
                ))}
              </div>
              <label>
                Subject
                <input
                  disabled={frozen}
                  maxLength={150}
                  value={copy[variant].subject}
                  onChange={(e) =>
                    setCopy({
                      ...copy,
                      [variant]: { ...copy[variant], subject: e.target.value },
                    })
                  }
                />
              </label>
              <label>
                Opening hook
                <textarea
                  disabled={frozen}
                  maxLength={600}
                  value={copy[variant].intro}
                  onChange={(e) =>
                    setCopy({
                      ...copy,
                      [variant]: { ...copy[variant], intro: e.target.value },
                    })
                  }
                />
              </label>
              <label>
                Personal finance offer
                <textarea
                  disabled={frozen}
                  maxLength={1200}
                  value={copy[variant].bridge}
                  onChange={(e) =>
                    setCopy({
                      ...copy,
                      [variant]: { ...copy[variant], bridge: e.target.value },
                    })
                  }
                />
              </label>
              <div className={styles.row}>
                <button
                  disabled={busy || frozen}
                  onClick={() =>
                    action({ action: "update", id: selected, variants: copy })
                  }
                >
                  Save A/B copy
                </button>
                <button onClick={showPreview}>Preview {variant}</button>
                <label>
                  Daily cap (UTC)
                  <input
                    type="number"
                    min={1}
                    max={300}
                    value={cap}
                    onChange={(e) => setCap(Number(e.target.value))}
                  />
                </label>
                <button
                  disabled={busy}
                  onClick={() =>
                    action({ action: "update", id: selected, daily_limit: cap })
                  }
                >
                  Save cap
                </button>
              </div>
              <div className={styles.row}>
                <button
                  disabled={busy || campaign.state !== "draft"}
                  onClick={() => action({ action: "enqueue", id: selected })}
                >
                  <Users size={16} /> Queue eligible prospects
                </button>
                {campaign.state === "running" ? (
                  <button
                    disabled={busy}
                    onClick={() =>
                      action({
                        action: "update",
                        id: selected,
                        state: "paused",
                      })
                    }
                  >
                    <Pause size={16} />
                    Pause
                  </button>
                ) : (
                  <button
                    className={styles.primary}
                    disabled={
                      busy || !ready || !jobs.some((j) => j.state === "queued")
                    }
                    onClick={() => {
                      if (
                        window.confirm(
                          `Start ${campaign.name} with a cap of ${cap} attempts per UTC day? A configured worker will send queued emails.`,
                        )
                      )
                        action({
                          action: "update",
                          id: selected,
                          state: "running",
                          daily_limit: cap,
                        });
                    }}
                  >
                    <Send size={16} />
                    Start queue
                  </button>
                )}
              </div>
              <small>
                New imports only enter a draft campaign. People contacted in any
                previous campaign are excluded. Pausing stops subsequent claims;
                an email already being transmitted may finish.
              </small>
              {preview && (
                <iframe
                  className={styles.preview}
                  sandbox=""
                  title={`UntilFire email variant ${variant}`}
                  srcDoc={preview}
                />
              )}
            </section>
          )}
        </>
      )}
      {section === "prospects" && (
        <>
          <ProspectCollector token={token} onImport={(rows) => action({ action: "import", rows })} />
          <section className={styles.panel}>
            <h3>Import a qualified batch</h3>
            <p>
              Paste up to 300 JSON records. Include a public contact source and
              evidence of fit; only verified U.S. prospects belong here.
            </p>
            <label>
              Prospect records
              <textarea
                className={styles.importBox}
                placeholder={example}
                value={rows}
                onChange={(e) => setRows(e.target.value)}
              />
            </label>
            <button
              disabled={busy || !rows.trim() || !data}
              onClick={() => {
                try {
                  const parsed = JSON.parse(rows);
                  action({ action: "import", rows: parsed });
                } catch {
                  setError("Paste a valid JSON array of prospect records");
                }
              }}
            >
              <Upload size={16} />
              Import prospects
            </button>
          </section>
          <section className={styles.panel}>
            <h3>Prospect list</h3>
            <div className={styles.tableWrap}>
              <table>
                <thead>
                  <tr>
                    <th>Person</th>
                    <th>Evidence</th>
                    <th>Contact status</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {data?.prospects.map((p) => {
                    const suppression = data.suppressions.find(
                      (s) => s.email === p.email,
                    );
                    return (
                      <tr key={p.id}>
                        <td>
                          <strong>{p.first_name || "Name not supplied"}</strong>
                          <br />
                          {p.email}
                          <br />
                          {p.city || "City not supplied"}
                        </td>
                        <td>
                          {p.fit_note}
                          <br />
                          <a
                            href={p.source_url}
                            target="_blank"
                            rel="noopener noreferrer"
                          >
                            Public source ↗
                          </a>
                        </td>
                        <td>
                          {suppression
                            ? `Stopped · ${suppression.reason}`
                            : "Eligible for review"}
                        </td>
                        <td>
                          <button
                            disabled={busy || !!suppression}
                            onClick={() =>
                              action({
                                action: "suppress",
                                email: p.email,
                                reason: "manual",
                              })
                            }
                          >
                            Stop outreach
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            {!data?.prospects.length && (
              <p>
                No prospects imported. No contact lists are bundled with the
                app.
              </p>
            )}
          </section>
        </>
      )}
      {section === "results" && (
        <>
          <section className={styles.panel}>
            <h3>Which hook leads to useful conversations?</h3>
            <p>
              Acceptance is not confirmed delivery. Clicks may include security
              scanners. Replies, trials and activation below are manually
              logged.
            </p>
            <div className={styles.tableWrap}>
              <table>
                <thead>
                  <tr>
                    <th>Variant</th>
                    <th>Accepted</th>
                    <th>Clicked</th>
                    <th>Replies</th>
                    <th>Positive</th>
                    <th>Trials</th>
                    <th>Activated</th>
                  </tr>
                </thead>
                <tbody>
                  {(["A", "B"] as const).map((v) => {
                    const list = jobs.filter((j) => j.variant === v);
                    return (
                      <tr key={v}>
                        <td>{v}</td>
                        <td>
                          {list.filter((j) => j.state === "accepted").length}
                        </td>
                        <td>{list.filter((j) => j.clicked_at).length}</td>
                        <td>{list.filter((j) => j.replied_at).length}</td>
                        <td>{list.filter((j) => j.positive_at).length}</td>
                        <td>
                          {
                            list.filter(
                              (j) => j.trial_started_at || j.activated_at,
                            ).length
                          }
                        </td>
                        <td>{list.filter((j) => j.activated_at).length}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </section>
          <section className={styles.panel}>
            <h3>Send activity</h3>
            <div className={styles.tableWrap}>
              <table>
                <thead>
                  <tr>
                    <th>Recipient</th>
                    <th>Variant</th>
                    <th>State</th>
                    <th>Log outcome</th>
                  </tr>
                </thead>
                <tbody>
                  {jobs.map((j) => (
                    <tr key={j.id}>
                      <td>
                        {prospectById.get(j.prospect_id)?.email ||
                          "Outside prospect display window"}
                      </td>
                      <td>{j.variant}</td>
                      <td>
                        {j.state}
                        {j.outcome ? ` · ${j.outcome}` : ""}
                      </td>
                      <td>
                        <select
                          aria-label={`Outcome for ${prospectById.get(j.prospect_id)?.email || j.id}`}
                          disabled={
                            busy || !["accepted", "unknown"].includes(j.state)
                          }
                          value={j.outcome || ""}
                          onChange={(e) =>
                            e.target.value &&
                            action({
                              action: "outcome",
                              id: j.id,
                              outcome: e.target.value,
                            })
                          }
                        >
                          <option value="">Log an outcome</option>
                          <option value="positive">Positive reply</option>
                          <option value="negative">No thanks</option>
                          <option value="bounce">Bounced</option>
                          <option value="complaint">Complaint</option>
                          <option value="trial_started">Trial started</option>
                          <option value="activated">Activated</option>
                        </select>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {!jobs.length && <p>No send activity for this campaign.</p>}
            <small>
              Latest 50 campaigns, 1,000 prospects and 10,000 sends shown. No
              automatic winner is declared.
            </small>
          </section>
        </>
      )}
    </div>
  );
}
