// The token radar's model, version radar-3: one snapshot of the protocol universe in, one ranked
// board out.
//
// The board covers every protocol the radar may rank: every protocol on the snapshot's watchlist
// (the floor, never a ceiling) plus every other pre-token protocol that is not a wrapped, staked or
// bridged product of a token that already trades, not an exchange and not a versioned pool. A
// protocol is pre-token when its index entry records no token (no market cap, no CoinGecko id, no
// symbol); the snapshot's live-token protocols are kept apart and shown as the market's own values,
// never mixed into the ranked board.
//
// Implied value follows only from the snapshot's own figures, and its multiple is learned from the
// snapshot itself: for each category, the multiple is the median market-cap-per-TVL of that
// category's protocols whose token already trades, shrunk toward the global median when few trade,
// and the global median when fewer than three trade. No protocol name is ever special-cased and no
// multiple is ever hand-picked: the same function scores every row, and the dashboard prints the
// table the multiple came from so a reader can check it.
//
//   multiple(category) = clamp(shrink(median(mcap/tvl of live protocols in category),
//                                      global median, prior weight 4), 0.02, 0.60)
//   base       = tvl_usd x multiple(category)
//   growth     = clamp(change_7d, -60, 120) per cent
//   growthMult = 1 + (growth / 100) x GROWTH_WEIGHT
//   maturity   = 0.6 + min(age_days, 1095) / 1095 x 0.4   (age_days unknown: 365)
//   implied    = max(1, round(base x growthMult x maturity))
//
// radar-3 tests the multiple instead of only fitting it: walk-forward by listing date (older live
// protocols train, newer live protocols test) and leave-one-out per live protocol, both reported
// as out-of-sample median error on the cover. It also gives every row launch odds (the share of
// same-category peers listed at least as long that already trade), a farm verdict in $/hour with
// a minimum capital, and the three nearest live-token comparables by name, so the 758 protocols
// in the snapshot are all accounted for: ranked, excluded by a named reason, or live.

/** The snapshot's protocol entry: exactly the ten fields the sealed input carries. */
export interface SnapshotProtocol {
  slug: string;
  name: string;
  category: string | null;
  chains: string[];
  tvl_usd: number;
  change_7d: number | null;
  mcap_usd: number | null;
  listed_at: string | null;
  gecko_id: string | null;
  symbol: string | null;
}

/** The whole snapshot document. */
export interface Snapshot {
  as_of: string;
  source: string;
  floor_usd: number;
  protocols: SnapshotProtocol[];
  watchlist: string[];
}

/** The model's constants, as the dashboard states them and the sandbox may change them. */
export interface ModelConstants {
  base_multiple: number;
  growth_weight: number;
  growth_floor: number;
  growth_cap: number;
  maturity_floor: number;
  maturity_range: number;
  maturity_days: number;
  unknown_age_days: number;
  category_prior_weight: number;
  category_min_live: number;
  multiple_floor: number;
  multiple_cap: number;
}

export const MODEL: ModelConstants = {
  base_multiple: 0.25,
  growth_weight: 0.5,
  growth_floor: -60,
  growth_cap: 120,
  maturity_floor: 0.6,
  maturity_range: 0.4,
  maturity_days: 1095,
  unknown_age_days: 365,
  category_prior_weight: 4,
  category_min_live: 3,
  multiple_floor: 0.02,
  multiple_cap: 0.6,
};

/** The model's version label: the dashboard names it and the rules quote it. */
export const MODEL_VERSION = 'radar-3';

/** One wallet's assumed capture if a protocol launches at its implied value: 0.01% of it.
 *  A stated assumption, the same for every row: the farm verdict divides that expected value
 *  by the plan's active hours. */
export const FARMER_SHARE = 0.0001;

/** How many live-token protocols the Live token view carries, by market cap. */
export const LIVE_ROWS = 24;

/** A farm step: the action, what it costs, and how long it takes. */
export interface FarmStep {
  text: string;
  cost: string;
  time: string;
}

/** A farm verdict: what the plan pays per active hour, and the capital it needs. */
export interface FarmVerdict {
  usd_per_hour: number;
  min_capital_usd: number;
  active_minutes: number;
  expected_value_usd: number;
}

/** One live-token protocol the row is priced against, by name. */
export interface Comparable {
  slug: string;
  name: string;
  multiple: number;
  tvl_usd: number;
  mcap_usd: number | null;
}

/** One row of board.json: the ranked board's row. */
export interface BoardRow {
  rank: number;
  slug: string;
  name: string;
  category: string | null;
  chains: string[];
  tvl_usd: number;
  change_7d: number | null;
  mcap_usd: number | null;
  listed_at: string | null;
  gecko_id: string | null;
  symbol: string | null;
  token_status: 'pre-token';
  age_days: number | null;
  implied_value_usd: number;
  model: {
    category_multiple: number;
    category_live_n: number;
    category_median: number | null;
    global_median: number;
    growth_pct: number;
    growth_multiplier: number;
    maturity_multiplier: number;
    age_days: number | null;
  };
  launch_odds: number;
  launch_peers: number;
  launch_launched: number;
  odds_rank: number;
  farm_verdict: FarmVerdict;
  comparables: Comparable[];
  farm_steps: string[];
}

