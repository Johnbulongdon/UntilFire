"use client";

import Image from "next/image";
import { useEffect, useRef, useState } from "react";

/** The existing brand animation on the current page surface, with a still fallback. */
export default function SavedPlanLoading() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [animate, setAnimate] = useState(false);
  const [hasFrame, setHasFrame] = useState(false);

  useEffect(() => {
    const preference = window.matchMedia("(prefers-reduced-motion: reduce)");
    const sync = () => setAnimate(!preference.matches);
    sync();
    preference.addEventListener("change", sync);
    return () => preference.removeEventListener("change", sync);
  }, []);

  useEffect(() => {
    if (!animate) return;
    const video = videoRef.current;
    const canvas = canvasRef.current;
    const context = canvas?.getContext("2d", { willReadFrequently: true });
    if (!video || !canvas || !context) return;
    let alive = true;
    let started = false;
    let frame = 0;
    let lastTime = -1;
    const fallback = () => {
      if (!alive) return;
      cancelAnimationFrame(frame);
      video.pause();
      setHasFrame(false);
    };
    const draw = () => {
      if (!alive) return;
      try {
        if (video.readyState >= 2 && video.currentTime !== lastTime) {
          lastTime = video.currentTime;
          context.clearRect(0, 0, canvas.width, canvas.height);
          context.drawImage(video, 0, 0, canvas.width, canvas.height);
          // The source clip is teal on black. Unpremultiply that black matte
          // so the same sun can sit on both warm light and dark surfaces.
          const image = context.getImageData(0, 0, canvas.width, canvas.height);
          const pixels = image.data;
          for (let i = 0; i < pixels.length; i += 4) {
            const peak = Math.max(pixels[i], pixels[i + 1], pixels[i + 2]);
            if (peak < 8) { pixels[i + 3] = 0; continue; }
            const alpha = Math.min(1, peak / 204);
            pixels[i] = Math.min(255, pixels[i] / alpha);
            pixels[i + 1] = Math.min(255, pixels[i + 1] / alpha);
            pixels[i + 2] = Math.min(255, pixels[i + 2] / alpha);
            pixels[i + 3] = 255 * alpha;
          }
          context.putImageData(image, 0, 0);
          setHasFrame(true);
        }
        frame = requestAnimationFrame(draw);
      } catch { fallback(); }
    };
    const start = () => {
      if (started || !alive) return;
      started = true;
      video.play().then(() => { if (alive) draw(); }).catch(fallback);
    };
    video.addEventListener("loadeddata", start);
    video.addEventListener("error", fallback);
    if (video.readyState >= 2) start();
    return () => {
      alive = false;
      cancelAnimationFrame(frame);
      video.pause();
      video.removeEventListener("loadeddata", start);
      video.removeEventListener("error", fallback);
    };
  }, [animate]);

  const showAnimation = animate && hasFrame;
  return (
    <div role="status" aria-live="polite" style={{ minHeight: "calc(100dvh - 184px)", display: "grid", placeItems: "center" }}>
      <span className="sr-only">Loading your saved plan</span>
      <div style={{ position: "relative", width: 260, height: 260, display: "grid", placeItems: "center" }} aria-hidden="true">
        <Image src="/logo/horizon-mark-only.svg" alt="" width={180} height={180} unoptimized hidden={showAnimation} />
        <canvas ref={canvasRef} width={360} height={360} hidden={!showAnimation} style={{ width: 260, height: 260 }} />
        <video ref={videoRef} src={animate ? "/logo/logo-reveal.mp4" : undefined} muted playsInline loop preload="auto"
          style={{ position: "absolute", width: 1, height: 1, opacity: 0, pointerEvents: "none" }} />
      </div>
    </div>
  );
}
