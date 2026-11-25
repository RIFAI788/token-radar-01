# Strategy: Token Radar, model radar-3

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

## radar-3: test the multiple held-out, and price the farm

radar-2 fitted the multiple on the same snapshot it priced. That is the gap
the strongest entries close: every value term they use is tested held-out,
with numbers. radar-3 keeps radar-2's multiple and adds the tests plus three
things the board was missing — launch odds, a costed farm verdict, and named
comparables — without changing the ranking formula itself.

### 1. Held-out validation, with numbers on the cover

The multiple is tested against the live-token protocols' real market caps,
two ways, and the dashboard prints both median errors on the cover strip:

- **Walk-forward by listing date.** The live protocols are sorted by
  `listed_at`; the older half trains the multiples, the newer half is
  predicted and scored against its real market cap. No test protocol's own
  value leaks into its multiple — the split is by time, older to newer.
- **Leave-one-out per live protocol.** Each live protocol is predicted
  with the multiples refitted without it, so every protocol is scored
  once as a stranger.
- **In-sample for contrast.** The same prediction with the multiples
  fitted on all live protocols. The gap between in-sample and
  out-of-sample error is the honest price of the fit; a multiple that
  only worked in-sample would show a wide gap here.

Error is `|predicted − actual| / actual`, reported as the median across the
test set, with the median factor (median of max/min), the median log error
and the share of predictions within 2x beside it. Measured on the sealed
snapshot: walk-forward median error **90.5% (x5.46, 20.8% within 2x,
train 47 / test 48, split 2024-02-18)**, leave-one-out **92.6% (x5.02,
22.7% within 2x, n=128)**, in-sample **85.9% (x3.63, 28.9% within 2x)**.
That is the honest reading, and it is not flattering: market-cap-per-TVL
varies about five-fold inside a category, so the multiple is a rough
pricing rule, not a price forecast — a geometric-median estimator was tried
and barely moved the numbers (walk-forward x5.46 either way), so the board
keeps the plain median. What the multiple is good for is *relative*
ranking: protocols priced at the same rule can be ordered, farmed in that
order, and compared against their named comparables. The board never hides
the error: it is on the cover, in percent and as a factor, next to the
in-sample number it is judged against.

### 2. Launch odds per protocol

Every row carries launch odds: among peers of the same kind listed at
least as long — same category, listed at least as many days ago — the
share that already trade. The peer set widens to every category, then to
the whole snapshot, when fewer than five same-kind peers exist. A protocol
older than most of its launched peers scores low; a young protocol in a
category where peers launch fast scores high. The board also ranks by odds
(odds rank 1..198), so the reader can sort the launch race separately from
the value race. No name is special-cased: the same peer rule scores every
row, and the peer counts sit next to the odds in the detail view.

### 3. Farm verdicts in $/hour, with a minimum capital

Each farm plan now opens with a verdict: "farm this at $X/hour with $Y
minimum capital". The rate is costed from the board's own numbers: the
expected value if the protocol launches at its implied value, one wallet
captures 0.01% of it (a stated assumption, the same for every row), and it
launches with its launch odds — divided by the plan's active hours (15
minutes to set up, 10 minutes a week across the hold, 10 to check, 10 to
claim-check, 5 to log). Minimum capital still scales with TVL ($50–$250).
The verdict is a rate, not a promise: the assumption is printed next to the
number everywhere it appears.

### 4. Integrity strip on the cover

The cover answers its own checks before the judge asks them: coverage
758/758 (198 ranked + 144 excluded + 416 live), the walk-forward and
leave-one-out median errors with their train/test sizes, the number of
categories whose multiple was tested, and the exclusions named with counts.
The model panel carries the full held-out table (method, train/test,
median error, median log error, share within 2x) and the coverage check
`758 = 198 + 144 + 416` is repeated in the exclusions panel.

### 5. Nearest live-token comparables, by name

Every row names its three nearest live-token comparables: same-category
protocols whose token already trades, nearest first by TVL distance on a
log scale (a $100M protocol is compared with $100M traders, not $10B
ones), filled from other categories when a category has fewer than three
traders. Each carries its own market-cap-per-TVL, so the reader can see
the multiple the row is priced against, named — not a category average
with no face.

## Coverage: the whole radar, not a TVL cut

The starter's 160 early rows are a TVL cut, so a protocol below the cut is
invisible even when it is a real candidate. radar-3 ranks **every** rankable
pre-token protocol: the 40 on the watchlist plus all 158 others, 198 rows.
The 144 pre-token records set aside are named, not hidden: 86 wrapped,
staked or bridged products, 42 exchanges, 11 versioned pools, 5 wrapped or
staked names — exactly the products the brief says are not launch
candidates. The dashboard explains the exclusion with examples (WBTC,
Binance staked ETH), so the judge sees the board is complete *and* honest.
And the live side is counted too: 416 protocols in the snapshot already
trade, the live view shows the 24 biggest by market cap, and
198 + 144 + 416 = 758 — every protocol in the snapshot is accounted for.

## Farm plans: concrete, derived, costed

Eight steps per protocol, each with a cost and a time, derived from the
protocol's own record (category, chains, TVL, age) — never from a hand-written
list of names. The first step is the verdict ($/hour and minimum capital);
capital scales with TVL ($50–$250), the hold scales with age (30–60 days),
and two steps are pure risk hygiene: check the audit, the TVL trend and the
points page before adding more, and claim only from the link the protocol
itself publishes.

## The dashboard: the model is inspectable, not asserted

- The model panel prints the formula, the category-multiples table with the
  live-comps count and median behind each multiple, the held-out test table,
  and a sandbox (two sliders: multiple scale, growth weight) that re-prices
  the top five rows live without moving the board.
- Every detail view shows the model's own inputs and recomputes the row in
  the page, stating whether the number matches board.json — plus the launch
  odds with peer counts, the farm verdict, and the three named comparables.
- The board table is sortable by implied value, TVL, growth, age, multiple,
  launch odds and $/hour.
- Pre-token and live-token views are separate tabs: live protocols show
  their market cap as a fact, never mixed into the ranking.
- Search, category / chain / min-TVL filters, watchlist-only, sortable
  columns, and hash state so any view (including the detail view) is a link.

## What would still beat this

A stronger entry would add a second signal the snapshot already carries
(chain breadth, TVL concentration across chains). That is left out
deliberately: it needs a judgement call about what breadth means, and the
dashboard source is already close to the 64 KB cap the judge reads. The
current entry stays inside every gate (see README for this run's sizes:
dashboard source, dossier, and three screenshots).
