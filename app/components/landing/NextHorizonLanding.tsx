"use client";
import Link from "next/link";
import { useId, useMemo, useState } from "react";
import {
  ArrowRight,
  Wallet,
  CalendarDays,
  Check,
  ShieldCheck,
} from "lucide-react";
import SiteHeader from "@/app/components/SiteHeader";
import DirectoryBadges from "./DirectoryBadges";
import { quickFreedom, freedomPath } from "@/lib/quick-freedom";
import {
  PRO_ANNUAL_LABEL,
  PRO_MONTHLY_LABEL,
  REFERRED_TRIAL_LABEL,
  TRIAL_LABEL,
} from "@/lib/pricing";
import "./next-horizon.css";
const sample = { monthlyIncome: 4500, monthlySpending: 3000, invested: 135000 };
export default function NextHorizonLanding({
  onStart,
  signedIn,
  referred,
}: {
  onStart: () => void;
  signedIn?: boolean;
  referred?: boolean;
}) {
  const [extra,setExtra]=useState(0);
  const controlId=useId();
  const example=useMemo(()=>({...sample,monthlyIncome:sample.monthlyIncome+extra}),[extra]);
  const result = useMemo(() => quickFreedom(example), [example]);
  const values = useMemo(() => freedomPath(example), [example]);
  const target = result.target || 1;
  const line = values
    .map(
      (v, i) =>
        `${i ? "L" : "M"}${20 + (i / (values.length - 1)) * 580},${180 - (v / Math.max(target, ...values)) * 150}`,
    )
    .join(" ");
  return (
    <div className="nh-landing">
      <a href="#uf-landing-main" className="uf-skip">Skip to content</a>
      <SiteHeader onStart={onStart} signedIn={signedIn} />
      <main id="uf-landing-main" tabIndex={-1} className="nh-public">
        <section className="nh-public-hero">
          <div>
            <span className="nh-eyebrow">Your money. Your next chapter.</span>
            <h1>
              See beyond
              <br />
              your balance.
            </h1>
            <p>
              Find the year work becomes optional. Then take one clear step
              towards it.
            </p>
            <div className="nh-actions">
              <button onClick={onStart} className="nh-primary">
                Get started
                <ArrowRight size={18} />
              </button>
              <Link href="/login" className="nh-secondary">
                I already have an account
              </Link>
            </div>
            <span className="nh-reassurance">
              <ShieldCheck size={15} />
              Free starting plan. No account needed.
            </span>
          </div>
          <div className="nh-example">
            <div className="nh-example-label">Example plan</div>
            <span>Work becomes optional</span>
            <strong aria-live="polite" aria-atomic="true">{result.year ?? "—"}</strong>
            <p>15% of the way</p>
            <svg
              viewBox="0 0 620 220"
              role="img"
              aria-label="Example savings projection towards a freedom target"
            >
              <path d={line + " L600 210 H20 Z"} fill="#FFFFFF65" />
              <path
                className="nh-chart-draw"
                d={line}
                fill="none"
                stroke="#151719"
                strokeWidth="3"
                pathLength="1"
              />
              <circle
                cx="600"
                cy={180 - (values.at(-1)! / Math.max(target, ...values)) * 150}
                r="6"
                fill="#151719"
              />
            </svg>
            <div className="nh-example-control">
              <label htmlFor={controlId}>Try saving a little more <strong>+$<output htmlFor={controlId}>{extra}</output>/month</strong></label>
              <input id={controlId} aria-label="Extra monthly savings in the example" type="range" min="0" max="500" step="50" value={extra} onChange={e=>setExtra(Number(e.target.value))}/>
              <small>Example only · extra income saved · your plan is unchanged</small>
            </div>
            <div className="nh-chart-key">
              <span>Saved $135,000</span>
              <span>Target $900,000</span>
            </div>
          </div>
        </section>
        <section className="nh-three" id="how">
          <div className="nh-section-title">
            <span className="nh-eyebrow">One connected picture</span>
            <h2>
              Clarity for today.
              <br />
              Choices for tomorrow.
            </h2>
          </div>
          <div className="nh-feature-grid">
            {[
              [
                Wallet,
                "Money",
                "See what comes in, goes out and stays yours.",
                "lilac",
              ],
              [
                CalendarDays,
                "Plan",
                "See where your current pace could take you.",
                "yellow",
              ],
              [
                Check,
                "Today",
                "A small money check. A clearer picture.",
                "mint",
              ],
            ].map(([I, title, copy, tone]) => {
              const Icon = I as typeof Wallet;
              return (
                <article className={"nh-feature " + tone} key={String(title)}>
                  <Icon size={28} />
                  <h3>{String(title)}</h3>
                  <p>{String(copy)}</p>
                </article>
              );
            })}
          </div>
        </section>
        <section className="nh-next" id="pricing">
          <div>
            <h2>
              Your next chapter
              <br />
              starts with your numbers.
            </h2>
            <p>
              Your starting plan is free. Pro adds the tools to keep it
              connected.
            </p>
            <p className="nh-pricing">
              {PRO_MONTHLY_LABEL}/month or {PRO_ANNUAL_LABEL}/year ·{" "}
              {referred ? REFERRED_TRIAL_LABEL : TRIAL_LABEL}
            </p>
          </div>
          <div>
            <button className="nh-primary" onClick={onStart}>
              Find my freedom date
              <ArrowRight size={18} />
            </button>
            <Link href="/pricing">See plans</Link>
          </div>
        </section>
      </main>
      <DirectoryBadges />
    </div>
  );
}