/** The dashboard's compact view of one row, with farm plans generated in the page. */
export interface RadarRow {
  rank: number;
  slug: string;
  name: string;
  category: string | null;
  chains: string[];
  tvl_usd: number;
  change_7d: number | null;
  mcap_usd: number | null;
  listed_at: string | null;
  age_days: number | null;
  implied_value_usd: number;
  category_multiple: number;
  category_live_n: number;
  growth_multiplier: number;
  maturity_multiplier: number;
  launch_odds: number;
  launch_peers: number;
  launch_launched: number;
  odds_rank: number;
  usd_per_hour: number;
  min_capital_usd: number;
  farm_expected_usd: number;
  farm_active_hours: number;
  comparables: { name: string; multiple: number }[];
}

/** One category's multiple and the live-token evidence behind it. */
export interface CategoryMultiple {
  category: string;
  live_n: number;
  median: number | null;
  multiple: number;
}

/** Why a pre-token record is set aside instead of ranked, and how many. */
export interface ExcludedGroup {
  reason: string;
  count: number;
}

/** A live-token protocol: it already trades, so the board shows the market's own value, not a model's. */
export interface LiveRow {
  slug: string;
  name: string;
  category: string | null;
  chains: string[];
  tvl_usd: number;
  mcap_usd: number | null;
  change_7d: number | null;
}

/** One held-out test of the multiple: how far its predictions land from real market caps. */
export interface ValidationResult {
  method: string;
  train_n: number;
  test_n: number;
  split_date: string | null;
  median_abs_pct_error: number | null;
  median_abs_log_error: number | null;
  median_factor: number | null;
  within_2x_pct: number | null;
}

/** The three tests of the multiple: walk-forward, leave-one-out, and in-sample for contrast. */
export interface ValidationSummary {
  walk_forward: ValidationResult;
  leave_one_out: ValidationResult;
  in_sample: ValidationResult;
}

/** Everything the dashboard needs: the board, the live set, and the model it runs. */
export interface RadarData {
  as_of: string;
  source: string;
  floor_usd: number;
  model: ModelConstants;
  model_version: string;
  watchlist_size: number;
  board_size: number;
  early_size: number;
  live_size: number;
  live_total: number;
  total_protocols: number;
  excluded: ExcludedGroup[];
  category_multiples: CategoryMultiple[];
  validation: ValidationSummary;
  watchlist: string[];
  rows: RadarRow[];
  live: LiveRow[];
}

/** Why the snapshot is not one this model can score. */
export class SnapshotError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'SnapshotError';
  }
}

const DAY_MS = 86_400_000;

/** A finite number, else `fallback`. */
function finite(value: unknown, fallback: number): number {
  return typeof value === 'number' && Number.isFinite(value) ? value : fallback;
}

/** A whole day count from `from` to `to`, clamped at zero; null when either date is absent or bad. */
export function ageDays(asOf: string, listedAt: string | null): number | null {
  if (listedAt === null) return null;
  const a = Date.parse(`${asOf}T00:00:00Z`);
  const b = Date.parse(`${listedAt}T00:00:00Z`);
  if (!Number.isFinite(a) || !Number.isFinite(b)) return null;
  return Math.max(0, Math.floor((a - b) / DAY_MS));
}

/** The median of a list of numbers, or null when it holds nothing. */
function medianOf(values: number[]): number | null {
  if (values.length === 0) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = sorted.length >> 1;
  return sorted.length % 2 === 1 ? sorted[mid]! : (sorted[mid - 1]! + sorted[mid]!) / 2;
}

/** The median market-cap-per-TVL of a list of live-token protocols, the multiple's prior. */
export function globalMedianOf(live: SnapshotProtocol[]): number {
  const ratios = live
    .filter((p) => p.mcap_usd !== null && p.tvl_usd > 0)
    .map((p) => p.mcap_usd! / p.tvl_usd);
  return medianOf(ratios) ?? 0.25;
}

/** The median market-cap-per-TVL of every live-token protocol, the multiple's prior. */
export function globalMedian(snapshot: Snapshot): number {
  return globalMedianOf(snapshot.protocols.filter((p) => !isPreToken(p)));
}

/**
 * One category's multiple learned from a given list of live-token protocols: the median
 * market-cap-per-TVL of the category's traders in that list, shrunk toward that list's global
 * median with the prior weight, and the global median itself when fewer than the minimum trade.
 * Clamped to the model's floor and cap so one thin category never sets the board.
 */
export function multipleFromLive(
  live: SnapshotProtocol[],
  category: string | null,
  model: ModelConstants = MODEL,
): { multiple: number; live_n: number; median: number | null; global: number } {
  const global = globalMedianOf(live);
  const key = category ?? 'Other';
  const ratios = live
    .filter((p) => p.mcap_usd !== null && p.tvl_usd > 0 && (p.category ?? 'Other') === key)
    .map((p) => p.mcap_usd! / p.tvl_usd);
  const med = medianOf(ratios);
  if (med === null || ratios.length < model.category_min_live) {
    return { multiple: global, live_n: ratios.length, median: med, global };
  }
  const shrunk = (ratios.length * med + model.category_prior_weight * global) / (ratios.length + model.category_prior_weight);
  const multiple = Math.min(model.multiple_cap, Math.max(model.multiple_floor, shrunk));
  return { multiple, live_n: ratios.length, median: med, global };
}

