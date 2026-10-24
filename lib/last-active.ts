/**
 * Note that someone opened the app or the dashboard today (profiles.
 * last_active_at, migration 0051). lib/bank-cleanup disconnects a free
 * account's bank after 30 idle days, so this is what keeps a used bank
 * connected. Once a day per open session; a failure only means the stamp
 * waits for the next open.
 */
type ProfilesClient = { from: (table: "profiles") => { update: (v: { last_active_at: string }) => { eq: (col: "user_id", id: string) => PromiseLike<unknown> } } };

let stampedDay = "";

export function stampActive(client: ProfilesClient, userId: string): void {
  const day = new Date().toISOString().slice(0, 10);
  if (stampedDay === `${userId}|${day}`) return;
  stampedDay = `${userId}|${day}`;
  Promise.resolve(client.from("profiles").update({ last_active_at: new Date().toISOString() }).eq("user_id", userId)).catch(() => { stampedDay = ""; });
}
