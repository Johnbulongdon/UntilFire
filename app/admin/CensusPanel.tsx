"use client";

import { useCallback, useEffect, useState } from "react";

/**
 * Cost of living — Census ACS city-level rents.
 *
 * The one live importer. BEA priced by metro area, so Manhattan was averaged
 * with Paterson; HUD had the right granularity but needs a key from a site
 * that is unreachable from some networks. ACS needs no key and publishes per
 * place, covering every US city anyone might type.
 *
 * Rent is the measurement. col is an estimate built on top of it, and the two
 * are shown side by side so they are never confused for each other.
 */

interface Row {
  city_key: string;
  name: string;
  rent: number;
  col: number;
  geo: string;
  basis: "place" | "county";
  previous: number | null;
  acs_year: number;
  synced_at: string;
}

interface Data {
  cities: Row[];
  year: number | null;
  syncedAt: string | null;
  placeCount: number;
  nonHousing: number;
}

const INK = "#19181E";
const MUTED = "#64748B";
const FAINT = "#94A3B8";
const LINE = "#E2E8F0";
const GOOD = "#059669";
const BAD = "#DC2626";
const WARN = "#B45309";
const MONO = "'DM Mono', monospace";

const money = (n: number | null) => (n == null ? "—" : "$" + n.toLocaleString("en-US"));

