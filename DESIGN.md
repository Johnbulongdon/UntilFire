---
version: alpha
name: UntilFire
description: Calm, premium personal finance design system centered on freedom, clarity, and trustworthy guidance toward work optionality.
colors:
  primary: "#003527"
  secondary: "#64748B"
  tertiary: "#20D4BF"
  neutral: "#FAFDFB"
  surface-soft: "#F6F9F4"
  surface-tint: "#ECFDF5"
  text-body: "#19181E"
  success-deep: "#065F46"
  on-primary: "#FFFFFF"
  on-tertiary: "#003527"
  on-neutral: "#003527"
typography:
  h1:
    fontFamily: Manrope
    fontSize: 6rem
    fontWeight: 800
    lineHeight: 1
    letterSpacing: "-0.05em"
  h2:
    fontFamily: Manrope
    fontSize: 3.5rem
    fontWeight: 800
    lineHeight: 1.05
    letterSpacing: "-0.03em"
  h3:
    fontFamily: Manrope
    fontSize: 1.5rem
    fontWeight: 700
    lineHeight: 1.2
    letterSpacing: "-0.01em"
  body-lg:
    fontFamily: Manrope
    fontSize: 1.1875rem
    fontWeight: 500
    lineHeight: 1.6
  body-md:
    fontFamily: Manrope
    fontSize: 1rem
    fontWeight: 500
    lineHeight: 1.6
  body-sm:
    fontFamily: Manrope
    fontSize: 0.875rem
    fontWeight: 500
    lineHeight: 1.5
  label-caps:
    fontFamily: Manrope
    fontSize: 0.75rem
    fontWeight: 700
    lineHeight: 1.2
    letterSpacing: "0.16em"
rounded:
  sm: 10px
  md: 16px
  lg: 20px
  xl: 28px
  full: 9999px
spacing:
  xs: 4px
  sm: 8px
  md: 16px
  lg: 24px
  xl: 32px
  xxl: 48px
  section: 80px
components:
  button-primary:
    backgroundColor: "{colors.primary}"
    textColor: "{colors.on-primary}"
    typography: "{typography.body-md}"
    rounded: "{rounded.full}"
    padding: 16px
    height: 62px
  button-primary-hover:
    backgroundColor: "{colors.success-deep}"
    textColor: "{colors.on-primary}"
  button-secondary:
    backgroundColor: "{colors.neutral}"
    textColor: "{colors.primary}"
    typography: "{typography.body-sm}"
    rounded: "{rounded.full}"
    padding: 12px
    height: 44px
  badge-accent:
    backgroundColor: "{colors.tertiary}"
    textColor: "{colors.on-tertiary}"
    typography: "{typography.label-caps}"
    rounded: "{rounded.full}"
    padding: 8px
  card-default:
    backgroundColor: "#FFFFFF"
    textColor: "{colors.on-neutral}"
    rounded: "{rounded.md}"
    padding: 24px
  card-hero-dark:
    backgroundColor: "{colors.primary}"
    textColor: "{colors.on-primary}"
    rounded: "{rounded.lg}"
    padding: 32px
  card-soft:
    backgroundColor: "{colors.surface-soft}"
    textColor: "{colors.text-body}"
    rounded: "{rounded.md}"
    padding: 24px
---

## Overview

UntilFire should feel like a calm financial guide, not a loud fintech dashboard or a cold spreadsheet. The product promise is emotional first: personal finance that sets you free. Every screen should help users feel that work can become optional, that their next step is understandable, and that the product is safe to trust with meaningful money decisions.

The visual identity should combine warmth and restraint. Use soft paper backgrounds, deep evergreen for authority, and one clear mint accent for momentum and progress. The product should feel premium, modern, and reassuring, with enough breathing room that important numbers feel meaningful rather than noisy.

For hierarchy and copy, lead with freedom date, work optionality, and the user's next move. Do not let the interface feel like a generic calculator, brokerage console, or optimization toy. Trust is built through clarity, whitespace, legible numbers, and small honest cues rather than flashy effects.

## Colors

