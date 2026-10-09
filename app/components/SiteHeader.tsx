"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import Logo from "@/app/components/Logo";
import { useAuth } from "@/lib/auth-context";
import styles from "./SiteHeader.module.css";

/**
 * The one top bar for every public page: landing, calculators, city pages,
 * Learn, pricing, invite. The root layout renders it; the landing page
 * renders its own fixed copy over the hero. The app itself (dashboard,
 * admin), sign-in, and the creator embed keep their own chrome.
 */
const HIDDEN_ON = ["/dashboard", "/admin", "/embed", "/login", "/auth", "/styleguide", "/transactions", "/r/"];

export function showsSiteHeader(pathname: string): boolean {
  if (pathname === "/") return false; // LandingPage renders <SiteHeader fixed />.
  return !HIDDEN_ON.some((p) => pathname === p || pathname.startsWith(p.endsWith("/") ? p : `${p}/`));
}

export default function SiteHeader({
  fixed = false,
  onStart,
  signedIn,
}: {
  /** Float over the page (the landing hero) instead of taking up space. */
  fixed?: boolean;
  /** On the landing page, "Get started" opens the calculator in place. */
  onStart?: () => void;
  signedIn?: boolean;
}) {
  const pathname = usePathname() ?? "/";
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  useEffect(() => setOpen(false), [pathname]);

  if (!fixed && !showsSiteHeader(pathname)) return null;

  const home = pathname === "/";
  const isSignedIn = signedIn ?? !!user;
  const links = [
    { href: home ? "#how" : "/#how", label: "How it works" },
    { href: "/explore", label: "Explore" },
    { href: "/calculators", label: "Calculators" },
    { href: "/learn", label: "Learn" },
    { href: home ? "#pricing" : "/pricing", label: "Pricing" },
  ];
  // Keeps the per-page source the old page bars sent, e.g. nav-calculators-apy.
  const source = ["nav", ...pathname.split("/").filter(Boolean).slice(0, 2)].join("-");
  const active = (href: string) => href !== "/#how" && !href.startsWith("#") && pathname.startsWith(href);

  return (
    <header className={`${styles.bar} ${fixed ? styles.fixed : ""}`}>
      <Link href="/" className={styles.logo} aria-label="UntilFire home">
        <Logo variant="auto" size={26} />
      </Link>
      <nav className={`${styles.links} ${open ? styles.open : ""}`} id="site-nav-links" aria-label="Main">
        {links.map((l) => (
          <Link key={l.label} href={l.href} aria-current={active(l.href) ? "page" : undefined} onClick={() => setOpen(false)}>
            {l.label}
          </Link>
        ))}
      </nav>
      <div className={styles.actions}>
        {isSignedIn ? (
          <Link className={styles.cta} href="/dashboard">Dashboard</Link>
        ) : onStart ? (
          <button type="button" className={styles.cta} onClick={onStart}>Get started</button>
        ) : (
          <Link className={styles.cta} href={`/?source=${encodeURIComponent(source)}`}>Get started</Link>
        )}
        <button
          type="button"
          className={styles.menu}
          aria-expanded={open}
          aria-controls="site-nav-links"
          aria-label={open ? "Close menu" : "Open menu"}
          onClick={() => setOpen((o) => !o)}
        >
          <span aria-hidden>{open ? "✕" : "☰"}</span>
        </button>
      </div>
    </header>
  );
}
