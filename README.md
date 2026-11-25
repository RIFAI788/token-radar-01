# Token Radar — a dashboard of pre-token protocols, ranked by implied value

[![make.fun · token-radar-01](https://make.fun/badge/token-radar-01.svg)](https://make.fun/bounty/token-radar-01?utm_source=github&utm_medium=readme&utm_campaign=token-radar-01)
[![rank](https://make.fun/badge/token-radar-01/RIFAI788/token-radar-01/rank.svg)](https://make.fun/bounty/token-radar-01/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=token-radar-01)
[![reward](https://make.fun/badge/token-radar-01/RIFAI788/token-radar-01/reward.svg)](https://make.fun/bounty/token-radar-01?utm_source=github&utm_medium=readme&utm_campaign=token-radar-01)

An entry for the make.fun bounty **"Build the best token launch radar"**
($1,325, ends Mon 14 Dec 2026 10:00 UTC / 17:00 WIB).

## What it is

A static dashboard (no framework, no network) that ranks the protocols whose
token does not exist yet by an **implied value**: what a token would be worth
if the protocol issued one at the multiple its category already trades at.

- **Board**: 198 rows — the whole 40-protocol watchlist (the floor) plus 158
  early rows the watchlist leaves out. Every row carries an 8-step farm plan
  that opens with a verdict ("farm this at $X/hour, min capital $Y"), launch
  odds with an odds rank, and its three nearest live-token comparables by name.
- **Model (radar-3)**: the multiple is *learned* from the snapshot — for each
  category, the median market-cap-per-TVL of its protocols whose token already
  trades, shrunk toward the global median when few trade, the global median
  when fewer than three trade, clamped to 0.02–0.60. No name is special-cased.
  The multiple is also *tested held-out*: walk-forward by listing date (older
  live protocols train, newer ones are predicted) and leave-one-out per live
  protocol, both scored against real market caps and printed on the cover
  with their median errors. In-sample error is shown beside them for contrast.
- **Dashboard**: search, category / chain / min-TVL filters, watchlist-only,
  pre-token / live-token tabs, sortable table (including launch odds and
  $/hour), per-protocol detail with the model's own inputs and a recomputation
  check against `board.json`, a model panel with the category-multiples table,
  the held-out test table and a sandbox, an integrity strip on the cover
  (758/758 accounted for, held-out errors, exclusions named), and a note on
  the 144 pre-token records set aside (wrapped, staked or bridged products
  and exchanges are not launch candidates).
- **Live view**: the 24 biggest live-token protocols by market cap, set aside
  from the ranking — their market caps are facts, not a model, and they are
  what the multiples are learned from.

## Run it

Requires Node.js 22.18+ (tested on Node 24).

```sh
# From this repo root, with the sealed snapshot at ../input/snapshot.json:
mkdir -p out
MAKEFUN_OUTPUT_DIR=out node main.ts --input ../token-radar-01-kit/input/snapshot.json
```

That writes `out/board.json`, `out/data.js`, `out/dashboard/`,
`out/screenshots/` and `out/dossier.json`. The dashboard is static: serve
`out/` over HTTP and open `dashboard/` (for example
`python3 -m http.server -d out`, then http://localhost:8000/dashboard/).

## Test it

```sh
# The site's own pre-submit checks (needs the kit and a git commit):
node ../token-radar-01-kit/cli/makefun.mjs check --kit ../token-radar-01-kit --repo . --worktree
# Local grading against the house dashboards:
node ../token-radar-01-kit/cli/makefun.mjs grade-local --kit ../token-radar-01-kit --repo . --driver process
# Retake the three screenshots (board, detail, filtered) at 1440x900:
node ../shots.mjs
```

## Test results (25 Nov 2026, this machine — model radar-3)

- Program run: 758 protocols, 40 on the watchlist, **198 rows scored**
  (158 early, 24 live set aside, 144 set aside). Coverage **758/758
  accounted for (198 ranked + 144 excluded + 416 live)**. Top: Steakhouse Financial
  $367,263,237; median row $2,971,675.
- Held-out validation of the multiple, against live protocols' real market
  caps: walk-forward (by listing date, train 47 / test 48, split
  2024-02-18) median error **90.5% (x5.46, 20.8% within 2x)**;
  leave-one-out median error **92.6% (x5.02, 22.7% within 2x, n=128)**;
  in-sample **85.9% (x3.63, 28.9% within 2x)**. The multiple is a rough
  pricing rule (about five-fold inside a category); the numbers are printed
  on the cover, in percent and as a factor, next to the in-sample number.
  A geometric-median estimator was tried and barely moved the numbers, so
  the board keeps the plain median.
- Launch odds range 9.1%–100% across the 198 rows; farm verdicts range
  $2.77–$7,502.67/hour (median $117.28/hour, minimum capital $50–$250).
  The dashboard's verdict line matches board.json's farm step 1 on all
  198 rows (checked by script).
- Sizes: dashboard source **49,211 bytes** (under the 64 KB cap),
  dossier **724,673 bytes**, board.json 463,960 bytes, data.js 141,771 bytes.
- `makefun check`: **not run in this build session** — the parent agent
  re-bundles this v3 session and runs `check` over the new bundle before
  submitting (the v2 bundle's 13 passed / 0 failed result does not carry
  over to v3).
- `grade-local`: **not available for this competition** — the kit says
  "token-radar-01 is a program/v1 competition: its scorer and reference
  data are not published in the kit, so the house grades it"; the server
  grades every entry. No local score exists to quote.
- Screenshots: 3 real screenshots of the new dashboard at 1440×900,
  taken with Playwright/Chromium, no page errors: `1-board.png` (163 KB),
  `2-detail.png` (190 KB), `3-filtered.png` (152 KB) — all under the 512 KiB cap.

## How to submit (for the parent agent — do NOT do this yet)

1. **Re-attach the usage rows first** (the bundle as built carries 0
   usage rows; `check` fails `thinking_priced` until then):
   run the muse.db query in `rebuild-bundle.sh` (step 1) to write
   `muse-usage.jsonl`, then run `./rebuild-bundle.sh` and confirm
   `check` reports 13 passed, 0 failed.
2. Push this repo to a **public** GitHub repo created after the competition
   opened (14 Nov 2026). License: MIT (already in `LICENSE`).
3. Submit on https://make.fun/bounty/token-radar-01 with the repo URL and
   the transcript bundle. Resubmits are Force_Last (max 20/day, 40 total);
   the last submission before the deadline is final.
   - The $1,325 prize **is escrowed** in USDC on Solana, so the submit may
     need `--keypair` (the kit signs the entry message over the transcripts
     where prizes are escrowed) — check `makefun submit --help` first.
     The repo owner must be the GitHub login (rifai788) or the commit must
     carry `.makefun/owner.json` naming one of the account's entry wallets.

## Files

- `main.ts` — the entrypoint: reads the snapshot, scores the board, writes
  `board.json`, `data.js`, `dashboard/`, `screenshots/`, `dossier.json`.
- `lib/model.ts` — the model: category multiples, held-out validation
  (walk-forward + leave-one-out), launch odds, farm verdicts and comparables,
  implied value, farm plans, board building and validation.
- `dashboard/` — the static page: `index.html`, `app.css`, `app.js`
  (41 KB total, under the 64 KB dashboard-source cap).
- `screenshots/` — the three required screenshots.
- `vendor/makefun-board.ts` — the kit's library, copied byte-for-byte.
- `out/` — build output, not part of the entry (remove before submitting).
