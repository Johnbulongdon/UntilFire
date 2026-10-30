"use client";
import dynamic from "next/dynamic";
import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { ArrowUpRight, Globe2 } from "lucide-react";
import { LANDING_WORLD_CITIES } from "@/lib/landing-world-cities";
import s from "./LandingWorld.module.css";
const Placeholder = () => (
  <div className={s.loading}>
    <Globe2 size={80} aria-hidden="true" />
  </div>
);
const Globe = dynamic(() => import("./LandingWorldCanvas"), {
  ssr: false,
  loading: Placeholder,
});
export default function LandingWorld() {
  const [selection, setSelection] = useState({ index: 1, turn: 0 });
  const selected = selection.index;
  const selectCity = useCallback(
    (index: number) =>
      setSelection((value) => ({ index, turn: value.turn + 1 })),
    [],
  );
  const [ready, setReady] = useState(false);
  const root = useRef<HTMLElement>(null);
  useEffect(() => {
    const node = root.current;
    if (!node) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setReady(true);
          observer.disconnect();
        }
      },
      { rootMargin: "300px" },
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, []);
  const city = LANDING_WORLD_CITIES[selected];
  return (
    <section
      id="world"
      className={s.root}
      ref={root}
      aria-labelledby="world-title"
    >
      <div className={s.copy}>
        <span className={s.eyebrow}>A world of possibilities</span>
        <h2 id="world-title">
          Freedom, wherever
          <br />
          life takes you.
        </h2>
        <p>
          Different cities. Different living costs. See what could work for you.
        </p>
        <Link className={s.cta} href="/explore">
          Explore cities <ArrowUpRight size={18} aria-hidden="true" />
        </Link>
      </div>
      <div className={s.stage}>
        <div className={s.globe}>
          {ready ? (
            <Globe
              selected={selected}
              turn={selection.turn}
              onSelect={selectCity}
            />
          ) : (
            <Placeholder />
          )}
        </div>
        <p className={s.hint} id="world-instructions">
          Drag the globe or choose a city
        </p>
        <div className={s.cities} role="group" aria-label="Example cities">
          {LANDING_WORLD_CITIES.map((entry, i) => (
            <button
              key={entry.key}
              type="button"
              aria-pressed={selected === i}
              onClick={() => selectCity(i)}
            >
              {entry.name}
            </button>
          ))}
        </div>
        <div
          className={s.summary}
          role="status"
          aria-live="polite"
          aria-atomic="true"
        >
          <div>
            <b>{city.name}</b>
            <small>Example annual living costs</small>
          </div>
          <strong>
            {city.annual == null
              ? "—"
              : new Intl.NumberFormat("en-US", {
                  style: "currency",
                  currency: "USD",
                  maximumFractionDigits: 0,
                }).format(city.annual)}
            <small>per year · USD estimate</small>
          </strong>
        </div>
      </div>
    </section>
  );
}
