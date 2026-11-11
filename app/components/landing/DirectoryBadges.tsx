"use client";
import { useState } from "react";
/* eslint-disable @next/next/no-img-element */
// Directory listings that are live with a followed link and stay live only
// while their badge is on the homepage. Each directory's verifier looks for its
// own link and image, so keep the href and src exactly as issued.
// Before removing one, check docs/marketing/BACKLINK_LEDGER.md.
const badges: {
  name: string;
  href: string;
  src: string;
  /** Optional dark-mode image; `src` is then the light-mode one. */
  srcDark?: string;
  rel?: string;
  data?: Record<string, string>;
}[] = [
  {
    name: "Founder.best",
    href: "https://www.founder.best/products/untilfire?ref=founderbest",
    src: "https://www.founder.best/top1.png",
    rel: "noopener noreferrer",
  },
  {
    name: "SaaSLineup",
    href: "https://saaslineup.com/product/untilfire?ref=badge",
    src: "https://saaslineup.com/badge/untilfire.svg",
    rel: "dofollow",
  },
  {
    name: "TheSaaSDir",
    href: "https://thesaasdir.com/product/untilfire?ref=badge",
    src: "https://thesaasdir.com/badge/untilfire.svg",
    rel: "dofollow",
  },
  {
    name: "TheMicroSaaSDir",
    href: "https://themicrosaasdir.com/product/untilfire?ref=badge",
    src: "https://themicrosaasdir.com/badge/untilfire.svg",
    rel: "dofollow",
  },
  {
    name: "IndieLineup",
    href: "https://indielineup.com/product/untilfire?ref=badge",
    src: "https://indielineup.com/badge/untilfire.svg",
    rel: "dofollow",
  },
  {
    name: "SaaS Cubes",
    href: "https://saascubes.com",
    src: "https://saascubes.com/images/badges/badge-dark.png",
  },
  {
    name: "Toolcurio",
    href: "https://toolcurio.com",
    src: "https://toolcurio.com/badge-light.png",
  },
  {
    name: "Startup Fast",
    href: "https://startupfa.st/projects/untilfire",
    src: "https://startupfa.st/images/badges/top1-dark.svg",
  },
  {
    name: "Uneed",
    href: "https://www.uneed.best/tool/untilfire",
    src: "https://www.uneed.best/POTD3A.png",
  },
  {
    name: "Launchstag",
    href: "https://launchstag.com/p/untilfire",
    src: "https://launchstag.com/badge-dark.svg",
  },
  {
    name: "Noonlaunch",
    href: "https://noonlaunch.com/product/untilfire",
    src: "https://noonlaunch.com/badges/untilfire.svg",
    rel: "dofollow",
  },
  {
    name: "ToolDirs",
    href: "https://tooldirs.com/product/untilfire",
    src: "https://tooldirs.com/badge/badge_dark.svg",
  },
  {
    name: "DodoDirectory",
    href: "https://dododirectory.com",
    src: "https://dododirectory.com/badge-dark.png",
    rel: "dofollow",
  },
  {
    name: "SumoDir",
    href: "https://sumodir.com/item/untilfire-wwwuntilfirecom",
    src: "https://sumodir.com/badge.png",
    rel: "dofollow",
  },
  {
    name: "Toolfio",
    href: "https://toolfio.com",
    src: "https://toolfio.com/toolfio-dark-badge.png",
    rel: "dofollow",
  },
  {
    name: "First Look",
    href: "https://firstlook.tools/product/untilfire",
    src: "https://firstlook.tools/badge/badge_transparent.svg",
  },
  {
    name: "ShowMySites",
    href: "https://www.showmysites.com",
    src: "https://www.showmysites.com/static/backlink/gray_border.webp",
  },
  {
    name: "DodoLaunch",
    href: "https://dodolaunch.com/p/untilfire?ref=badge",
    src: "https://dodolaunch.com/badge/untilfire?theme=light",
    srcDark: "https://dodolaunch.com/badge/untilfire?theme=dark",
    rel: "dofollow",
  },
  {
    name: "Launchpadly",
    href: "https://launchpadly.co/startup/untilfire?ref=badge",
    src: "https://launchpadly.co/embed/badges/startup/untilfire.svg?variant=minimal",
    data: {
      "data-launchpadly-badge": "untilfire",
      "data-launchpadly-badge-variant": "minimal",
    },
  },
  {
    name: "SaaS City",
    href: "https://saascity.io/live/untilfire",
    src: "https://saascity.io/badges/featured-dark.svg",
  },
  {
    name: "Indie Scroll",
    href: "https://indiescroll.com/projects/untilfire",
    src: "https://indiescroll.com/indiescroll/images/badges/top2-light.svg",
    srcDark: "https://indiescroll.com/indiescroll/images/badges/top2-dark.svg",
  },
  {
    name: "Build Finds",
    href: "https://buildfinds.com/projects/untilfire",
    src: "https://buildfinds.com/buildfinds/images/badges/top3-dark.svg",
  },
  {
    name: "Startups of the World",
    href: "https://startupsoftheworld.com/?s=untilfire-ram8bv&ref=badge",
    src: "https://startupsoftheworld.com/badge/untilfire-ram8bv.svg",
    srcDark: "https://startupsoftheworld.com/badge/untilfire-ram8bv.svg?theme=dark",
  },
  {
    name: "KittyLaunch",
    href: "https://kittylaunch.com/p/untilfire",
    src: "https://kittylaunch.com/api/public/badges/launch_badge.svg?theme=light&name=UntilFire",
    data: { "data-kittylaunch-badge": "1" },
  },
  {
    name: "Clapstorm",
    href: "https://www.clapstorm.com/p/untilfire",
    src: "https://www.clapstorm.com/badge?slug=untilfire&variant=featured&theme=dark",
    rel: "nofollow noopener",
  },
];