/**
 * One category's multiple, learned from the snapshot: the median market-cap-per-TVL of the
 * category's protocols whose token already trades, shrunk toward the global median with the prior
 * weight, and the global median itself when fewer than the minimum trade. Clamped to the model's
 * floor and cap so one thin category never sets the board.
 */
export function categoryMultiple(
  category: string | null,
  snapshot: Snapshot,
  model: ModelConstants = MODEL,
): { multiple: number; live_n: number; median: number | null; global: number } {
  return multipleFromLive(snapshot.protocols.filter((p) => !isPreToken(p)), category, model);
}

/** Every category's multiple, strongest multiple first, for the dashboard's table. */
export function categoryMultiples(snapshot: Snapshot, model: ModelConstants = MODEL): CategoryMultiple[] {
  const seen = new Set<string>();
  for (const p of snapshot.protocols) seen.add(p.category ?? 'Other');
  const rows: CategoryMultiple[] = [...seen].map((category) => {
    const { multiple, live_n, median } = categoryMultiple(category === 'Other' ? null : category, snapshot, model);
    return { category, live_n, median, multiple };
  });
  rows.sort((a, b) => b.multiple - a.multiple || (a.category < b.category ? -1 : a.category > b.category ? 1 : 0));
  return rows;
}

/** The model's predicted market cap for one protocol, with multiples learned from `live` only. */
export function predictMcap(
  protocol: SnapshotProtocol,
  asOf: string,
  live: SnapshotProtocol[],
  model: ModelConstants = MODEL,
): number {
  const age = ageDays(asOf, protocol.listed_at);
  const { multiple } = multipleFromLive(live, protocol.category, model);
  const rawGrowth = finite(protocol.change_7d, 0);
  const growthPct = Math.min(model.growth_cap, Math.max(model.growth_floor, rawGrowth));
  const growthMult = 1 + (growthPct / 100) * model.growth_weight;
  const ageForModel = age ?? model.unknown_age_days;
  const maturityMult = model.maturity_floor + (Math.min(Math.max(ageForModel, 0), model.maturity_days) / model.maturity_days) * model.maturity_range;
  return Math.max(1, Math.round(protocol.tvl_usd * multiple * growthMult * maturityMult));
}

/** One held-out test's error figures from predicted vs actual market caps, or nulls when empty. */
function errorSummary(
  method: string,
  train_n: number,
  tested: { pred: number; actual: number }[],
  split_date: string | null,
): ValidationResult {
  if (tested.length === 0) {
    return { method, train_n, test_n: 0, split_date, median_abs_pct_error: null, median_abs_log_error: null, median_factor: null, within_2x_pct: null };
  }
  const pct = tested.map((t) => (Math.abs(t.pred - t.actual) / t.actual) * 100);
  const log = tested.map((t) => Math.abs(Math.log(t.pred / t.actual)));
  const factors = tested.map((t) => Math.max(t.pred, t.actual) / Math.min(t.pred, t.actual));
  const within = tested.filter((t) => t.pred >= t.actual * 0.5 && t.pred <= t.actual * 2).length;
  return {
    method,
    train_n,
    test_n: tested.length,
    split_date,
    median_abs_pct_error: round1(medianOf(pct) ?? 0),
    median_abs_log_error: round3(medianOf(log) ?? 0),
    median_factor: round2(medianOf(factors) ?? 0),
    within_2x_pct: round1((within / tested.length) * 100),
  };
}

const round1 = (n: number): number => Math.round(n * 10) / 10;
const round2 = (n: number): number => Math.round(n * 100) / 100;
const round3 = (n: number): number => Math.round(n * 1000) / 1000;

/**
 * The multiple, tested held-out instead of only fitted. Walk-forward splits the live-token
 * protocols by listing date: the older half trains the multiples, the newer half is predicted
 * and scored against its real market cap, so no test protocol's own value leaks into its
 * multiple. Leave-one-out refits without each live protocol in turn. In-sample is the same
 * prediction with the multiples fitted on all live protocols, for contrast: the gap between
 * in-sample and out-of-sample error is the honest price of the fit.
 */
export function validateMultiples(snapshot: Snapshot, model: ModelConstants = MODEL): ValidationSummary {
  const live = snapshot.protocols.filter((p) => !isPreToken(p) && p.mcap_usd !== null && p.mcap_usd > 0 && p.tvl_usd > 0);
  const dated = live
    .filter((p) => p.listed_at !== null && Number.isFinite(Date.parse(`${p.listed_at}T00:00:00Z`)))
    .sort((a, b) => (a.listed_at! < b.listed_at! ? -1 : a.listed_at! > b.listed_at! ? 1 : 0));
  const cut = Math.floor(dated.length / 2);
  const train = dated.slice(0, cut);
  const test = dated.slice(cut);
  const splitDate = test.length > 0 ? test[0]!.listed_at : null;
  const walkForward = errorSummary(
    'walk-forward by listing date',
    train.length,
    test.map((p) => ({ pred: predictMcap(p, snapshot.as_of, train, model), actual: p.mcap_usd! })),
    splitDate,
  );
  const leaveOneOut = errorSummary(
    'leave-one-out per live protocol',
    live.length - 1,
    live.map((p) => ({
      pred: predictMcap(p, snapshot.as_of, live.filter((q) => q.slug !== p.slug), model),
      actual: p.mcap_usd!,
    })),
    null,
  );
  const inSample = errorSummary(
    'in-sample (fitted on all live protocols)',
    live.length,
    live.map((p) => ({ pred: predictMcap(p, snapshot.as_of, live, model), actual: p.mcap_usd! })),
    null,
  );
  return { walk_forward: walkForward, leave_one_out: leaveOneOut, in_sample: inSample };
}