- **Primary (#003527):** Deep evergreen. Use for headlines, primary CTAs, dark hero cards, and the highest-trust surfaces.
- **Secondary (#64748B):** Muted slate for metadata, explanatory microcopy, and low-emphasis navigation.
- **Tertiary (#20D4BF):** Mint accent for positive motion, important highlights, and restrained visual energy.
- **Neutral (#FAFDFB):** Main page background. Clean, soft, and slightly warm instead of stark white.
- **Surface Soft (#F6F9F4):** Secondary panel background for gentle separation without feeling heavy.
- **Surface Tint (#ECFDF5):** Positive-tint fill for supportive states, trust cues, and low-pressure highlights.
- **Border (#E2E8F0):** Default card and section outlines.
- **Border Strong (#D1FAE5):** Accent border for trust/support panels and guided action states.
- **Text Body (#19181E):** Main paragraph copy for readability on light surfaces.
- **Success Deep (#065F46):** Hover and confirmation green; use as a darker companion to Primary, not a new brand color.

Color behavior rules:
- The mint accent should stay scarce enough to remain meaningful.
- Prefer tonal layering over multiple saturated colors.
- If trust strips or integration rails are added, keep them grayscale or heavily muted so they support the hero rather than compete with it.
- Avoid introducing bright blue, purple, or neon gradients into core marketing surfaces unless a future brand revision explicitly expands the palette.

## Typography

Use **Manrope** as the primary typeface. The current product language relies on weight, spacing, and scale rather than multiple font families. Display text should feel crisp and ambitious; body text should feel easy, human, and non-technical.

- **H1** is for singular, emotional hero statements such as “Make work optional.” Keep it short and visually dominant.
- **H2** introduces major section ideas and should still feel premium and outcome-led.
- **H3** is for benefit cards, pricing card titles, and compact surface headings.
- **Body Large** is for hero supporting copy and short paragraphs immediately under major statements.
- **Body Medium** is the default text size for product explanation, pricing bullets, and general UI copy.
- **Body Small** is for reassuring microcopy, labels, and compact supporting text.
- **Label Caps** is reserved for subtle metadata such as section labels, pricing tier labels, and small trust markers.

Typography behavior rules:
- Tight tracking on display headlines is part of the brand.
- Prefer concise copy blocks; avoid dense paragraphs.
- Numbers and dates should be given enough size and whitespace to feel like outcomes, not raw data dumps.

## Layout

Use spacious, centered layouts with strong vertical rhythm. Above the fold, the visual sequence should usually be:
1. emotional promise
2. one clear action
3. trust / reassurance
4. product proof

Spacing should feel generous, especially on marketing surfaces. Section breaks should be obvious through whitespace and soft background transitions rather than harsh dividers.

Layout rules:
- Use `section` spacing for major marketing sections.
- Use `xl` or `xxl` spacing between hero headline, supporting text, CTA, and proof.
- Keep reading widths narrow enough that copy stays calm and digestible.
- On mobile, compress spacing carefully without making the product feel crowded.
- If a surface has a single main takeaway, center it and remove side noise.

## Elevation & Depth

Depth should be subtle and trust-building. Use soft shadows mainly for dark hero cards, floating CTAs, and high-value surfaces that need visual anchoring.

Rules:
- Cards on light backgrounds can often rely on borders instead of shadow.
- Primary CTA buttons may carry a stronger shadow to feel actionable, but motion should remain restrained.
- Avoid stacked heavy shadows, glowing effects, or glassmorphism. The product should feel grounded and credible.

## Shapes

Rounded corners should feel modern and approachable, but not playful. Use pill shapes for high-signal interactive elements such as primary buttons and labels. Use medium-to-large radii for cards so surfaces feel soft and safe.

Rules:
- `full` rounding is for CTAs, badges, and small trust chips.
- `md` and `lg` are the default card radii.
- Large containers can use `xl` rounding when they introduce a major section or premium surface.
- Avoid sharp corners on user-facing marketing surfaces unless a surface is explicitly utilitarian.

## Components

- **button-primary** is the single most important action on a screen. It should usually represent the next step toward the user's freedom date.
- **button-secondary** is for supporting actions only and should never visually outrank the primary CTA.
- **badge-accent** is for light guidance and emphasis, not for decorative clutter.
- **card-default** is the main reusable surface for pricing, benefit, and explainer blocks.
- **card-hero-dark** is for outcome proof like the freedom-date preview or similarly high-trust summary surfaces.
- **card-soft** is for guidance, reassurance, and low-pressure educational framing.

Behavior rules:
- Prefer one clear CTA per surface.
- Supporting cards should complement the hero message, not repeat it.
- Pricing and benefits should read as “clear next move” and “ongoing guidance,” not feature soup.
- Trust cues should feel integrated into the layout, not stapled on as growth hacks.

## Do's and Don'ts

- **Do** lead with freedom, work optionality, and the user's path forward.
- **Do** make the first-value experience feel calm, private, and non-pushy.
- **Do** use whitespace and hierarchy to build trust.
- **Do** keep trust signals understated and credible.
- **Do** use real visual assets when requesting logos, icons, or institution marks from AI builders.
- **Do** treat precise tax, city, and account details as trust support, not headline copy.

- **Don't** make UntilFire feel like a generic calculator or brokerage dashboard.
- **Don't** overwhelm the UI with multiple accent colors, busy gradients, or flashy animation.
- **Don't** gate the aha moment behind login, payment, bank connection, feedback, or survey prompts.
- **Don't** use text-name placeholders when the intended design calls for actual logos or marks.
- **Don't** let secondary metrics or features overpower the freedom date and next move.
