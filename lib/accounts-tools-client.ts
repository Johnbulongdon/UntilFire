import type { PartnerOffer } from "./partner-offers.ts";
export type ToolOffer = PartnerOffer & {
  country: string;
  referralLabel: string;
  referralKey: string;
};
export type OwnProviderLink = {
  id: string;
  offer_id: string;
  url: string;
  display_name: string;
  status: "pending" | "approved" | "rejected";
  version: number;
  review_note: string | null;
};
export type OwnLinks = {
  code: string | null;
  paused: boolean;
  providers: {
    id: string;
    slug: string;
    name: string;
    allowed_domain: string;
  }[];
  links: OwnProviderLink[];
};
export async function toolsRequest<T>(
  base: string,
  token: string,
  path: string,
  body?: unknown,
  signal?: AbortSignal,
): Promise<T> {
  const response = await fetch(base + path, {
    method: body === undefined ? "GET" : "POST",
    headers: {
      Authorization: "Bearer " + token,
      ...(body === undefined ? {} : { "Content-Type": "application/json" }),
    },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
    signal,
    cache: "no-store",
  });
  const data = await response.json();
  if (!response.ok)
    throw new Error(
      typeof data.error === "string" ? data.error : "Please try again.",
    );
  return data as T;
}