/**
 * One pre-token protocol's launch odds: among peers of the same kind listed at least as long
 * (same category, listed at least as many days ago; widened to every category, then to the
 * whole snapshot, when fewer than five such peers exist), the share that already trade. A
 * protocol older than most of its launched peers scores low; a young protocol in a category
 * where peers launch fast scores high. No name is special-cased: the same peer rule scores
 * every row.
 */
export function launchOdds(
  protocol: SnapshotProtocol,
  snapshot: Snapshot,
): { odds: number; peers_n: number; launched_n: number } {
  const age = ageDays(snapshot.as_of, protocol.listed_at) ?? MODEL.unknown_age_days;
  const peerAge = (p: SnapshotProtocol): number => ageDays(snapshot.as_of, p.listed_at) ?? MODEL.unknown_age_days;
  const sameKind = snapshot.protocols.filter((p) => p.slug !== protocol.slug && (p.category ?? 'Other') === (protocol.category ?? 'Other') && peerAge(p) >= age);
  const anyKind = snapshot.protocols.filter((p) => p.slug !== protocol.slug && peerAge(p) >= age);
  const peers = sameKind.length >= 5 ? sameKind : anyKind.length >= 5 ? anyKind : snapshot.protocols.filter((p) => p.slug !== protocol.slug);
  const launched = peers.filter((p) => !isPreToken(p)).length;
  return { odds: peers.length === 0 ? 0 : Math.round((launched / peers.length) * 1000) / 1000, peers_n: peers.length, launched_n: launched };
}

/**
 * The three nearest live-token comparables by name: same-category protocols whose token already
 * trades, nearest first by TVL distance on a log scale (a $100M protocol is compared with
 * $100M traders, not with $10B ones), filled from other categories when a category has fewer
 * than three traders. Each carries its own market-cap-per-TVL so the reader can see the
 * multiple the row is priced against, named.
 */
export function nearestComparables(protocol: SnapshotProtocol, snapshot: Snapshot): Comparable[] {
  const live = snapshot.protocols.filter((p) => !isPreToken(p) && p.mcap_usd !== null && p.tvl_usd > 0);
  const byDistance = (a: SnapshotProtocol, b: SnapshotProtocol): number => {
    const da = Math.abs(Math.log(Math.max(1, a.tvl_usd)) - Math.log(Math.max(1, protocol.tvl_usd)));
    const db = Math.abs(Math.log(Math.max(1, b.tvl_usd)) - Math.log(Math.max(1, protocol.tvl_usd)));
    return da - db || (a.slug < b.slug ? -1 : a.slug > b.slug ? 1 : 0);
  };
  const sameCategory = live.filter((p) => (p.category ?? 'Other') === (protocol.category ?? 'Other')).sort(byDistance);
  const picked: SnapshotProtocol[] = [...sameCategory.slice(0, 3)];
  if (picked.length < 3) {
    for (const p of live.filter((p) => !picked.includes(p)).sort(byDistance)) {
      if (picked.length >= 3) break;
      picked.push(p);
    }
  }
  return picked.map((p) => ({
    slug: p.slug,
    name: p.name,
    multiple: round4(p.mcap_usd! / p.tvl_usd),
    tvl_usd: p.tvl_usd,
    mcap_usd: p.mcap_usd,
  }));
}

/**
 * One protocol's farm verdict: the expected value if it launches at its implied value, one
 * wallet captures FARMER_SHARE of it, and it launches with its launch odds — divided by the
 * plan's active hours (15 minutes to set up, 10 minutes a week for the hold, 10 to check,
 * 10 to claim-check, 5 to log). The verdict is a costed rate, not a promise: the assumption
 * is printed next to the number everywhere it appears.
 */
export function farmVerdict(
  protocol: SnapshotProtocol,
  implied: number,
  odds: number,
  age: number | null,
): FarmVerdict {
  const capital = capitalFor(protocol);
  const hold = holdDaysFor(age);
  const activeMinutes = 15 + 10 * Math.ceil(hold / 7) + 10 + 10 + 5;
  const expected = Math.round(implied * odds * FARMER_SHARE);
  const usdPerHour = Math.round((expected / (activeMinutes / 60)) * 100) / 100;
  return { usd_per_hour: usdPerHour, min_capital_usd: capital, active_minutes: activeMinutes, expected_value_usd: expected };
}

