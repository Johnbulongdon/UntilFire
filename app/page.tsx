import HomeClient from "./HomeClient";

export const metadata = {
  title: "UntilFire — FIRE Calculator & Financial Freedom Planner",
  description:
    "Estimate your FIRE number and freedom date free with UntilFire, from your income, spending and savings. No login required.",
  alternates: { canonical: "https://www.untilfire.com/" },
  openGraph: {
    title: "UntilFire — FIRE Calculator & Financial Freedom Planner",
    description:
      "Estimate your FIRE number and freedom date free with UntilFire. Explore when work could become optional, no login required.",
    siteName: "UntilFire",
    url: "https://www.untilfire.com/",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "UntilFire — FIRE Calculator & Financial Freedom Planner",
    description:
      "Estimate your FIRE number and freedom date free with UntilFire. Explore when work could become optional, no login required.",
    images: ["https://www.untilfire.com/opengraph-image"],
  },
};

export default function Home() {
  return <HomeClient />;
}
