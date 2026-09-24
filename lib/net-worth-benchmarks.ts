/**
 * US household net worth by age: cutpoints at 1% … 99%.
 *
 * PLACEHOLDER: no data yet. Generate the real table with
 * scripts/build-net-worth-benchmarks.mjs from the Federal Reserve's 2022
 * Survey of Consumer Finances. Until then every band is empty, so
 * compareNetWorth returns null and no comparison is shown anywhere.
 * test:net-worth-compare fails on purpose until this file is generated.
 */
import type { NetWorthBenchmarks } from './net-worth-compare'

export const NET_WORTH_BENCHMARKS: NetWorthBenchmarks = {
  year: 2022,
  bands: { all: [], under_35: [], '35_44': [], '45_54': [], '55_64': [], '65_74': [], '75_plus': [] },
}
