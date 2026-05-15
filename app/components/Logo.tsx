"use client";

interface LogoProps {
  variant?: "dark" | "light";
  size?: number;
  className?: string;
}

export default function Logo({ variant = "dark", size = 28, className }: LogoProps) {
  const textColor = variant === "dark" ? "#ffffff" : "#064E3B";
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