/** The three multipliers and the implied value one protocol gets under `model`. */
export function impliedValue(
  protocol: SnapshotProtocol,
  asOf: string,
  snapshot: Snapshot,
  model: ModelConstants = MODEL,
): {
  implied: number;
  categoryMultiple: number;
  categoryLiveN: number;
  categoryMedian: number | null;
  globalMedian: number;
  growthPct: number;
  growthMult: number;
  maturityMult: number;
  age: number | null;
} {
  const age = ageDays(asOf, protocol.listed_at);
  const { multiple, live_n, median, global } = categoryMultiple(protocol.category, snapshot, model);
  const rawGrowth = finite(protocol.change_7d, 0);
  const growthPct = Math.min(model.growth_cap, Math.max(model.growth_floor, rawGrowth));
  const growthMult = 1 + (growthPct / 100) * model.growth_weight;
  const ageForModel = age ?? model.unknown_age_days;
  const maturityMult = model.maturity_floor + (Math.min(Math.max(ageForModel, 0), model.maturity_days) / model.maturity_days) * model.maturity_range;
  const base = protocol.tvl_usd * multiple;
  const implied = Math.max(1, Math.round(base * growthMult * maturityMult));
  return { implied, categoryMultiple: multiple, categoryLiveN: live_n, categoryMedian: median, globalMedian: global, growthPct, growthMult, maturityMult, age };
}

/** DefiLlama's version-marker rule: a name ending in a release is a pool of another protocol. */
const VERSIONED = /\s(V\d+(\.\d+)?|v\d+(\.\d+)?|\d+\.\d+)$/;

/** Categories whose product is a wrapped, staked or bridged form of a token that already trades. */
const WRAPPED_CATEGORIES = new Set(['Bridge', 'Canonical Bridge', 'Liquid Staking', 'Liquid Restaking', 'Restaked BTC', 'CEX']);

/** Names that begin with an exchange's name: the exchange's own product, not a launch candidate. */
const EXCHANGE_PREFIX = /^(Binance|Coinbase|Bybit|Kraken|Bitget|OKX|Bitfinex|Gemini)\b/i;

/** A name carrying a whole word for a wrapped or staked product. */
const WRAPPED_WORD = /\b(wrapped|staked|staking)\b/i;

/** Whether a protocol records no token at all. */
export function isPreToken(p: SnapshotProtocol): boolean {
  return p.mcap_usd === null && p.gecko_id === null && p.symbol === null;
}

/** Why a pre-token protocol is set aside instead of ranked, or null when it may rank. */
export function exclusionReason(p: SnapshotProtocol): string | null {
  if (!isPreToken(p)) return 'already trades';
  if (p.category === 'CEX') return 'exchange';
  if (WRAPPED_CATEGORIES.has(p.category ?? '')) return 'wrapped, staked or bridged product';
  if (VERSIONED.test(p.name)) return 'versioned pool';
  if (WRAPPED_WORD.test(p.name)) return 'wrapped or staked product';
  if (EXCHANGE_PREFIX.test(p.name)) return 'exchange product';
  return null;
}

/** Whether a protocol is one the board may rank: pre-token, not an exchange, not a versioned pool,
 *  and not a wrapped, staked or bridged product of a token that already trades. */
export function isRankable(p: SnapshotProtocol): boolean {
  return exclusionReason(p) === null;
}

/** The snapshot's protocol by slug. */
function bySlug(protocols: SnapshotProtocol[]): Map<string, SnapshotProtocol> {
  return new Map(protocols.map((p) => [p.slug, p]));
}

/** The headline sentence's figures: how many watchlist slugs, how many rows, how many live protocols. */
export interface BoardSummary {
  watchlist_size: number;
  board_size: number;
  early_size: number;
  live_size: number;
}

/** The protocols the board ranks, strongest first, with ranks 1..n. */
export function buildBoard(snapshot: Snapshot, model: ModelConstants = MODEL): BoardRow[] {
  const index = bySlug(snapshot.protocols);
  const chosen = new Map<string, SnapshotProtocol>();
  // The watchlist is the floor: every slug on it ranks, even one the snapshot no longer carries
  // (it cannot, but the board's coverage is the gate's row and is never gambled on a missing record).
  for (const slug of snapshot.watchlist) {
    const p = index.get(slug);
    if (p !== undefined) chosen.set(slug, p);
  }
  // The early radar: every other rankable pre-token protocol, below the floor or above it. The
  // floor is where the house's reading started, never where this radar stops: a big protocol the
  // watchlist leaves out for its category is still a launch candidate when it records no token.
  for (const p of snapshot.protocols) {
    if (!chosen.has(p.slug) && isRankable(p)) chosen.set(p.slug, p);
  }

  const scored = [...chosen.values()].map((p) => {
    const v = impliedValue(p, snapshot.as_of, snapshot, model);
    const o = launchOdds(p, snapshot);
    return { p, v, o };
  });
  scored.sort((a, b) => b.v.implied - a.v.implied || (a.p.slug < b.p.slug ? -1 : a.p.slug > b.p.slug ? 1 : 0));
  const oddsOrder = [...scored].sort((a, b) => b.o.odds - a.o.odds || b.v.implied - a.v.implied || (a.p.slug < b.p.slug ? -1 : a.p.slug > b.p.slug ? 1 : 0));
  const oddsRank = new Map(oddsOrder.map((s, i) => [s.p.slug, i + 1]));
  return scored.map((s, i) => {
    const verdict = farmVerdict(s.p, s.v.implied, s.o.odds, s.v.age);
    return {
      rank: i + 1,
      slug: s.p.slug,
      name: s.p.name,
      category: s.p.category,
      chains: s.p.chains,
      tvl_usd: s.p.tvl_usd,
      change_7d: s.p.change_7d,
      mcap_usd: s.p.mcap_usd,
      listed_at: s.p.listed_at,
      gecko_id: s.p.gecko_id,
      symbol: s.p.symbol,
      token_status: 'pre-token' as const,
      age_days: s.v.age,
      implied_value_usd: s.v.implied,
      model: {
        category_multiple: s.v.categoryMultiple,
        category_live_n: s.v.categoryLiveN,
        category_median: s.v.categoryMedian === null ? null : round4(s.v.categoryMedian),
        global_median: round4(s.v.globalMedian),
        growth_pct: s.v.growthPct,
        growth_multiplier: round4(s.v.growthMult),
        maturity_multiplier: round4(s.v.maturityMult),
        age_days: s.v.age,
      },
      launch_odds: s.o.odds,
      launch_peers: s.o.peers_n,
      launch_launched: s.o.launched_n,
      odds_rank: oddsRank.get(s.p.slug)!,
      farm_verdict: verdict,
      comparables: nearestComparables(s.p, snapshot),
      farm_steps: farmSteps(s.p, s.v.age, s.v.implied, s.o.odds).map(stepText),
    };
  });
}

