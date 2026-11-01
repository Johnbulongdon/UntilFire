import type { ToolOffer } from "./accounts-tools-client";
import type { PlanAccountPicker } from "./account-tools-navigation";
type ToolsAPI = <T>(path: string, body?: unknown) => Promise<T>;
/** Browsing is read-only with respect to Plan. Only an explicit Plan picker records setup. */
export async function reserveToolHandoff(api: ToolsAPI, offer: Pick<ToolOffer, "slug" | "name" | "referralKey">, plan?: Pick<PlanAccountPicker, "onStarted">) {
  const data = await api<{ href: string }>("/api/offers/open", { slug: offer.slug, referralKey: offer.referralKey });
  if (!/^\/go\/[a-z0-9-]+\?intent=[a-f0-9-]+$/.test(data.href)) throw new Error("Couldn’t open this provider.");
  if (plan) await plan.onStarted(offer);
  return data.href;
}
