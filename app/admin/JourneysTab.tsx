"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { JOURNEYS, SHOT_BUCKET, type Platform, type ShotDevice, type Visitor } from "@/lib/journeys";

import { journeyGraph } from "@/lib/journey-canvas";
import JourneyCanvas from "./JourneyCanvas";

const SHOTS = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/${SHOT_BUCKET}`;

interface ShotRun { sha: string; takenAt: string }

/**
 * One connected canvas of shared screens and branching paths, screenshotted
 * after the last deploy (signed-in pages as the journeys test account).
 * Phone steps come from the phone app's web build. Click a screen to see it
 * full size. The steps come from lib/journeys.ts, which `npm run test:journeys` checks against the code.
 */
export default function JourneysTab() {
  const [platform, setPlatform] = useState<Platform | "all">("web");
  const [visitor, setVisitor] = useState<Visitor | "all">("all");
  const [device, setDevice] = useState<ShotDevice>("desktop");
  const [run, setRun] = useState<ShotRun | null>(null);
  const [path, setPath] = useState("all");
  const dialog = useRef<HTMLDialogElement>(null);
  const [zoom, setZoom] = useState<{ src: string; label: string } | null>(null);

  useEffect(() => {
    if (zoom) dialog.current?.showModal();
    else dialog.current?.close();
  }, [zoom]);

  useEffect(() => {
    fetch(`${SHOTS}/run.json`, { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : null))
      .then(setRun)
      .catch(() => setRun(null));
  }, []);

  const shown = useMemo(() => JOURNEYS.filter(j => (platform === "all" || j.platform === platform) && (visitor === "all" || j.visitor === visitor)), [platform, visitor]);
  const graph = useMemo(() => journeyGraph(JOURNEYS.filter(j => platform === "all" || j.platform === platform)), [platform]);
  const traced = shown.some(j => j.id === path) ? path : "all";
  const active = useMemo(() => shown.filter(j => traced === "all" || j.id === traced).map(j => j.id), [shown, traced]);

  return (
    <div>
      <div style={{ display: "flex", gap: 16, flexWrap: "wrap", alignItems: "center", marginBottom: 8 }}>
        <Chips value={platform} onChange={setPlatform} options={[["all", "All"], ["web", "Website"], ["phone", "Phone app"]]} />
        <Chips value={visitor} onChange={setVisitor} options={[["all", "Everyone"], ["new", "New"], ["returning", "Returning"]]} />
        <Chips value={device} onChange={setDevice} options={[["desktop", "Desktop size"], ["phone", "Phone size"]]} />
      </div>
      <p style={{ color: "var(--uf-ink-2)", fontSize: 13, margin: "0 0 20px" }}>
        {run ? `Screenshots from ${new Date(run.takenAt).toLocaleString()} · ${run.sha.slice(0, 7)}` : "No screenshots yet"}
      </p>

      <div style={{ display: "flex", alignItems: "center", flexWrap: "wrap", gap: 12, marginBottom: 16 }}>
        <label style={{ fontSize: 13, color: "var(--uf-ink)", fontWeight: 700 }}>Trace a path
          <select aria-label="Trace a path" value={traced} onChange={e => setPath(e.target.value)} style={{ marginLeft: 8, padding: "10px 12px", minHeight: 44, maxWidth: "100%", border: "1px solid var(--uf-border-2)", background: "var(--uf-card)", borderRadius: 10, font: "inherit" }}>
            <option value="all">All connected paths</option>
            {shown.map(j => <option key={j.id} value={j.id}>{j.title}</option>)}
          </select>
        </label>
        <span style={{ color: "var(--uf-ink-2)", fontSize: 12 }}>New / Returning highlights paths without hiding shared screens.</span>
      </div>
      <JourneyCanvas graph={graph} activeJourneys={active} device={device} shots={SHOTS} onZoom={setZoom} />

      <dialog ref={dialog} aria-label={zoom?.label ?? "Screen preview"} onCancel={() => setZoom(null)}
        onClick={e => { if (e.target === e.currentTarget) setZoom(null); }}
        style={{ position: "fixed", left: "50%", top: "50%", transform: "translate(-50%, -50%)", margin: 0, maxWidth: "94vw", maxHeight: "94vh", padding: 20, border: "1px solid var(--uf-border-2)", borderRadius: 16, background: "var(--uf-card)", color: "var(--uf-ink)" }}>
        {zoom && <>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 20, marginBottom: 12 }}><strong>{zoom.label}</strong><button type="button" autoFocus onClick={() => setZoom(null)} style={{ minHeight: 44, minWidth: 44, background: "#F1F5F9", border: 0, borderRadius: 8, color: "var(--uf-ink)", cursor: "pointer" }}>Close</button></div>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={zoom.src} alt={zoom.label} style={{ display: "block", maxWidth: "88vw", maxHeight: "76vh", objectFit: "contain" }} />
        </>}
      </dialog>
    </div>
  );
}

function Chips<T extends string>({ value, onChange, options }: { value: T; onChange: (v: T) => void; options: [T, string][] }) {
  return (
    <div style={{ display: "flex", gap: 6 }}>
      {options.map(([key, label]) => (
        <button key={key} onClick={() => onChange(key)} aria-pressed={value === key}
          style={{ minHeight: 44, padding: "8px 12px", borderRadius: 999, border: "1px solid var(--uf-border)", background: value === key ? "var(--uf-pos)" : "#fff", color: value === key ? "#fff" : "#475569", fontWeight: 700, fontSize: 13, cursor: "pointer", fontFamily: "inherit" }}>
          {label}
        </button>
      ))}
    </div>
  );
}