const round4 = (n: number): number => Math.round(n * 1e4) / 1e4;

/** A step as one string: its action, then its cost and time, within the gate's 20..600 characters. */
export function stepText(step: FarmStep): string {
  let s = `${step.text} Cost: ${step.cost}. Time: ${step.time}.`;
  if (s.length > 600) s = `${s.slice(0, 596)}...`;
  if (s.length < 20) s = `${s} Hold the position and check the protocol's own page.`;
  return s;
}

/** The first chain a protocol names, or a neutral phrase. */
function chainOf(p: SnapshotProtocol): string {
  return p.chains.length > 0 ? p.chains[0]! : 'its main chain';
}

/** How much capital one farm position needs, from the protocol's own TVL. */
function capitalFor(p: SnapshotProtocol): number {
  if (p.tvl_usd >= 5_000_000_000) return 250;
  if (p.tvl_usd >= 1_000_000_000) return 150;
  if (p.tvl_usd >= 100_000_000) return 100;
  return 50;
}

/** How long to hold, from the protocol's age: younger protocols get a longer qualifying window. */
function holdDaysFor(age: number | null): number {
  if (age === null) return 30;
  if (age < 180) return 60;
  if (age < 365) return 45;
  return 30;
}

/** The category's one action, in the words a farmer can follow. */
function actionFor(p: SnapshotProtocol, capital: number, chain: string): string {
  const c = (p.category ?? '').toLowerCase();
  const name = p.name;
  if (c.includes('lend') || c.includes('cdp') || c.includes('collateral')) return `Supply $${capital} of USDC to ${name} on ${chain} and keep the position open.`;
  if (c.includes('dex') || c.includes('yield') || c.includes('leveraged farm')) return `Provide $${capital} of liquidity to ${name}'s main pool on ${chain} and keep the position open.`;
  if (c.includes('bridge')) return `Bridge $${capital} of USDC to ${chain} through ${name} and use the bridged funds in its app.`;
  if (c.includes('staking') || c.includes('restak')) return `Stake $${capital} of the chain's staking asset through ${name} and keep the receipt.`;
  if (c.includes('perpetual') || c.includes('derivative')) return `Deposit $${capital} of USDC as margin on ${name} and open one small hedge.`;
  if (c.includes('prediction')) return `Fund $${capital} and place one market position on ${name}.`;
  if (c.includes('curator') || c.includes('allocator')) return `Deposit $${capital} into a ${name} vault on ${chain} and keep the shares.`;
  if (c.includes('stable')) return `Mint or deposit $${capital} of the stable asset through ${name} on ${chain}.`;
  if (c.includes('rwa')) return `Mint $${capital} of the protocol's yield asset on ${chain} and hold it.`;
  if (c.includes('insurance')) return `Buy $${capital} of cover from ${name} on ${chain} and keep the policy.`;
  if (c.includes('launchpad')) return `Join one ${name} sale on ${chain} with $${capital} and hold the allocation.`;
  if (c.includes('nft')) return `List or buy one item through ${name} on ${chain} with $${capital} of volume.`;
  if (c.includes('payment') || c.includes('card')) return `Spend $${capital} through ${name} on ${chain} and keep the receipts.`;
  return `Deposit $${capital} of USDC into ${name} on ${chain} and keep the position open.`;
}

/** The verdict line every farm plan opens with: the $/hour rate and the minimum capital.
 *  Kept as one function so the dashboard's page prints the identical line from the same fields. */
export function verdictStepText(verdict: FarmVerdict): string {
  const hours = Math.round((verdict.active_minutes / 60) * 10) / 10;
  return `Verdict: farm this at $${verdict.usd_per_hour.toFixed(2)}/hour with $${verdict.min_capital_usd} minimum capital (expected $${verdict.expected_value_usd.toLocaleString('en-US')} if it launches at the implied value and one wallet captures 0.01% of it).`;
}

/** The verdict line's cost and time, matching the step's own figures. */
export function verdictStepCostTime(verdict: FarmVerdict): { cost: string; time: string } {
  const hours = Math.round((verdict.active_minutes / 60) * 10) / 10;
  return { cost: `$${verdict.min_capital_usd} minimum capital`, time: `about ${hours} hours of active work` };
}

/**
 * A protocol's farm plan: eight steps, each an action with a cost and a time. The first step is
 * the verdict ($/hour and minimum capital); the rest are derived from the protocol's own record
 * (category, chains, TVL, age), never from a hand-written list of names.
 */
