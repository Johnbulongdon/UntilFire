"use client";
import Image from "next/image";
/** Same vector brand artwork as every entry point, without media/player UI. */
export default function SavedPlanLoading() {
  return (
    <div
      role="status"
      aria-live="polite"
      style={{
        minHeight: "calc(100dvh - 184px)",
        display: "grid",
        placeItems: "center",
      }}
    >
      <span className="sr-only">Loading your saved plan</span>
      <Image
        className="uf-brand-mark-light"
        src="/brand/mark-black.svg"
        alt=""
        width={180}
        height={96}
        unoptimized
      />
      <Image
        className="uf-brand-mark-dark"
        src="/brand/mark-white.svg"
        alt=""
        width={180}
        height={96}
        unoptimized
      />
    </div>
  );
}
