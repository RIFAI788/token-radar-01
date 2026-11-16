# Token Radar — a dashboard of pre-token protocols, ranked by implied value

An entry for the make.fun bounty **"Build the best token launch radar"**
($1,325, ends Mon 14 Dec 2026 10:00 UTC / 17:00 WIB).

## What it is

A static dashboard (no framework, no network) that ranks the protocols whose
token does not exist yet by an **implied value**: what a token would be worth
if the protocol issued one at the multiple its category already trades at.

- **Board**: 198 rows — the whole 40-protocol watchlist (the floor) plus 158
  early rows the watchlist leaves out. Every row carries a 7-step farm plan.
- **Model (radar-2)**: the multiple is *learned* from the snapshot — for each
  category, the median market-cap-per-TVL of its protocols whose token already
  trades, shrunk toward the global median when few trade, the global median
  when fewer than three trade, clamped to 0.02–0.60. No name is special-cased.
- **Dashboard**: search, category / chain / min-TVL filters, watchlist-only,
  pre-token / live-token tabs, sortable table, per-protocol detail with the
  model's own inputs and a recomputation check against `board.json`, a model
  panel with the category-multiples table and a sandbox, and a note on the 144
  pre-token records set aside (wrapped, staked or bridged products and
  exchanges are not launch candidates).
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

## Test results (16 Nov 2026, this machine)

- Program run: 758 protocols, 40 on the watchlist, **198 rows scored**
  (158 early, 24 live set aside, 144 set aside). Top: Steakhouse Financial
  $367,263,237; median row $2,971,675.
- `makefun check` (with the transcript bundle, rebuilt with usage rows
  attached): **13 passed, 0 failed, 6 skipped, 5 checked at submission.**
  The passes include `thinking_reproduces` 39.9% (625/1563 lines, ≥30%
  required), `thinking_priced`, `thinking_turns` 52, `thinking_revised`
  (model.ts from 3 messages, main.ts from 2), `thinking_in_window`,
  `transcripts_run_record`, `snapshot`, `license_osi`, `entrypoint`,
  `competition_open`. Bundle sha256
  `a66b6e39b16a8eda57046a07025ccf00108f0e38afb69397adee236dd1572782`.
- `grade-local`: **not available for this competition** — the kit says
  "token-radar-01 is a program/v1 competition: its scorer and reference
  data are not published in the kit, so the house grades it"; the server
  grades every entry. No local score exists to quote.
- Screenshots: 3 real screenshots of the new dashboard at 1440×900,
  taken with Playwright/Chromium, no page errors: `1-board.png` (137 KB),
  `2-detail.png` (174 KB), `3-filtered.png` (130 KB) — all under the 512 KiB cap.

## How to submit (for the parent agent — do NOT do this yet)

1. **Re-attach the usage rows first** (the bundle as built carries 0
   usage rows; `check` fails `thinking_priced` until then):
   run the muse.db query in `rebuild-bundle.sh` (step 1) to write
   `muse-usage.jsonl`, then run `./rebuild-bundle.sh` and confirm
   `check` reports 13 passed, 0 failed.
2. Push this repo to a **public** GitHub repo created after the competition
   opened (14 Nov 2026). License: MIT (already in `LICENSE`).
3. Submit on https://make.fun/bounty/token-radar-01 with the repo URL and
   the transcript bundle. Max 5 submissions/day, 10 total; the last
   submission before the deadline is final.
   - The $1,325 prize **is escrowed** in USDC on Solana, so the submit may
     need `--keypair` (the kit signs the entry message over the transcripts
     where prizes are escrowed) — check `makefun submit --help` first.
     The repo owner must be the GitHub login (rifai788) or the commit must
     carry `.makefun/owner.json` naming one of the account's entry wallets.

## Files

- `main.ts` — the entrypoint: reads the snapshot, scores the board, writes
  `board.json`, `data.js`, `dashboard/`, `screenshots/`, `dossier.json`.
- `lib/model.ts` — the model: category multiples, implied value, farm plans,
  board building and validation.
- `dashboard/` — the static page: `index.html`, `app.css`, `app.js`
  (41 KB total, under the 64 KB dashboard-source cap).
- `screenshots/` — the three required screenshots.
- `vendor/makefun-board.ts` — the kit's library, copied byte-for-byte.
- `out/` — build output, not part of the entry (remove before submitting).
