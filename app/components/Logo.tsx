"use client";

interface LogoProps {
  variant?: "dark" | "light" | "auto";
  size?: number;
  className?: string;
}

export default function Logo({ variant = "dark", size = 28, className }: LogoProps) {
  // "auto" follows the app theme token, so the wordmark stays legible on a
  // surface that can be cream or warm dark. "dark"/"light" keep their fixed
  // colours for surfaces that are always one or the other.
  const textColor = variant === "auto" ? "var(--uf-ink)" : variant === "dark" ? "#ffffff" : "#064E3B";
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 9 }} className={className}>
      <img
        src="/logo/horizon-color.svg"
        width={size}
        height={size}
        alt="UntilFire"
        style={{ borderRadius: Math.round(size * 0.22), display: "block", flexShrink: 0 }}
      />
      <span style={{ fontWeight: 800, fontSize: size * 0.86, color: textColor, letterSpacing: "-0.3px", lineHeight: 1 }}>
        UntilFire
      </span>
    </span>
  );
}
