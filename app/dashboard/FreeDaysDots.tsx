import { FREE_DAY_MONTHS } from "@/lib/freedom-progress";

/**
 * One dot per day of a year (D-149): filled for each day the money already
 * pays for, a ring on the next one. The year is twelve small months with
 * seven dots a row, so a row is a week and the filled part reads like a
 * calendar. Styles: `.uf-free-days` in globals.css. `perRow` sets how many
 * months sit side by side when the place is narrower than a Home card.
 */
export default function FreeDaysDots({ days, label, perRow }: { days: number; label: string; perRow?: number }) {
  return (
    <div className="uf-free-days" role="img" aria-label={label} style={perRow ? { gridTemplateColumns: `repeat(${perRow}, minmax(0, 1fr))` } : undefined}>
      {FREE_DAY_MONTHS.map((m) => (
        <span key={m.name}>
          <b className="uf-t-label">{m.name}</b>
          <span>
            {Array.from({ length: m.days }, (_, i) => {
              const day = m.start + i;
              return <i key={day} data-on={day < days ? "" : undefined} data-next={day === days ? "" : undefined} />;
            })}
          </span>
        </span>
      ))}
    </div>
  );
}
