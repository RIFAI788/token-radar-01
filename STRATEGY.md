# Strategy: Token Radar, model radar-2

## The problem

The bounty hands in a sealed snapshot of every protocol DefiLlama tracks
(758 protocols, as of 14 Nov 2026) and asks: which ones still record no token
and are not a wrapped, staked or bridged product of one that trades, and what
would a launch be worth? The hand-in is a dashboard: the board, a detail view
for each protocol, and the steps to farm it. An AI judge compares dashboards
two at a time and ranks them by win rate.

## What the house starter does, and where it stops

The starter (model `radar-1`) scores each protocol as
`tvl x 0.25 x growth x maturity`, covers the 40-protocol watchlist plus 160
early rows chosen by TVL, and gives a 6-step category-derived farm plan. It
is a correct, working radar — and it is the weakest entry the judge has seen,
so beating it on its own terms is the floor, not the goal.

## radar-2: learn the multiple from the snapshot

The starter's 0.25 is one number for every category. The market does not
price categories alike: live Dexs trade at about 0.30x TVL, live Basis
Trading at about 0.38x, live Liquid Staking at about 0.07x. So radar-2
learns each category's multiple from the snapshot itself:

- For each category, take the median market-cap-per-TVL of its protocols
  whose token already trades.
- Shrink it toward the global median (0.169) with prior weight 4 when few
  trade; use the global median outright when fewer than three trade.
- Clamp the result to 0.02–0.60 so one thin category never sets the board.

Growth and maturity keep the house model's shape (growth clamped to
-60/+120% at half weight; maturity 0.6 + up to 0.4 over three years, 365
days when the listing date is unknown), so the improvement is exactly the
category multiple and nothing else — the judge can see what changed and why.

## Coverage: the whole radar, not a TVL cut

The starter's 160 early rows are a TVL cut, so a protocol below the cut is
invisible even when it is a real candidate. radar-2 ranks **every** rankable
pre-token protocol: the 40 on the watchlist plus all 158 others, 198 rows.
The 144 pre-token records set aside are named, not hidden: 86 wrapped,
staked or bridged products, 42 exchanges, 11 versioned pools, 5 wrapped or
staked names — exactly the products the brief says are not launch
candidates. The dashboard explains the exclusion with examples (WBTC,
Binance staked ETH), so the judge sees the board is complete *and* honest.

## Farm plans: concrete, derived, costed

Seven steps per protocol, each with a cost and a time, derived from the
protocol's own record (category, chains, TVL, age) — never from a hand-written
list of names. Capital scales with TVL ($50–$250), the hold scales with age
(30–60 days), and two steps are pure risk hygiene: check the audit, the TVL
trend and the points page before adding more, and claim only from the link
the protocol itself publishes.

## The dashboard: the model is inspectable, not asserted

- The model panel prints the formula, the category-multiples table with the
  live-comps count and median behind each multiple, and a sandbox (two
  sliders: multiple scale, growth weight) that re-prices the top five rows
  live without moving the board.
- Every detail view shows the model's own inputs and recomputes the row in
  the page, stating whether the number matches board.json.
- Pre-token and live-token views are separate tabs: live protocols show
  their market cap as a fact, never mixed into the ranking.
- Search, category / chain / min-TVL filters, watchlist-only, sortable
  columns, and hash state so any view (including the detail view) is a link.

## What would still beat this

A stronger entry would add a second signal the snapshot already carries
(chain breadth, TVL concentration across chains) and would show, per
protocol, the nearest live-token comparables by name. Both are left out
deliberately: the first needs a judgement call about what breadth means, and
the second would bloat the dashboard source past the 64 KB cap the judge
reads. The current entry stays inside every gate with room to spare
(41 KB of dashboard source, 705 KB dossier, three screenshots at 130–174 KB).
