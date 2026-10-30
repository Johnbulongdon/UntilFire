"use client";
import { useEffect, useRef } from "react";
import * as d3 from "d3-geo";
import { feature } from "topojson-client";
import type { Topology, GeometryCollection } from "topojson-specification";
import landTopo from "@/lib/geo/land-110m.json";
import { LANDING_WORLD_CITIES as cities } from "@/lib/landing-world-cities";
import s from "./LandingWorld.module.css";
const t = landTopo as unknown as Topology<{ land: GeometryCollection }>;
const land = feature(t, t.objects.land);
export default function LandingWorldCanvas({
  selected,
  turn,
  onSelect,
}: {
  selected: number;
  turn: number;
  onSelect: (i: number) => void;
}) {
  const ref = useRef<HTMLCanvasElement>(null),
    savedRotation = useRef<[number, number]>(
      turn > 0
        ? [-cities[selected].coords[0], -cities[selected].coords[1]]
        : [30, -12],
    ),
    previous = useRef(turn);
  useEffect(() => {
    const canvas = ref.current,
      ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;
    let rotation: [number, number] = [...savedRotation.current],
      size = 400,
      frame = 0;
    let drag: { x: number; y: number; rotation: [number, number] } | null =
        null,
      moved = false;
    let hits: { i: number; x: number; y: number }[] = [];
    const reduce = matchMedia("(prefers-reduced-motion: reduce)");
    const proj = () =>
      d3
        .geoOrthographic()
        .translate([size / 2, size / 2])
        .scale(size * 0.43)
        .rotate(rotation)
        .clipAngle(90);
    function draw() {
      const ratio = Math.min(devicePixelRatio || 1, 2);
      ctx!.setTransform(ratio, 0, 0, ratio, 0, 0);
      ctx!.clearRect(0, 0, size, size);
      const p = proj(),
        path = d3.geoPath(p, ctx!);
      ctx!.beginPath();
      ctx!.arc(size * 0.73, size * 0.26, size * 0.24, 0, Math.PI * 2);
      ctx!.fillStyle = "#fff0b4";
      ctx!.fill();
      ctx!.beginPath();
      path({ type: "Sphere" });
      ctx!.fillStyle = "#f1eefb";
      ctx!.fill();
      ctx!.strokeStyle = "#d9d0ee";
      ctx!.lineWidth = 1;
      ctx!.stroke();
      ctx!.beginPath();
      path(land);
      ctx!.fillStyle = "#bfe8d8";
      ctx!.fill();
      ctx!.beginPath();
      path(d3.geoGraticule10());
      ctx!.strokeStyle = "#d4cbed";
      ctx!.lineWidth = 0.55;
      ctx!.stroke();
      hits = [];
      cities.forEach((city, i) => {
        if (
          d3.geoDistance([-rotation[0], -rotation[1]], city.coords) >
          Math.PI / 2
        )
          return;
        const xy = p(city.coords);
        if (!xy) return;
        hits.push({ i, x: xy[0], y: xy[1] });
        ctx!.beginPath();
        ctx!.arc(xy[0], xy[1], i === selected ? 6 : 4, 0, Math.PI * 2);
        ctx!.fillStyle = "#151719";
        ctx!.fill();
        ctx!.strokeStyle = "#fff";
        ctx!.lineWidth = 2;
        ctx!.stroke();
        ctx!.font = "600 " + Math.max(11, size * 0.027) + "px Inter,system-ui";
        const w = ctx!.measureText(city.name).width + 18;
        const x = Math.max(4, Math.min(xy[0] + 10, size - w - 4)),
          y = Math.max(20, xy[1] - 10);
        ctx!.fillStyle = "#ffffffed";
        ctx!.beginPath();
        ctx!.roundRect(x, y - 14, w, 25, 8);
        ctx!.fill();
        ctx!.fillStyle = "#151719";
        ctx!.fillText(city.name, x + 9, y + 3);
      });
    }

    const resize = () => {
      size = canvas.getBoundingClientRect().width;
      const ratio = Math.min(devicePixelRatio || 1, 2);
      canvas.width = Math.round(size * ratio);
      canvas.height = Math.round(size * ratio);
      draw();
    };
    const observer = new ResizeObserver(resize);
    observer.observe(canvas);
    resize();
    const target: [number, number] = [
      -cities[selected].coords[0],
      -cities[selected].coords[1],
    ];
    if (previous.current !== turn) {
      const from = [...rotation],
        delta = ((target[0] - from[0] + 540) % 360) - 180,
        begin = performance.now();
      const tick = (now: number) => {
        const k = reduce.matches ? 1 : Math.min((now - begin) / 800, 1),
          ease = 1 - Math.pow(1 - k, 3);
        rotation = [
          from[0] + delta * ease,
          from[1] + (target[1] - from[1]) * ease,
        ];
        draw();
        if (k < 1) frame = requestAnimationFrame(tick);
      };
      frame = requestAnimationFrame(tick);
      previous.current = turn;
    }
    const onPreference = () => {
      if (reduce.matches) {
        cancelAnimationFrame(frame);
        rotation = target;
        draw();
      }
    };
    reduce.addEventListener("change", onPreference);
    const down = (e: PointerEvent) => {
      if (e.pointerType === "mouse" && e.button !== 0) return;
      cancelAnimationFrame(frame);
      drag = { x: e.clientX, y: e.clientY, rotation: [...rotation] };
      moved = false;
      canvas.setPointerCapture(e.pointerId);
    };
    const move = (e: PointerEvent) => {
      if (!drag) return;
      const dx = e.clientX - drag.x,
        dy = e.clientY - drag.y;
      if (Math.abs(dx) + Math.abs(dy) > 5) moved = true;
      rotation = [
        drag.rotation[0] + dx * 0.3,
        Math.max(-70, Math.min(70, drag.rotation[1] - dy * 0.25)),
      ];
      draw();
    };
    const up = (e: PointerEvent) => {
      if (drag && !moved) {
        const r = canvas.getBoundingClientRect();
        const hit = hits.find(
          (h) =>
            Math.hypot(h.x - (e.clientX - r.left), h.y - (e.clientY - r.top)) <
            28,
        );
        if (hit) onSelect(hit.i);
      }
      drag = null;
      if (canvas.hasPointerCapture(e.pointerId))
        canvas.releasePointerCapture(e.pointerId);
    };
    const cancel = () => {
      drag = null;
    };
    const key = (e: KeyboardEvent) => {
      if (!["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown"].includes(e.key))
        return;
      e.preventDefault();
      cancelAnimationFrame(frame);
      rotation = [
        rotation[0] +
          (e.key === "ArrowRight" ? 10 : e.key === "ArrowLeft" ? -10 : 0),
        Math.max(
          -70,
          Math.min(
            70,
            rotation[1] +
              (e.key === "ArrowDown" ? 10 : e.key === "ArrowUp" ? -10 : 0),
          ),
        ),
      ];
      draw();
    };
    canvas.addEventListener("pointerdown", down);
    canvas.addEventListener("pointermove", move);
    canvas.addEventListener("pointerup", up);
    canvas.addEventListener("pointercancel", cancel);
    canvas.addEventListener("lostpointercapture", cancel);
    canvas.addEventListener("keydown", key);
    return () => {
      savedRotation.current = rotation;
      cancelAnimationFrame(frame);
      observer.disconnect();
      reduce.removeEventListener("change", onPreference);
      canvas.removeEventListener("pointerdown", down);
      canvas.removeEventListener("pointermove", move);
      canvas.removeEventListener("pointerup", up);
      canvas.removeEventListener("pointercancel", cancel);
      canvas.removeEventListener("lostpointercapture", cancel);
      canvas.removeEventListener("keydown", key);
    };
  }, [selected, turn, onSelect]);
  return (
    <canvas
      ref={ref}
      className={s.canvas}
      tabIndex={0}
      role="group"
      aria-label="Interactive globe. Use arrow keys to rotate, or choose a city below."
      aria-describedby="world-instructions"
    />
  );
}
