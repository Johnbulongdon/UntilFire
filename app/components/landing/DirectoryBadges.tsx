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
  rel?: string;
  data?: Record<string, string>;
}[] = [
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
    name: "Launchpadly",
    href: "https://launchpadly.co/startup/untilfire?ref=badge",
    src: "https://launchpadly.co/embed/badges/startup/untilfire.svg?variant=minimal",
    data: {
      "data-launchpadly-badge": "untilfire",
      "data-launchpadly-badge-variant": "minimal",
    },
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
                onError={() => setFailed((old) => new Set(old).add(b.name))}
              />
              <span className="nh-badge-fallback">{b.name}</span>
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
