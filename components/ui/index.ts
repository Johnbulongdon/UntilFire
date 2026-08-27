/**
 * UntilFire UI primitives.
 *
 *   import { Button, Card, Field, Input, Badge, Stat } from "@/components/ui";
 *
 * Five components cover the vocabulary. If you're about to hand-roll a button,
 * a card, a labelled input, a status pill or a label-figure-delta block, use
 * these instead — that's the whole point of them existing.
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
