"use client";

import { useCallback, useEffect, useState } from "react";

/**
 * Housing costs — HUD Fair Market Rents, by county.
 *
 * This is the replacement for the BEA figures below it, not a companion. BEA's
 * smallest US geography is the metro area, so Manhattan was averaged with
 * Paterson and Brooklyn fell back to the New York State average. HUD publishes
 * by county, and Fair Market Rent is the 40th percentile paid by RECENT
 * MOVERS — the number a person planning a move actually faces.
 */

interface Row {
  city_key: string;
  name: string;
  county_name: string;
  monthly_rent: number;
  rent_0br: number | null;
  rent_1br: number | null;
  rent_2br: number | null;
  rent_3br: number | null;
  rent_4br: number | null;
  small_area: boolean;
  fmr_year: number;
  synced_at: string;
}

interface Data {
  cities: Row[];
  year: number | null;
  syncedAt: string | null;
  smallAreaCount: number;
  countiesResolved: number;
}

const INK = "#19181E";
const MUTED = "#64748B";
const FAINT = "#94A3B8";
const LINE = "#E2E8F0";
const GOOD = "#059669";
const BAD = "#DC2626";
const WARN = "#B45309";

const money = (n: number | null) => (n == null ? "—" : "$" + n.toLocaleString("en-US"));
const MONO = "'DM Mono', monospace";

export default function HousingPanel({ token }: { token: string }) {
  const [data, setData] = useState<Data | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [note, setNote] = useState("");
  const [unresolved, setUnresolved] = useState<string[]>([]);

  const load = useCallback(() => {
    fetch("/api/admin/housing-sync", { headers: { Authorization: `Bearer ${token}` } })
      .then((r) => r.json())
      .then((d) => (d.error ? setError(d.error) : setData(d)))
      .catch(() => setError("Could not load stored rents"));
  }, [token]);

  useEffect(load, [load]);

  async function sync() {
    setBusy(true);
    setError("");
    setNote("");
    setUnresolved([]);
    try {
      const res = await fetch("/api/admin/housing-sync", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      });
      const d = await res.json();
      if (!res.ok) {
        setError(d.error ?? "Sync failed");
      } else {
        setNote(
          `HUD ${d.year}: ${d.count} cities priced` +
            (d.newlyResolved ? `, ${d.newlyResolved} counties newly resolved.` : "."),
        );
        setUnresolved(d.unresolved ?? []);
        load();
      }
    } catch {
      setError("Sync failed — the request did not complete.");
    }
    setBusy(false);
  }

  const rows = data?.cities ?? [];
  // The one number that says whether the granularity problem is fixed. BEA put
  // the whole country inside 2.06x, with New York behind Manchester.
  const rents = rows.map((r) => r.monthly_rent).filter((n) => n > 0);
  const spread = rents.length ? Math.max(...rents) / Math.min(...rents) : null;

  return (
    <div style={{ background: "#fff", border: `1px solid ${LINE}`, borderRadius: 12, padding: 18, marginBottom: 20 }}>
      <h2 style={{ fontSize: 15, fontWeight: 800, color: INK, margin: "0 0 2px" }}>Housing — HUD Fair Market Rents</h2>
      <p style={{ fontSize: 12.5, color: MUTED, margin: "0 0 14px", lineHeight: 1.6 }}>
        Rent by county, at the 40th percentile paid by recent movers &mdash; what someone planning a
        move actually faces. Counties are resolved once per city and cached, so the first run is slow
        and later ones are not. Nothing a visitor sees changes until these are promoted.
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
          {busy ? "Fetching from HUD…" : "Sync housing costs"}
        </button>

        {data?.syncedAt ? (
          <span style={{ fontSize: 12.5, color: MUTED }}>
            Last synced {new Date(data.syncedAt).toLocaleString("en-GB", {
              day: "numeric", month: "short", hour: "2-digit", minute: "2-digit",
            })} · HUD {data.year} · {rows.length} cities · {data.countiesResolved} counties cached
            {spread && <> · spread {spread.toFixed(2)}×</>}
          </span>
        ) : (
          !busy && <span style={{ fontSize: 12.5, color: FAINT }}>Never synced.</span>
        )}
      </div>

      {note && <p style={{ fontSize: 13, color: GOOD, margin: "12px 0 0", fontWeight: 600 }}>{note}</p>}
      {error && <p style={{ fontSize: 13, color: BAD, margin: "12px 0 0", lineHeight: 1.5 }}>{error}</p>}

      {unresolved.length > 0 && (
        <div style={{ marginTop: 12, background: "#FFFBEB", border: "1px solid #FDE68A", borderRadius: 8, padding: "10px 12px" }}>
          <div style={{ fontSize: 12.5, fontWeight: 700, color: WARN, marginBottom: 4 }}>
            {unresolved.length} could not be priced — these need a county mapping by hand
          </div>
          {unresolved.slice(0, 12).map((u) => (
            <div key={u} style={{ fontSize: 12, color: WARN }}>{u}</div>
          ))}
          {unresolved.length > 12 && (
            <div style={{ fontSize: 12, color: WARN, marginTop: 4 }}>…and {unresolved.length - 12} more</div>
          )}
        </div>
      )}

      {rows.length > 0 && (
        <div style={{ overflowX: "auto", marginTop: 16 }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13, minWidth: 680 }}>
            <thead>
              <tr style={{ textAlign: "left", color: FAINT, background: "#F8FAFC" }}>
                {["City", "2BR / mo", "County", "Studio", "1BR", "3BR", "4BR", ""].map((h, i) => (
                  <th key={i} style={{ padding: "8px 10px", fontWeight: 700, fontSize: 11, textTransform: "uppercase", whiteSpace: "nowrap" }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.city_key} style={{ borderTop: "1px solid #F1F5F9" }}>
                  <td style={{ padding: "8px 10px", color: INK, whiteSpace: "nowrap" }}>{r.name}</td>
                  <td style={{ padding: "8px 10px", color: INK, fontWeight: 700, fontFamily: MONO }}>{money(r.monthly_rent)}</td>
                  <td style={{ padding: "8px 10px", color: MUTED, maxWidth: 200, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{r.county_name}</td>
                  <td style={{ padding: "8px 10px", color: MUTED, fontFamily: MONO }}>{money(r.rent_0br)}</td>
                  <td style={{ padding: "8px 10px", color: MUTED, fontFamily: MONO }}>{money(r.rent_1br)}</td>
                  <td style={{ padding: "8px 10px", color: MUTED, fontFamily: MONO }}>{money(r.rent_3br)}</td>
                  <td style={{ padding: "8px 10px", color: MUTED, fontFamily: MONO }}>{money(r.rent_4br)}</td>
                  <td style={{ padding: "8px 10px" }}>
                    {r.small_area && (
                      <span
                        title="HUD published ZIP-level rents for this county; this is their median, not a single published figure."
                        style={{
                          fontSize: 10.5, fontWeight: 800, textTransform: "uppercase", padding: "2px 8px",
                          borderRadius: 99, color: WARN, background: "#FFFBEB", whiteSpace: "nowrap",
                        }}
                      >
                        ZIP median
                      </span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