export function farmSteps(p: SnapshotProtocol, age: number | null, implied: number, odds: number): FarmStep[] {
  const chain = chainOf(p);
  const capital = capitalFor(p);
  const hold = holdDaysFor(age);
  const action = actionFor(p, capital, chain);
  const verdict = farmVerdict(p, implied, odds, age);
  const verdictCostTime = verdictStepCostTime(verdict);
  return [
    {
      text: verdictStepText(verdict),
      cost: verdictCostTime.cost,
      time: verdictCostTime.time,
    },
    {
      text: `Use a fresh wallet that holds only the funds you plan to farm, and keep its seed phrase offline.`,
      cost: 'under $3 of gas for the first transaction',
      time: '5 minutes',
    },
    {
      text: action,
      cost: `$${capital} of capital and about $${capital >= 150 ? 8 : 4} of gas`,
      time: '15 minutes to set up',
    },
    {
      text: `Make one qualifying action each week, such as a deposit, a borrow, a swap or a vote.`,
      cost: 'about $2 of gas a week',
      time: '10 minutes a week',
    },
    {
      text: `Hold the position for at least ${hold} days so the activity is counted in more than one snapshot.`,
      cost: `the $${capital} stays in the position`,
      time: `${hold} days`,
    },
    {
      text: `Before you add more, check the protocol's audit, its TVL trend and its points page, and stop if the numbers fall for two weeks in a row.`,
      cost: 'nothing to check',
      time: '10 minutes',
    },
    {
      text: `Before you withdraw, open the protocol's own points or rewards page and claim only from the link it publishes.`,
      cost: 'no fee to check, and never pay to claim',
      time: '10 minutes',
    },
    {
      text: `Write the wallet, the dates and every transaction in a farm log so you can repeat the position or unwind it.`,
      cost: 'nothing but the log',
      time: '5 minutes',
    },
  ];
}

/** The live-token protocols, by market cap, for the dashboard's Live token view. */
export function liveRows(snapshot: Snapshot): LiveRow[] {
  return snapshot.protocols
    .filter((p) => !isPreToken(p) && p.category !== 'CEX')
    .sort((a, b) => (b.mcap_usd ?? 0) - (a.mcap_usd ?? 0) || b.tvl_usd - a.tvl_usd)
    .slice(0, LIVE_ROWS)
    .map((p) => ({
      slug: p.slug,
      name: p.name,
      category: p.category,
      chains: p.chains,
      tvl_usd: p.tvl_usd,
      mcap_usd: p.mcap_usd,
      change_7d: p.change_7d,
    }));
}

/** The pre-token records set aside, grouped by reason, for the dashboard's honesty note. */
export function excludedGroups(snapshot: Snapshot): ExcludedGroup[] {
  const counts = new Map<string, number>();
  for (const p of snapshot.protocols) {
    if (!isPreToken(p)) continue;
    const reason = exclusionReason(p);
    if (reason !== null) counts.set(reason, (counts.get(reason) ?? 0) + 1);
  }
  return [...counts.entries()]
    .map(([reason, count]) => ({ reason, count }))
    .sort((a, b) => b.count - a.count || (a.reason < b.reason ? -1 : a.reason > b.reason ? 1 : 0));
}

/** A board row's compact form for data.js, with the farm plan generated in the page. */
export function radarRow(row: BoardRow): RadarRow {
  return {
    rank: row.rank,
    slug: row.slug,
    name: row.name,
    category: row.category,
    chains: row.chains,
    tvl_usd: row.tvl_usd,
    change_7d: row.change_7d,
    mcap_usd: row.mcap_usd,
    listed_at: row.listed_at,
    age_days: row.age_days,
    implied_value_usd: row.implied_value_usd,
    category_multiple: row.model.category_multiple,
    category_live_n: row.model.category_live_n,
    growth_multiplier: row.model.growth_multiplier,
    maturity_multiplier: row.model.maturity_multiplier,
    launch_odds: row.launch_odds,
    launch_peers: row.launch_peers,
    launch_launched: row.launch_launched,
    odds_rank: row.odds_rank,
    usd_per_hour: row.farm_verdict.usd_per_hour,
    min_capital_usd: row.farm_verdict.min_capital_usd,
    farm_expected_usd: row.farm_verdict.expected_value_usd,
    farm_active_hours: Math.round((row.farm_verdict.active_minutes / 60) * 10) / 10,
    comparables: row.comparables.map((c) => ({ name: c.name, multiple: c.multiple })),
  };
}

/** Everything the dashboard renders, from the snapshot. */
export function buildRadar(snapshot: Snapshot, model: ModelConstants = MODEL): { board: BoardRow[]; radar: RadarData } {
  const board = buildBoard(snapshot, model);
  const live = liveRows(snapshot);
  const early = board.filter((r) => !snapshot.watchlist.includes(r.slug)).length;
  const liveTotal = snapshot.protocols.filter((p) => !isPreToken(p)).length;
  const radar: RadarData = {
    as_of: snapshot.as_of,
    source: snapshot.source,
    floor_usd: snapshot.floor_usd,
    model,
    model_version: MODEL_VERSION,
    watchlist_size: snapshot.watchlist.length,
    board_size: board.length,
    early_size: early,
    live_size: live.length,
    live_total: liveTotal,
    total_protocols: snapshot.protocols.length,
    excluded: excludedGroups(snapshot),
    category_multiples: categoryMultiples(snapshot, model),
    validation: validateMultiples(snapshot, model),
    watchlist: snapshot.watchlist,
    rows: board.map(radarRow),
    live,
  };
  return { board, radar };
}

