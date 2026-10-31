/** Keep an endless, three-copy review rail inside its identical middle copy. */
export function wrapStoryRailPosition(position: number, width: number): number {
  if (!Number.isFinite(position) || !Number.isFinite(width) || width <= 0)
    return 0;
  return width + ((((position - width) % width) + width) % width);
}

/** Only use a contributor-approved join date; never infer a product endorsement from it. */
export function storyMembershipLabel(
  joinedAt: string | undefined,
  now: Date,
): string | undefined {
  if (
    !joinedAt ||
    !/^\d{4}-\d{2}-\d{2}$/.test(joinedAt) ||
    !Number.isFinite(now.getTime())
  )
    return;
  const joined = new Date(joinedAt + "T00:00:00Z");
  if (
    !Number.isFinite(joined.getTime()) ||
    joined.toISOString().slice(0, 10) !== joinedAt ||
    joined > now
  )
    return;
  let months =
    (now.getUTCFullYear() - joined.getUTCFullYear()) * 12 +
    now.getUTCMonth() -
    joined.getUTCMonth();
  if (now.getUTCDate() < joined.getUTCDate()) months -= 1;
  if (months < 1) return "Joined recently";
  const years = Math.floor(months / 12);
  const remaining = months % 12;
  const parts = [];
  if (years) parts.push(years + (years === 1 ? " year" : " years"));
  if (remaining)
    parts.push(remaining + (remaining === 1 ? " month" : " months"));
  return "Joined " + parts.join(", ") + " ago";
}
