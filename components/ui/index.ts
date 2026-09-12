/**
 * UntilFire UI primitives.
 *
 *   import { Button, Card, Field, Input, Badge, Stat, Money, Delta, Progress } from "@/components/ui";
 *
 * Five generic components cover the layout vocabulary. If you're about to
 * hand-roll a button, a card, a labelled input, a status pill or a
 * label-figure-delta block, use these instead — that's the whole point of
 * them existing.
 *
 * Three more cover the money vocabulary, which is what makes this a personal
 * finance kit rather than a generic one: Money prints an amount the same way
 * everywhere (there were 39 hand-rolled formatters before it, disagreeing),
 * Delta says whether a change is good news, and Progress is the freedom-date
 * bar — the one place teal belongs.
 *
 * Rules and rationale: docs/design/design-system.md
 */

export { default as Button } from "./Button";
export type { ButtonProps, ButtonVariant, ButtonSize } from "./Button";

export { default as Card } from "./Card";
export type { CardProps, CardElevation } from "./Card";

export { default as Field, Input, Select, inputStyle } from "./Field";
export type { FieldProps, InputProps, SelectProps } from "./Field";

export { default as Badge } from "./Badge";
export type { BadgeProps, BadgeTone } from "./Badge";

export { default as Stat } from "./Stat";
export type { StatProps, StatTone, StatSize } from "./Stat";

export { default as Money } from "./Money";
export type { MoneyProps, MoneyTone } from "./Money";

export { default as Delta } from "./Delta";
export type { DeltaProps, GoodWhen } from "./Delta";

export { default as Progress } from "./Progress";
export type { ProgressProps } from "./Progress";
