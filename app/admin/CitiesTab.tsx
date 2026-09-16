"use client";

import CensusPanel from "./CensusPanel";

/**
 * Cost of living.
 *
 * Three sources were tried and only one survived, so only one is shown. BEA
 * priced by metro area and put Fresno above Austin; HUD had the right
 * granularity but its API key is behind a site unreachable from some networks.
 * Both importers are still in the tree — lib/bea.ts, lib/housing.ts and their
 * routes — and neither is rendered, because a panel you cannot act on is just
 * a question the next person has to re-answer.
 */

export default function CitiesTab({ token }: { token: string }) {
  return <CensusPanel token={token} />;
}
