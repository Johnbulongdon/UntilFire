import { MetadataRoute } from "next"
import { siteUrl } from "@/lib/site"

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      // Share images live under /api/og/; X only fetches what robots.txt allows.
      allow: ["/", "/api/og/"],
      disallow: ["/dashboard", "/transactions", "/expenses", "/api/", "/auth/", "/go/"],
    },
    sitemap: siteUrl('/sitemap.xml'),
  }
}