export default function DirectoryBadges() {
  const [failed, setFailed] = useState<Set<string>>(() => new Set());
  return (
    <section className="nh-listed" aria-labelledby="nh-listed-title">
      <h2 id="nh-listed-title">Listed on</h2>
      <ul>
        {badges.map((b) => (
          <li key={b.name}>
            <a
              href={b.href}
              target="_blank"
              rel={b.rel ?? "noopener"}
              title={`UntilFire on ${b.name}`}
              data-image-failed={failed.has(b.name) || undefined}
              {...b.data}
            >
              <img
                src={b.src}
                alt={`Featured on ${b.name}`}
                height={36}
                loading="lazy"
                className={b.srcDark ? "nh-badge-light" : undefined}
                onError={() => setFailed((old) => new Set(old).add(b.name))}
              />
              {b.srcDark && (
                <img
                  src={b.srcDark}
                  alt={`Featured on ${b.name}`}
                  height={36}
                  loading="lazy"
                  className="nh-badge-dark"
                  onError={() => setFailed((old) => new Set(old).add(b.name))}
                />
              )}
              <span className="nh-badge-fallback">{b.name}</span>
            </a>
          </li>
        ))}
        {/* launched.tools issues an HTML badge (no image); markup kept as issued. */}
        {(["dark", "light"] as const).map((t) => (
          <li key={`launched-${t}`} className={t === "dark" ? "nh-badge-dark" : "nh-badge-light"}>
            <a
              href="https://launched.tools/tools/untilfire"
              target="_blank"
              rel="noopener"
              title="UntilFire on launched.tools"
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 8,
                background: t === "dark" ? "#15170F" : "#FFFFFF",
                border: "1px solid #D4D7C9",
                borderRadius: 10,
                padding: "8px 12px",
                textDecoration: "none",
                fontFamily: "sans-serif",
              }}
            >
              <span
                style={{
                  width: 22,
                  height: 22,
                  borderRadius: 6,
                  background: "#C6F94E",
                  display: "inline-flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <svg width="13" height="13" viewBox="128 120 264 264" aria-hidden="true">
                  <path d="M214 120 L392 120 L392 298 Z" fill="#15170F" />
                  <path d="M156 356 L322 190" stroke="#15170F" strokeWidth="78" fill="none" />
                </svg>
              </span>
              <span style={{ display: "flex", flexDirection: "column", lineHeight: 1.2 }}>
                <span style={{ fontWeight: 700, fontSize: 12, color: t === "dark" ? "#F5F6F0" : "#15170F" }}>
                  Featured on launched.tools
                </span>
                <span style={{ fontSize: 10, color: "#878C79" }}>REVIEWED ✓</span>
              </span>
            </a>
          </li>
        ))}
        {/* Tools Network issues an HTML badge (no image); markup kept as issued. */}
        {(["dark", "light"] as const).map((t) => (
          <li key={`toolsnetwork-${t}`} className={t === "dark" ? "nh-badge-dark" : "nh-badge-light"}>
            <a
              href="https://toolsnetwork.co/tools/untilfire"
              target="_blank"
              rel="noopener"
              title="UntilFire on Tools Network"
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 8,
                padding: "9px 13px",
                borderRadius: 10,
                fontFamily: "system-ui,-apple-system,sans-serif",
                fontSize: 13,
                fontWeight: 600,
                textDecoration: "none",
                background: t === "dark" ? "#0b0c11" : "#ffffff",
                border: t === "dark" ? "1px solid #292b38" : "1px solid #e5e5df",
                color: t === "dark" ? "#ffffff" : "#111111",
              }}
            >
              <svg width="18" height="18" viewBox="0 0 32 32" aria-hidden="true" style={{ flex: "0 0 auto", display: "block" }}>
                <rect width="32" height="32" rx="7" fill="#7c5cff" />
                <path d="M10 10 L22 11 L16 22 Z" fill="none" stroke="#fff" strokeWidth="1.7" strokeLinejoin="round" />
                <circle cx="10" cy="10" r="2.7" fill="#fff" />
                <circle cx="22" cy="11" r="2.7" fill="#fff" />
                <circle cx="16" cy="22" r="2.7" fill="#fff" />
              </svg>
              <span>
                Featured on <b>Tools Network</b>
              </span>
            </a>
          </li>
        ))}
        <li>
          <a
            href="https://curlship.com"
            target="_blank"
            rel="noopener"
            title="Listed on CurlShip"
            className="nh-listed-text"
          >
            Listed on CurlShip
          </a>
        </li>
      </ul>
    </section>
  );
}
