"use client";

import { useEffect, useState } from "react";
import { JOURNEYS, SHOT_BUCKET, shotFile, type JourneyStep, type Platform, type ShotDevice, type Visitor } from "@/lib/journeys";

const SHOTS = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/${SHOT_BUCKET}`;

interface ShotRun { sha: string; takenAt: string }

/**
 * Every journey as a row of screens with arrows between them, screenshotted
 * after the last deploy (signed-in pages as the journeys test account).
 * Google, Stripe and phone app steps are labelled boxes. The steps come from
 * lib/journeys.ts, which `npm run test:journeys` checks against the code.
 */
export default function JourneysTab() {
  const [platform, setPlatform] = useState<Platform | "all">("all");
  const [visitor, setVisitor] = useState<Visitor | "all">("all");
  const [device, setDevice] = useState<ShotDevice>("desktop");
  const [run, setRun] = useState<ShotRun | null>(null);

  useEffect(() => {
    fetch(`${SHOTS}/run.json`, { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : null))
      .then(setRun)
      .catch(() => setRun(null));
  }, []);

  const shown = JOURNEYS.filter((j) => (platform === "all" || j.platform === platform) && (visitor === "all" || j.visitor === visitor));

  return (
    <div>
      <div style={{ display: "flex", gap: 16, flexWrap: "wrap", alignItems: "center", marginBottom: 8 }}>
        <Chips value={platform} onChange={setPlatform} options={[["all", "All"], ["web", "Website"], ["phone", "Phone app"]]} />
        <Chips value={visitor} onChange={setVisitor} options={[["all", "Everyone"], ["new", "New"], ["returning", "Returning"]]} />
        <Chips value={device} onChange={setDevice} options={[["desktop", "Desktop size"], ["phone", "Phone size"]]} />
      </div>
      <p style={{ color: "#64748B", fontSize: 13, margin: "0 0 20px" }}>
        {run ? `Screenshots from ${new Date(run.takenAt).toLocaleString()} · ${run.sha.slice(0, 7)}` : "No screenshots yet"}
      </p>

      <div style={{ display: "flex", flexDirection: "column", gap: 28 }}>
        {shown.map((j) => (
          <section key={j.id}>
            <h2 style={{ fontSize: 16, fontWeight: 800, color: "#19181E", margin: "0 0 10px" }}>
              {j.title} <Tag>{j.platform === "web" ? "Website" : "Phone app"}</Tag> <Tag>{j.visitor === "new" ? "New" : "Returning"}</Tag>
            </h2>
            <div style={{ display: "flex", alignItems: "flex-start", gap: 8, overflowX: "auto", paddingBottom: 8 }}>
              {j.steps.map((step, i) => (
                <div key={i} style={{ display: "flex", alignItems: "flex-start", gap: 8, flexShrink: 0 }}>
                  {i > 0 && <span aria-hidden style={{ color: "#94A3B8", fontSize: 20, marginTop: device === "phone" ? 96 : 56 }}>→</span>}
                  <Step step={step} n={i + 1} device={device} />
                </div>
              ))}
            </div>
          </section>
        ))}
      </div>
    </div>
  );
}

function Step({ step, n, device }: { step: JourneyStep; n: number; device: ShotDevice }) {
  const [broken, setBroken] = useState(false);
  const width = device === "phone" ? 120 : 200;
  const height = device === "phone" ? 220 : 125;
  const src = step.shot ? `${SHOTS}/${shotFile(step.shot, device, step.click)}` : null;
  const href = step.shot?.replace(/^user:/, "").startsWith("/") ? step.shot.replace(/^user:/, "") : step.route.includes("[") ? undefined : step.route;
  return (
    <figure style={{ width, margin: 0 }}>
      {src && !broken ? (
        <a href={href} target="_blank" rel="noreferrer">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={src} alt={step.label} onError={() => setBroken(true)} loading="lazy"
            style={{ width, height, objectFit: "cover", objectPosition: "top", borderRadius: 10, border: "1px solid #E2E8F0", display: "block", background: "#fff" }} />
        </a>
      ) : (
        <div style={{ width, height, borderRadius: 10, border: `1px ${step.external ? "dashed" : "solid"} #CBD5E1`, background: step.external ? "#F1F5F9" : "#fff", display: "flex", alignItems: "center", justifyContent: "center", textAlign: "center", padding: 8, boxSizing: "border-box", color: "#475569", fontSize: 12, fontWeight: 700 }}>
          {step.label}
        </div>
      )}
      <figcaption style={{ marginTop: 6, fontSize: 12, lineHeight: 1.4 }}>
        <span style={{ fontWeight: 800, color: "#19181E" }}>{n}. {step.label}</span>
        {step.action && <span style={{ display: "block", color: "#64748B" }}>{step.action}</span>}
      </figcaption>
    </figure>
  );
}

function Chips<T extends string>({ value, onChange, options }: { value: T; onChange: (v: T) => void; options: [T, string][] }) {
  return (
    <div style={{ display: "flex", gap: 6 }}>
      {options.map(([key, label]) => (
        <button key={key} onClick={() => onChange(key)} aria-pressed={value === key}
          style={{ padding: "6px 12px", borderRadius: 999, border: "1px solid #E2E8F0", background: value === key ? "#059669" : "#fff", color: value === key ? "#fff" : "#475569", fontWeight: 700, fontSize: 13, cursor: "pointer", fontFamily: "inherit" }}>
          {label}
        </button>
      ))}
    </div>
  );
}

function Tag({ children }: { children: React.ReactNode }) {
  return <span style={{ fontSize: 11, fontWeight: 700, color: "#475569", background: "#F1F5F9", borderRadius: 999, padding: "2px 8px", marginLeft: 6, verticalAlign: "middle" }}>{children}</span>;
}
