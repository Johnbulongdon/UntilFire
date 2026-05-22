"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";

const C = {
  green900: "#003527",
  green800: "#064E3B",
  green700: "#065F46",
  green600: "#047857",
  green100: "#D1FAE5",
  green50: "#ECFDF5",
  teal: "#62FAE3",
  teal500: "#20D4BF",
  paper: "#fafdfb",
  paperWarm: "#f6f9f4",
  cream: "#f3faf6",
  mint: "#d6efe2",
  mintDeep: "#b9e3d0",
  border: "#E2E8F0",
  borderSoft: "rgba(0,53,39,0.10)",
  text: "#003527",
  body: "#19181E",
  muted: "#64748B",
  faint: "#94A3B8",
};

const F = "'Manrope', sans-serif";

/* ── Scroll-reveal hook ──────────────────────────────────────────────── */
function useReveal(threshold = 0.14) {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(
      ([e]) => { if (e.isIntersecting) { setVisible(true); io.disconnect(); } },
      { threshold, rootMargin: "0px 0px -5% 0px" },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [threshold]);
  return { ref, visible };
}

function Reveal({
  children,
  delay = 0,
  dir = "up",
  style = {},
}: {
  children: React.ReactNode;
  delay?: number;
  dir?: "up" | "left" | "right" | "fade";
  style?: React.CSSProperties;
}) {
  const { ref, visible } = useReveal();
  const translate =
    dir === "up" ? "translateY(28px)" :
    dir === "left" ? "translateX(-24px)" :
    dir === "right" ? "translateX(24px)" : "none";

  return (
    <div
      ref={ref}
      style={{
        opacity: visible ? 1 : 0,
        transform: visible ? "none" : translate,
        transition: `opacity 0.55s ease ${delay}s, transform 0.55s cubic-bezier(0.22,1,0.36,1) ${delay}s`,
        ...style,
      }}
    >
      {children}
    </div>
  );
}
