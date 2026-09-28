import type { Metadata } from "next";
import { siteUrl } from "@/lib/site";

export const metadata: Metadata = {
  robots: { index: false, follow: false },
  alternates: { canonical: siteUrl('/admin') },
};

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return children;
}