export default function CensusPanel({ token }: { token: string }) {
  const [data, setData] = useState<Data | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [note, setNote] = useState("");
  const [unmatched, setUnmatched] = useState<string[]>([]);
  const [onlyChanged, setOnlyChanged] = useState(false);

  const load = useCallback(() => {
    fetch("/api/admin/census-sync", { headers: { Authorization: `Bearer ${token}` } })
      .then((r) => r.json())
      .then((d) => (d.error ? setError(d.error) : setData(d)))
      .catch(() => setError("Could not load stored rents"));
  }, [token]);

  useEffect(load, [load]);

  async function sync() {
    setBusy(true);
    setError("");
    setNote("");
    setUnmatched([]);
    try {
      const res = await fetch("/api/admin/census-sync", { method: "POST", headers: { Authorization: `Bearer ${token}` } });
      const d = await res.json();
      if (!res.ok) setError(d.error ?? "Sync failed");
      else {
        setNote(`ACS ${d.year}: ${d.count} cities priced, ${d.placeCount} matched to the city itself.`);
        setUnmatched(d.unmatched ?? []);
        load();
      }
    } catch {
      setError("Sync failed — the request did not complete.");
    }
    setBusy(false);
  }

  const rows = data?.cities ?? [];
  const spread = (pick: (r: Row) => number | null) => {
    const v = rows.map(pick).filter((x): x is number => x != null && x > 0);
    return v.length ? Math.max(...v) / Math.min(...v) : null;
  };
  const colSpread = spread((r) => r.col);
  const wasSpread = spread((r) => r.previous);
  const changed = rows.filter((r) => r.previous && r.previous > 0 && Math.abs(r.col - r.previous) / r.previous > 0.05);
  const shown = onlyChanged ? changed : rows;

  return (
    <div style={{ background: "#fff", border: `1px solid ${LINE}`, borderRadius: 12, padding: 18, marginBottom: 20 }}>
      <h2 style={{ fontSize: 15, fontWeight: 800, color: INK, margin: "0 0 2px" }}>Cost of living — Census ACS</h2>
      <p style={{ fontSize: 12.5, color: MUTED, margin: "0 0 10px", lineHeight: 1.6 }}>
        Median gross rent per city, from the American Community Survey. Rent is the only line that
        really varies between US cities, so it is the only one looked up; everything else is one
        national baseline of {money(data?.nonHousing ?? 0)} a year. Nothing a visitor sees changes
        until these are promoted.
      </p>
      <p style={{ fontSize: 12.5, color: WARN, margin: "0 0 14px", lineHeight: 1.6 }}>
        Worth remembering when reading the table: gross rent is what sitting tenants pay, including
        long and rent-stabilised leases. It runs below the market rent someone moving in today would
        face, most of all in expensive cities. It is a starting estimate the user can overwrite.
      </p>

      <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
        <button
          onClick={sync}
          disabled={busy}
          style={{
            fontSize: 14, fontWeight: 700, padding: "10px 18px", borderRadius: 8, border: "none",
            background: busy ? "#A7F3D0" : GOOD, color: busy ? "#065F46" : "#fff",
            cursor: busy ? "default" : "pointer", fontFamily: "inherit",
          }}
        >
          {busy ? "Fetching from Census…" : "Sync city rents"}
        </button>

        {data?.syncedAt ? (
          <span style={{ fontSize: 12.5, color: MUTED }}>
            Last synced {new Date(data.syncedAt).toLocaleString("en-GB", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}
            {" · "}ACS {data.year} · {rows.length} cities, {data.placeCount} matched to the city itself
            {colSpread && wasSpread && <> · spread {colSpread.toFixed(2)}× against {wasSpread.toFixed(2)}× hand-entered</>}
          </span>
        ) : (
          !busy && <span style={{ fontSize: 12.5, color: FAINT }}>Never synced.</span>
        )}
      </div>

      {note && <p style={{ fontSize: 13, color: GOOD, margin: "12px 0 0", fontWeight: 600 }}>{note}</p>}
      {error && <p style={{ fontSize: 13, color: BAD, margin: "12px 0 0", lineHeight: 1.5 }}>{error}</p>}

      {unmatched.length > 0 && (
        <div style={{ marginTop: 12, background: "#FFFBEB", border: "1px solid #FDE68A", borderRadius: 8, padding: "10px 12px" }}>
          <div style={{ fontSize: 12.5, fontWeight: 700, color: WARN, marginBottom: 4 }}>
            {unmatched.length} could not be matched — these need an alias in lib/census.ts
          </div>
          {unmatched.slice(0, 12).map((u) => (
            <div key={u} style={{ fontSize: 12, color: WARN }}>{u}</div>
          ))}
          {unmatched.length > 12 && <div style={{ fontSize: 12, color: WARN, marginTop: 4 }}>…and {unmatched.length - 12} more</div>}
        </div>
      )}

      {rows.length > 0 && (
        <>
          <label style={{ fontSize: 12.5, color: MUTED, display: "flex", alignItems: "center", gap: 6, cursor: "pointer", marginTop: 16 }}>
            <input type="checkbox" checked={onlyChanged} onChange={(e) => setOnlyChanged(e.target.checked)} />
            Only moves over 5% ({changed.length})
          </label>

          <div style={{ overflowX: "auto", marginTop: 10 }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13, minWidth: 660 }}>
              <thead>
                <tr style={{ textAlign: "left", color: FAINT, background: "#F8FAFC" }}>
                  {["City", "Rent / mo", "Was", "Now", "Change", "Basis", "Census geography"].map((h) => (
                    <th key={h} style={{ padding: "8px 10px", fontWeight: 700, fontSize: 11, textTransform: "uppercase", whiteSpace: "nowrap" }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {shown.map((r) => {
                  const delta = r.previous && r.previous > 0 ? (r.col - r.previous) / r.previous : null;
                  return (
                    <tr key={r.city_key} style={{ borderTop: "1px solid #F1F5F9" }}>
                      <td style={{ padding: "8px 10px", color: INK, whiteSpace: "nowrap" }}>{r.name}</td>
                      <td style={{ padding: "8px 10px", color: INK, fontWeight: 700, fontFamily: MONO }}>{money(r.rent)}</td>
                      <td style={{ padding: "8px 10px", color: MUTED, fontFamily: MONO }}>{money(r.previous)}</td>
                      <td style={{ padding: "8px 10px", color: INK, fontFamily: MONO }}>{money(r.col)}</td>
                      <td style={{
                        padding: "8px 10px", fontFamily: MONO,
                        color: delta == null ? FAINT : Math.abs(delta) > 0.25 ? BAD : Math.abs(delta) > 0.05 ? WARN : MUTED,
                      }}>
                        {delta == null ? "—" : `${delta > 0 ? "+" : ""}${Math.round(delta * 100)}%`}
                      </td>
                      <td style={{ padding: "8px 10px" }}>
                        <span style={{
                          fontSize: 10.5, fontWeight: 800, textTransform: "uppercase", padding: "2px 8px", borderRadius: 99,
                          color: r.basis === "place" ? GOOD : WARN,
                          background: r.basis === "place" ? "#ECFDF5" : "#FFFBEB",
                        }}>{r.basis}</span>
                      </td>
                      <td style={{ padding: "8px 10px", color: MUTED, maxWidth: 240, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{r.geo}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}
