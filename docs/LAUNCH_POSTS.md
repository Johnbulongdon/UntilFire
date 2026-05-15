# UntilFire - Launch Posts
Last updated: May 2026

> Ready-to-post copy for Reddit, Hacker News, and Product Hunt.
> Do not use referral links in the Reddit post.

---

## 1. Reddit - r/financialindependence Weekly Self-Promotion Thread

**Where to post**: https://www.reddit.com/r/financialindependence/  
**When**: Every Wednesday the AutoModerator posts a new Weekly Self-Promotion Thread.  
**Rules**: No referral links. No standalone link-only posts. Be useful, transparent, and humble.

### Post Copy

Hey everyone - I've been building **UntilFire** and wanted to share it here for feedback from people who actually care about FIRE math.

The gap I kept seeing is that most tools either give you a basic number you cannot fully trust, or a very deep model that still does not tell you what to change next.

UntilFire is my attempt to make that first answer faster and more believable.

**What is live today:**
- A free no-login calculator that asks for city, income, monthly savings, and your current invested balance, then gives you a FIRE number and estimated retirement year in about a minute
- 263 cities worldwide with cost-of-living estimates instead of one national average
- Tax-aware calculations for US states plus effective-rate handling for international cities
- New city pages for places like Austin, London, Singapore, Shanghai, and Dubai so people can compare FIRE math by location
- A dashboard after signup if you want to keep tracking and improve the estimate with real numbers later

I would especially love feedback if:
- the cost-of-living estimate for your city feels off
- the tax math looks wrong for your situation
- the result feels directionally useful but still misses something important

https://untilfire.com

### Notes for posting

- Reply quickly if people ask about assumptions or methodology.
- Do not oversell. The honest tone usually performs better in this community.
- If a city page is relevant to the thread, link that page instead of always linking the homepage.

---

## 2. Hacker News - Show HN

**Where to post**: https://news.ycombinator.com/submit  
**Title format**: Must begin with `Show HN:`  
**Best time**: Tuesday to Thursday, 7-9am US Eastern.

### Title

```text
Show HN: UntilFire - a city-aware FIRE calculator and planning dashboard
```

### Post Body

I built UntilFire because I think FIRE software still has a strange gap: the fast tools feel too generic, and the powerful tools feel too heavy for the first question someone actually wants answered.

That first question is usually some version of:
"Can I retire early, and how far away am I really?"

What is live right now:

1. A no-login FIRE calculator that uses city, income, monthly savings, and current invested balance before showing the result.
2. Cost-of-living coverage across 263 cities, plus custom-city fallback.
3. Tax-aware math for US states and international effective-rate handling.
4. Individual calculator pages for high-intent finance searches like FIRE number, Coast FIRE, APY, savings rate, and compound interest.
5. New city-specific landing pages for Austin, London, Singapore, Shanghai, and Dubai.

The product direction is to turn that first answer into a real ongoing dashboard: track cashflow, update your timeline, and eventually surface the single highest-impact thing to change each month.

Stack: Next.js 15, Supabase, Vercel, PostHog.

Limitations:
- The city landing pages are still early and intentionally simple.
- The public calculator is deterministic, not a Monte Carlo planner.
- The dashboard is farther along than the distribution engine, which is what I am fixing now.

Happy to talk about methodology, tax assumptions, or where this is still weak.

https://untilfire.com

### Notes for posting

- Stay around to answer every early comment.
- If someone challenges a number, treat that as a gift and go deep on it.
- Lead with "no login" and "city-aware" because those are the clearest product differentiators.

---

## 3. Product Hunt

**Status**: Wait until there is visible social proof and a cleaner screenshot set.  
**Ideal timing**: After the city-page SEO motion and onboarding conversion improve.

### Tagline draft

> Find out exactly when you can retire - adjusted for your city, taxes, savings pace, and current portfolio.
