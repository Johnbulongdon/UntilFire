/**
 * Google Pay payments from Wallet alerts (D-142): reading an alert, and
 * matching it to the bank's copy so it never counts twice.
 *
 * Run: npm run test:wallet-alerts
 */
import assert from "node:assert/strict";
import { pairWalletTwins, parseWalletAlert, sameMerchant } from "../lib/wallet-alerts.ts";

let n = 0;
const ok = (name: string, fn: () => void) => { fn(); n++; console.log(`✓ ${name}`); };

ok("reads Wallet's two-line and one-line payment alerts", () => {
  assert.deepEqual(parseWalletAlert("Blue Bottle Coffee", "$4.50 with Visa ••1234"), { amount: 4.5, currency: null, merchant: "Blue Bottle Coffee" });
  assert.deepEqual(parseWalletAlert("Google Wallet", "$1,204.00 at Best Buy"), { amount: 1204, currency: null, merchant: "Best Buy" });
  assert.deepEqual(parseWalletAlert("Tesco", "£3.20 with Mastercard"), { amount: 3.2, currency: "GBP", merchant: "Tesco" });
  assert.deepEqual(parseWalletAlert("$12 at Shake Shack", ""), { amount: 12, currency: null, merchant: "Shake Shack" });
});

ok("skips alerts that are not a payment by you", () => {
  assert.equal(parseWalletAlert("Payment declined", "$4.50 at Blue Bottle Coffee"), null);
  assert.equal(parseWalletAlert("Refund", "$4.50 from Target"), null);
  assert.equal(parseWalletAlert("Your boarding pass is ready", "Flight UA 12 to SFO"), null);
  assert.equal(parseWalletAlert("Card added", "Visa ••1234 is ready to use"), null);
});

ok("bank names with store numbers and cities match the short name", () => {
  assert.ok(sameMerchant("STARBUCKS STORE #1234 SEATTLE WA", "Starbucks"));
  assert.ok(sameMerchant("Blue Bottle Coffee", "BLUE BOTTLE COFFEE OAKLAND"));
  assert.ok(!sameMerchant("Shell", "Shake Shack"));
  assert.ok(!sameMerchant("Target", "Trader Joe's"));
});

const row = (id: string, date: string, amount: number, description: string, currency = "USD") => ({ id, date, amount, description, currency });

ok("a bank copy 2 days later replaces the Google Pay row; 4 days or another amount does not", () => {
  const gpay = [row("g1", "2026-11-08", 4.5, "Blue Bottle Coffee")];
  assert.equal(pairWalletTwins([row("b1", "2026-11-10", 4.5, "BLUE BOTTLE COFFEE SF")], gpay).length, 1);
  assert.equal(pairWalletTwins([row("b1", "2026-11-12", 4.5, "BLUE BOTTLE COFFEE SF")], gpay).length, 0);
  assert.equal(pairWalletTwins([row("b1", "2026-11-09", 5.5, "BLUE BOTTLE COFFEE SF")], gpay).length, 0);
  assert.equal(pairWalletTwins([row("b1", "2026-11-09", 4.5, "BLUE BOTTLE COFFEE SF", "EUR")], gpay).length, 0);
});

ok("two same-price coffees pair one to one", () => {
  const gpay = [row("g1", "2026-11-08", 4.5, "Blue Bottle Coffee"), row("g2", "2026-11-08", 4.5, "Blue Bottle Coffee")];
  const bank = [row("b1", "2026-11-09", 4.5, "BLUE BOTTLE"), row("b2", "2026-11-09", 4.5, "BLUE BOTTLE"), row("b3", "2026-11-09", 4.5, "BLUE BOTTLE")];
  const pairs = pairWalletTwins(bank, gpay);
  assert.deepEqual(pairs.map((p) => [p.bank.id, p.gpay.id]), [["b1", "g1"], ["b2", "g2"]]);
});

console.log(`\n${n} wallet alert checks passed`);