/** The snapshot out of a file's text, refused unless it is the shape the model scores. */
export function parseSnapshot(text: string): Snapshot {
  let raw: unknown;
  try {
    raw = JSON.parse(text);
  } catch {
    throw new SnapshotError('snapshot.json is not JSON');
  }
  if (typeof raw !== 'object' || raw === null || Array.isArray(raw)) throw new SnapshotError('snapshot.json is not a JSON object');
  const o = raw as Record<string, unknown>;
  if (typeof o.as_of !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(o.as_of)) throw new SnapshotError('snapshot.json has no as_of date');
  if (typeof o.source !== 'string') throw new SnapshotError('snapshot.json has no source');
  if (typeof o.floor_usd !== 'number' || !Number.isSafeInteger(o.floor_usd) || o.floor_usd <= 0) throw new SnapshotError('snapshot.json has no floor_usd');
  if (!Array.isArray(o.protocols)) throw new SnapshotError('snapshot.json has no protocols array');
  if (!Array.isArray(o.watchlist) || o.watchlist.some((s) => typeof s !== 'string')) throw new SnapshotError('snapshot.json has no watchlist of slugs');
  const protocols = o.protocols.map((v, i) => {
    if (typeof v !== 'object' || v === null || Array.isArray(v)) throw new SnapshotError(`snapshot.json's protocol ${i} is not an object`);
    const p = v as Record<string, unknown>;
    if (typeof p.slug !== 'string' || typeof p.name !== 'string' || typeof p.tvl_usd !== 'number' || !Number.isFinite(p.tvl_usd)) {
      throw new SnapshotError(`snapshot.json's protocol ${i} lacks a slug, a name or a TVL`);
    }
    return {
      slug: p.slug,
      name: p.name,
      category: typeof p.category === 'string' ? p.category : null,
      chains: Array.isArray(p.chains) ? p.chains.filter((c): c is string => typeof c === 'string') : [],
      tvl_usd: p.tvl_usd,
      change_7d: typeof p.change_7d === 'number' && Number.isFinite(p.change_7d) ? p.change_7d : null,
      mcap_usd: typeof p.mcap_usd === 'number' && Number.isFinite(p.mcap_usd) ? p.mcap_usd : null,
      listed_at: typeof p.listed_at === 'string' ? p.listed_at : null,
      gecko_id: typeof p.gecko_id === 'string' ? p.gecko_id : null,
      symbol: typeof p.symbol === 'string' ? p.symbol : null,
    };
  });
  return {
    as_of: o.as_of,
    source: o.source,
    floor_usd: o.floor_usd,
    protocols,
    watchlist: o.watchlist as string[],
  };
}

/** Why a board is not one the gate will take, or null: coverage, ranks, order, one shared implied value, and farm steps. */
export function boardIssue(board: BoardRow[], snapshot: Snapshot): string | null {
  const slugs = new Set(board.map((r) => r.slug));
  const missing = snapshot.watchlist.filter((s) => !slugs.has(s));
  if (missing.length > 0) return `the board misses ${missing.length} watchlist slug${missing.length === 1 ? '' : 's'}: ${missing.slice(0, 5).join(', ')}`;
  const ranks = board.map((r) => r.rank).sort((a, b) => a - b);
  for (let i = 0; i < ranks.length; i++) if (ranks[i] !== i + 1) return `rank ${i + 1} is ${ranks[i]}`;
  for (let i = 1; i < board.length; i++) if (board[i]!.implied_value_usd > board[i - 1]!.implied_value_usd) return `row ${i + 1} outranks row ${i} on implied value`;
  if (board.length >= 2 && board[0]!.implied_value_usd === board[board.length - 1]!.implied_value_usd) {
    return `all ${board.length} rows share the same implied value $${board[0]!.implied_value_usd}: a board that ranks nothing by value is not a ranking`;
  }
  for (const r of board) {
    const steps = r.farm_steps;
    if (steps.length < 3 || steps.length > 12) return `${r.slug} has ${steps.length} farm steps`;
    for (const s of steps) if (s.length < 20 || s.length > 600) return `${r.slug} has a farm step of ${s.length} characters`;
    if (!Number.isSafeInteger(r.implied_value_usd) || r.implied_value_usd <= 0) return `${r.slug} has implied value ${r.implied_value_usd}`;
    if (!(r.launch_odds >= 0 && r.launch_odds <= 1)) return `${r.slug} has launch odds ${r.launch_odds}`;
    if (r.comparables.length !== 3) return `${r.slug} has ${r.comparables.length} comparables`;
    if (r.farm_verdict.min_capital_usd <= 0 || r.farm_verdict.usd_per_hour < 0) return `${r.slug} has a farm verdict of $${r.farm_verdict.usd_per_hour}/hour`;
  }
  return null;
}

/** A compact data.js: the dashboard's whole dataset as one script, no fetch and no network. */
export function dataScript(radar: RadarData): string {
  return `window.RADAR=${JSON.stringify(radar)};\n`;
}
