"use client";

import { useCallback, useEffect, useState } from "react";
import HousingPanel from "./HousingPanel";

/**
 * Cost of living — sync from BEA, then review before anything goes live.
 *
 * The button is the small part. The table is the point: these figures appear
 * on roughly 236 public pages, and a bad import would be a confident, sourced,
 * wrong number about someone's cost of living. So a sync writes to the
 * database and stops there, showing the change against the value it would
 * replace, and promoting them into the site is a separate deliberate step.
 */

interface Row {
  city_key: string;
  name: string;
  col: number;
  rpp: number;
  rpp_blended: number | null;
  rpp_rents: number | null;
  rpp_goods: number | null;
  rpp_other: number | null;
  basis: "metro" | "state";
  geo: string;
  previous: number | null;
  bea_year: number;
  synced_at: string;
}

interface Data {
  cities: Row[];
  year: number | null;
  syncedAt: string | null;
  metroCount: number;
}

const INK = "#19181E";
const MUTED = "#64748B";
const FAINT = "#94A3B8";
const LINE = "#E2E8F0";
const GOOD = "#059669";
const BAD = "#DC2626";
const WARN = "#B45309";

const money = (n: number) => "$" + n.toLocaleString("en-US");

export default function CitiesTab({ token }: { token: string }) {
  const [data, setData] = useState<Data | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [note, setNote] = useState("");
  const [unmatched, setUnmatched] = useState<string[]>([]);
  const [onlyChanged, setOnlyChanged] = useState(false);

  const load = useCallback(() => {
    fetch("/api/admin/bea-sync", { headers: { Authorization: `Bearer ${token}` } })
      .then((r) => r.json())
      .then((d) => (d.error ? setError(d.error) : setData(d)))
      .catch(() => setError("Could not load stored figures"));
  }, [token]);

  useEffect(load, [load]);

  async function sync() {
    setBusy(true);
    setError("");
    setNote("");
    setUnmatched([]);
    try {
      const res = await fetch("/api/admin/bea-sync", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      });
      const d = await res.json();
      if (!res.ok) {
        setError(d.error ?? "Sync failed");
      } else {
        // Naming which series arrived matters: a silently missing rents series
        // renormalises the blend back towards all-items, which is the exact
        // failure this weighting was added to fix.
        const used = (d.components ?? []).filter((c: string) => c !== "all");
        setNote(
          `BEA ${d.year}: ${d.count} cities, ${d.metroCount} at metro level.` +
            (used.length ? ` Weighted on ${used.join(", ")}.` : " No component series returned — all-items only."),
        );
        setUnmatched(d.unmatched ?? []);
        load();
      }
    } catch {
      setError("Sync failed — the request did not complete.");
    }
    setBusy(false);
  }

  const rows = data?.cities ?? [];
  // Cheapest to dearest. All-items RPP gave 2.06x across the country, which is
  // the compression this weighting exists to undo — so it is worth reading at
  // a glance rather than inferring from the table.
  const spread = (pick: (r: Row) => number | null) => {
    const values = rows.map(pick).filter((v): v is number => v != null && v > 0);
    return values.length ? Math.max(...values) / Math.min(...values) : null;
  };
  const colSpread = spread((r) => r.col);
  const wasSpread = spread((r) => r.previous);
  // A tiny move is rounding, not news. Five percent is where a figure has
  // actually changed enough to be worth a second look.
  const changed = rows.filter(
    (r) => r.previous != null && r.previous > 0 && Math.abs(r.col - r.previous) / r.previous > 0.05,
  );
  const shown = onlyChanged ? changed : rows;

  return (
    <div>
      <HousingPanel token={token} />

      <div style={{ background: "#fff", border: `1px solid ${LINE}`, borderRadius: 12, padding: 18, marginBottom: 20 }}>
        <h2 style={{ fontSize: 15, fontWeight: 800, color: INK, margin: "0 0 2px" }}>Cost of living — BEA (superseded)</h2>
        <p style={{ fontSize: 12.5, color: MUTED, margin: "0 0 14px", lineHeight: 1.6 }}>
          Pulls regional price parities and per-capita spending from the US Bureau of Economic
          Analysis. Syncing stores the figures here for review &mdash; the live site keeps showing
          its current numbers until they are promoted.
        </p>
        <p style={{ fontSize: 12.5, color: MUTED, margin: "0 0 14px", lineHeight: 1.6 }}>
          Each city is priced on a housing-weighted blend of BEA&apos;s rents, goods and services
          parities rather than the all-items headline. All-items weights housing at its share of
          aggregate consumption, which averages the one price that really varies between cities
          against goods that barely vary at all.
        </p>

        <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
          <button
            onClick={sync}
            disabled={busy}
            style={{
              fontSize: 14, fontWeight: 700, padding: "10px 18px", borderRadius: 8,
              border: "none", background: busy ? "#A7F3D0" : GOOD, color: busy ? "#065F46" : "#fff",
              cursor: busy ? "default" : "pointer", fontFamily: "inherit",
            }}
          >
            {busy ? "Fetching from BEA…" : "Sync BEA data"}
          </button>

          {data?.syncedAt && (
            <span style={{ fontSize: 12.5, color: MUTED }}>
              Last synced {new Date(data.syncedAt).toLocaleString("en-GB", {
                day: "numeric", month: "short", hour: "2-digit", minute: "2-digit",
              })} · BEA {data.year} · {rows.length} cities, {data.metroCount} at metro level
              {colSpread && wasSpread && (
                <> · spread {colSpread.toFixed(2)}&times; against {wasSpread.toFixed(2)}&times; hand-entered</>
              )}
            </span>
          )}
          {!data?.syncedAt && !busy && (
            <span style={{ fontSize: 12.5, color: FAINT }}>Never synced.</span>
          )}
        </div>

        {note && <p style={{ fontSize: 13, color: GOOD, margin: "12px 0 0", fontWeight: 600 }}>{note}</p>}
        {error && (
          <p style={{ fontSize: 13, color: BAD, margin: "12px 0 0", lineHeight: 1.5 }}>{error}</p>
        )}
        {unmatched.length > 0 && (
          <div style={{ marginTop: 12, background: "#FFFBEB", border: "1px solid #FDE68A", borderRadius: 8, padding: "10px 12px" }}>
            <div style={{ fontSize: 12.5, fontWeight: 700, color: WARN, marginBottom: 4 }}>
              {unmatched.length} could not be priced
            </div>
            {unmatched.slice(0, 10).map((u) => (
              <div key={u} style={{ fontSize: 12, color: WARN }}>{u}</div>
            ))}
          </div>
        )}
      </div>

      {rows.length > 0 && (
        <div style={{ background: "#fff", border: `1px solid ${LINE}`, borderRadius: 12, padding: 18 }}>
          <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: 12, flexWrap: "wrap", marginBottom: 4 }}>
            <h2 style={{ fontSize: 15, fontWeight: 800, color: INK, margin: 0 }}>
              What would change
            </h2>
            <label style={{ fontSize: 12.5, color: MUTED, display: "flex", alignItems: "center", gap: 6, cursor: "pointer" }}>
              <input type="checkbox" checked={onlyChanged} onChange={(e) => setOnlyChanged(e.target.checked)} />
              Only moves over 5% ({changed.length})
            </label>
          </div>
          <p style={{ fontSize: 12.5, color: MUTED, margin: "0 0 14px" }}>
            BEA against the hand-entered figure it would replace. Rents is the housing parity,
            blend is the weighted index <em>col</em> is actually computed from. A state basis means
            the city sits in no metro area and carries its state&apos;s price level &mdash; an
            estimate.
          </p>

          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13, minWidth: 640 }}>
              <thead>
                <tr style={{ textAlign: "left", color: FAINT, background: "#F8FAFC" }}>
                  {["City", "Was", "BEA", "Change", "Rents", "Blend", "Basis", "Geography"].map((h) => (
                    <th key={h} style={{ padding: "8px 10px", fontWeight: 700, fontSize: 11, textTransform: "uppercase", whiteSpace: "nowrap" }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {shown.map((r) => {
                  const delta = r.previous && r.previous > 0 ? (r.col - r.previous) / r.previous : null;
                  return (
                    <tr key={r.city_key} style={{ borderTop: `1px solid #F1F5F9` }}>
                      <td style={{ padding: "8px 10px", color: INK, whiteSpace: "nowrap" }}>{r.name}</td>
                      <td style={{ padding: "8px 10px", color: MUTED, fontFamily: "'DM Mono', monospace" }}>
                        {r.previous != null ? money(r.previous) : "—"}
                      </td>
                      <td style={{ padding: "8px 10px", color: INK, fontWeight: 700, fontFamily: "'DM Mono', monospace" }}>{money(r.col)}</td>
                      <td style={{
                        padding: "8px 10px", fontFamily: "'DM Mono', monospace",
                        color: delta == null ? FAINT : Math.abs(delta) > 0.25 ? BAD : Math.abs(delta) > 0.05 ? WARN : MUTED,
                      }}>
                        {delta == null ? "—" : `${delta > 0 ? "+" : ""}${Math.round(delta * 100)}%`}
                      </td>
                      <td style={{ padding: "8px 10px", color: MUTED, fontFamily: "'DM Mono', monospace" }}>
                        {r.rpp_rents != null ? Math.round(r.rpp_rents) : "\u2014"}
                      </td>
                      <td style={{ padding: "8px 10px", color: MUTED, fontFamily: "'DM Mono', monospace" }}>
                        {Math.round(r.rpp_blended ?? r.rpp)}
                      </td>
                      <td style={{ padding: "8px 10px" }}>
                        <span style={{
                          fontSize: 10.5, fontWeight: 800, textTransform: "uppercase", padding: "2px 8px", borderRadius: 99,
                          color: r.basis === "metro" ? GOOD : WARN,
                          background: r.basis === "metro" ? "#ECFDF5" : "#FFFBEB",
                        }}>
                          {r.basis}
                        </span>
                      </td>
                      <td style={{ padding: "8px 10px", color: MUTED, maxWidth: 260, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{r.geo}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
