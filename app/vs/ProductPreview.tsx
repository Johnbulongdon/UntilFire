import { Badge, Icon, Progress } from "@/components/ui";
import styles from "./Vs.module.css";

/**
 * A still of what UntilFire shows, built from the app's own primitives so it
 * matches the product in both themes. Example numbers, labelled as such;
 * they echo the launch video's example (freedom around 2040, age 45). The
 * next move names an amount, never an account or fund: named allocation
 * suggestions are unresolved and need legal input.
 */
const ACCOUNTS = ["Checking", "Credit card", "Brokerage"];

export default function ProductPreview() {
  return (
    <figure className={styles.preview} aria-label="Example of UntilFire's freedom date and next move">
      <div className={styles.previewTop}>
        <span className={`uf-t-label ${styles.previewEyebrow}`}>Your freedom date</span>
        <Badge tone="muted">Example</Badge>
      </div>
      <div className={styles.previewDate}>March 2040</div>
      <p className={`uf-t-data ${styles.previewMeta}`}>Age 45 &middot; 14 years away</p>

      <Progress value={0.38} label="Progress to freedom" caption="38% of your $1.2M target" />

      <div className={styles.previewMove}>
        <span className={`uf-t-label ${styles.previewEyebrow}`}>This month&apos;s next move</span>
        <p className="uf-t-body" style={{ margin: 0, fontWeight: 700 }}>Invest $300 more this month</p>
        <p className={`uf-t-small ${styles.previewGain}`}>Brings your date 4 months closer</p>
      </div>

      <ul className={styles.previewAccounts}>
        {ACCOUNTS.map((a) => (
          <li key={a} className="uf-t-small">
            <span className={styles.yes}><Icon name="positive" size={16} strokeWidth={2.4} aria-hidden /></span>
            {a} <span className={styles.previewSynced}>synced today</span>
          </li>
        ))}
      </ul>
    </figure>
  );
}
