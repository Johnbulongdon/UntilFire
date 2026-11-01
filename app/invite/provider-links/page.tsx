import type { Metadata } from "next";
import ProviderLinksPage from "./ProviderLinksPage";
export const metadata: Metadata = { title: "My provider links | UntilFire", robots: { index: false, follow: false } };
export default async function Page({ searchParams }: { searchParams: Promise<{ from?: string }> }) {
  return <ProviderLinksPage fromProfile={(await searchParams).from === "profile"} />;
}
