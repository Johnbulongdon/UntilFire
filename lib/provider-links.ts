import { linkMatchesDomain } from "./partner-offers.ts";
export type ProviderRow = {
  id: string;
  slug: string;
  kind: "savings" | "bank" | "brokerage";
  name: string;
  blurb: string;
  rate_bps: number | null;
  bonus_text: string | null;
  bonus_ends_on: string | null;
  url: string;
  allowed_domain: string;
  country: string;
  status: string;
  member_links_enabled: boolean;
  updated_at: string;
};
export type MemberLink = {
  id: string;
  partner_id: string;
  offer_id: string;
  url: string;
  display_name: string;
  status: string;
  version: number;
};
export function usableMemberLink(
  offer: ProviderRow,
  link: MemberLink | null,
): link is MemberLink {
  return (
    offer.status === "live" &&
    offer.member_links_enabled &&
    !!link &&
    link.offer_id === offer.id &&
    link.status === "approved" &&
    linkMatchesDomain(link.url, offer.allowed_domain)
  );
}
export function selectedLink(offer: ProviderRow, link: MemberLink | null) {
  if (usableMemberLink(offer, link))
    return {
      url: link.url,
      partnerId: link.partner_id,
      linkId: link.id,
      key: ["member", link.id, link.version, offer.updated_at].join(":"),
      label: link.display_name + "’s referral link",
    };
  return {
    url: offer.url,
    partnerId: null,
    linkId: null,
    key: ["untilfire", offer.id, offer.updated_at].join(":"),
    label: "UntilFire referral link",
  };
}
