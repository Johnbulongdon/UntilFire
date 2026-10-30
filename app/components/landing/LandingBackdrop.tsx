"use client";
import { useEffect, useRef } from "react";
import s from "./LandingBackdrop.module.css";
export default function LandingBackdrop() {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const node = ref.current;
    if (!node) return;
    const reduce = matchMedia("(prefers-reduced-motion: reduce)");
    let frame = 0,
      x = 0,
      y = 0,
      cx = 0,
      cy = 0,
      sy = 0,
      cs = 0;
    const tick = () => {
      frame = 0;
      if (reduce.matches || document.hidden) return;
      cx += (x - cx) * 0.065;
      cy += (y - cy) * 0.065;
      cs += (sy - cs) * 0.08;
      node.style.setProperty("--mx", cx.toFixed(2) + "px");
      node.style.setProperty("--my", cy.toFixed(2) + "px");
      node.style.setProperty("--sy", cs.toFixed(2) + "px");
      if (Math.abs(x - cx) + Math.abs(y - cy) + Math.abs(sy - cs) > 0.05)
        frame = requestAnimationFrame(tick);
    };
    const request = () => {
      if (!reduce.matches && !frame && !document.hidden)
        frame = requestAnimationFrame(tick);
    };
    const pointer = (event: PointerEvent) => {
      if (event.pointerType !== "mouse" || scrollY > 1400) return;
      x = (event.clientX / innerWidth - 0.5) * 24;
      y = (event.clientY / innerHeight - 0.5) * 16;
      request();
    };
    const leave = () => {
      x = 0;
      y = 0;
      request();
    };
    const scroll = () => {
      sy = Math.min(scrollY, 1400) * 0.045;
      request();
    };
    const preference = () => {
      cancelAnimationFrame(frame);
      frame = 0;
      if (reduce.matches) {
        cx = cy = cs = 0;
        node.style.setProperty("--mx", "0px");
        node.style.setProperty("--my", "0px");
        node.style.setProperty("--sy", "0px");
      } else scroll();
    };
    const visibility = () => {
      if (document.hidden) {
        cancelAnimationFrame(frame);
        frame = 0;
      } else request();
    };
    window.addEventListener("pointermove", pointer, { passive: true });
    window.addEventListener("scroll", scroll, { passive: true });
    document.addEventListener("pointerleave", leave);
    document.addEventListener("visibilitychange", visibility);
    reduce.addEventListener("change", preference);
    scroll();
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("pointermove", pointer);
      window.removeEventListener("scroll", scroll);
      document.removeEventListener("pointerleave", leave);
      document.removeEventListener("visibilitychange", visibility);
      reduce.removeEventListener("change", preference);
    };
  }, []);
  return (
    <div className={s.root} ref={ref} aria-hidden="true">
      <div className={s.left} />
      <div className={s.right} />
    </div>
  );
}
