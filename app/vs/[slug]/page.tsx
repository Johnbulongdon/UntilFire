import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { siteUrl, DEFAULT_OG_IMAGE } from "@/lib/site";
import { VS_PAGES, getVsPage } from "@/lib/vs/pages";
import VsPageView from "../VsPageView";

export const dynamicParams = false;

export function generateStaticParams() {
  return VS_PAGES.map((p) => ({ slug: p.slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const page = getVsPage((await params).slug);
  if (!page) return {};
  const url = siteUrl(`/vs/${page.slug}`);
  return {
    title: page.title,
    description: page.description,
    alternates: { canonical: url },
    openGraph: { images: [DEFAULT_OG_IMAGE], title: page.title, description: page.description, url, siteName: "UntilFire", type: "website" },
    twitter: { images: [DEFAULT_OG_IMAGE.url], card: "summary_large_image", title: page.title, description: page.description },
  };
}

export default async function VsSlugPage({ params }: { params: Promise<{ slug: string }> }) {
  const page = getVsPage((await params).slug);
  if (!page) notFound();
  return <VsPageView page={page} />;
}
