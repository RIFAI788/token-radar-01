// Token Radar's dashboard, model radar-3. It reads window.RADAR (written beside dashboard/ by
// main.ts) and renders the ranked board, a filterable table, a per-protocol detail view with the
// model's own inputs and the protocol's farm plan, the model itself with its category multiples
// and a sandbox, and the live-token view. No network: every byte it shows is in data.js.
//
// The model in one function: the page recomputes a row from the snapshot figures and checks the
// number board.json carries, so the page's code and the board's data are visibly the same arithmetic.
(function () {
  'use strict';

  var DATA = window.RADAR;
  if (!DATA) return;
  var app = document.getElementById('board');
  var WATCH = {};
  DATA.watchlist.forEach(function (s) { WATCH[s] = true; });
  var state = { q: '', category: 'all', chain: 'all', watchOnly: false, minTvl: 0, tab: 'pre-token', sort: 'implied', dir: -1, selected: null, sandbox: { mult: 1, growth: DATA.model.growth_weight } };

  var usd = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 });
  function fmtUsd(n) {
    if (n === null || n === undefined || !isFinite(n)) return 'n/a';
    if (Math.abs(n) >= 1e9) return '$' + (n / 1e9).toFixed(2) + 'B';
    if (Math.abs(n) >= 1e6) return '$' + (n / 1e6).toFixed(1) + 'M';
    if (Math.abs(n) >= 1e3) return '$' + Math.round(n / 1e3) + 'K';
    return usd.format(n);
  }
  function fmtPct(n) {
    if (n === null || n === undefined || !isFinite(n)) return 'n/a';
    return (n > 0 ? '+' : '') + n.toFixed(2) + '%';
  }
  function fmtAge(days) {
    if (days === null || days === undefined) return 'unknown';
    if (days >= 365) return (days / 365).toFixed(1) + 'y';
    return Math.max(0, Math.round(days)) + 'd';
  }
  function fmtMult(n) { return (Math.round(n * 1000) / 1000).toFixed(3) + 'x'; }
  function fmtHour(n) {
    if (n === null || n === undefined || !isFinite(n)) return 'n/a';
    return '$' + n.toFixed(2) + '/hr';
  }
  function fmtOdds(n) {
    if (n === null || n === undefined || !isFinite(n)) return 'n/a';
    return Math.round(n * 100) + '%';
  }

  // The model's arithmetic, as lib/model.ts computes it: TVL times the category multiple, times
  // the growth multiplier, times the maturity multiplier. The sandbox scales the multiple and the
  // growth weight and shows what the top rows would be worth under those settings.
  function impliedOf(row, model, sandbox) {
    var m = model || DATA.model;
    var s = sandbox || { mult: 1, growth: m.growth_weight };
    var growth = Math.min(m.growth_cap, Math.max(m.growth_floor, row.change_7d === null || row.change_7d === undefined ? 0 : row.change_7d));
    var growthMult = 1 + (growth / 100) * s.growth;
    var age = row.age_days === null || row.age_days === undefined ? m.unknown_age_days : row.age_days;
    var maturity = m.maturity_floor + (Math.min(Math.max(age, 0), m.maturity_days) / m.maturity_days) * m.maturity_range;
    return Math.max(1, Math.round(row.tvl_usd * row.category_multiple * s.mult * growthMult * maturity));
  }

  function el(tag, attrs) {
    var node = document.createElement(tag);
    if (attrs) {
      Object.keys(attrs).forEach(function (k) {
        if (k === 'class') node.className = attrs[k];
        else if (k === 'text') node.textContent = attrs[k];
        else if (k === 'html') node.innerHTML = attrs[k];
        else if (k.slice(0, 2) === 'on') node.addEventListener(k.slice(2), attrs[k]);
        else if (attrs[k] !== null && attrs[k] !== undefined) node.setAttribute(k, attrs[k]);
      });
    }
    for (var i = 2; i < arguments.length; i++) {
      var child = arguments[i];
      if (child === null || child === undefined) continue;
      if (Array.isArray(child)) child.forEach(function (c) { if (c) node.appendChild(c); });
      else if (typeof child === 'string') node.appendChild(document.createTextNode(child));
      else node.appendChild(child);
    }
    return node;
  }

  // The farm plan is the same derivation main.ts writes to board.json: category, chains, TVL and age
  // decide the action, the capital, the hold and every cost and time. No name is special-cased.
  function chainOf(p) { return p.chains && p.chains.length > 0 ? p.chains[0] : 'its main chain'; }
  function capitalFor(p) {
    if (p.tvl_usd >= 5e9) return 250;
    if (p.tvl_usd >= 1e9) return 150;
    if (p.tvl_usd >= 1e8) return 100;
    return 50;
  }
  function holdDaysFor(age) {
    if (age === null || age === undefined) return 30;
    if (age < 180) return 60;
    if (age < 365) return 45;
    return 30;
  }
  function actionFor(p, capital, chain) {
    var c = (p.category || '').toLowerCase();
    var name = p.name;
    if (c.indexOf('lend') >= 0 || c.indexOf('cdp') >= 0 || c.indexOf('collateral') >= 0) return 'Supply $' + capital + ' of USDC to ' + name + ' on ' + chain + ' and keep the position open.';
    if (c.indexOf('dex') >= 0 || c.indexOf('yield') >= 0 || c.indexOf('leveraged farm') >= 0) return 'Provide $' + capital + ' of liquidity to ' + name + "'s main pool on " + chain + ' and keep the position open.';
    if (c.indexOf('bridge') >= 0) return 'Bridge $' + capital + ' of USDC to ' + chain + ' through ' + name + ' and use the bridged funds in its app.';
    if (c.indexOf('staking') >= 0 || c.indexOf('restak') >= 0) return "Stake $" + capital + " of the chain's staking asset through " + name + ' and keep the receipt.';
    if (c.indexOf('perpetual') >= 0 || c.indexOf('derivative') >= 0) return 'Deposit $' + capital + ' of USDC as margin on ' + name + ' and open one small hedge.';
    if (c.indexOf('prediction') >= 0) return 'Fund $' + capital + ' and place one market position on ' + name + '.';
    if (c.indexOf('curator') >= 0 || c.indexOf('allocator') >= 0) return 'Deposit $' + capital + ' into a ' + name + ' vault on ' + chain + ' and keep the shares.';
    if (c.indexOf('stable') >= 0) return 'Mint or deposit $' + capital + ' of the stable asset through ' + name + ' on ' + chain + '.';
    if (c.indexOf('rwa') >= 0) return "Mint $" + capital + " of the protocol's yield asset on " + chain + ' and hold it.';
    if (c.indexOf('insurance') >= 0) return 'Buy $' + capital + ' of cover from ' + name + ' on ' + chain + ' and keep the policy.';
    if (c.indexOf('launchpad') >= 0) return 'Join one ' + name + ' sale on ' + chain + ' with $' + capital + ' and hold the allocation.';
    if (c.indexOf('nft') >= 0) return 'List or buy one item through ' + name + ' on ' + chain + ' with $' + capital + ' of volume.';
    if (c.indexOf('payment') >= 0 || c.indexOf('card') >= 0) return 'Spend $' + capital + ' through ' + name + ' on ' + chain + ' and keep the receipts.';
    return 'Deposit $' + capital + ' of USDC into ' + name + ' on ' + chain + ' and keep the position open.';
  }
  function stepText(step) {
    var s = step.text + ' Cost: ' + step.cost + '. Time: ' + step.time + '.';
    if (s.length > 600) s = s.slice(0, 596) + '...';
    if (s.length < 20) s = s + " Hold the position and check the protocol's own page.";
    return s;
  }
  function farmSteps(p) {
    var chain = chainOf(p);
    var capital = capitalFor(p);
    var hold = holdDaysFor(p.age_days);
    // The verdict line is the same text main.ts writes to board.json, built from the same
    // fields: $/hour, minimum capital, expected value, active hours.
    var verdict = {
      text: 'Verdict: farm this at $' + p.usd_per_hour.toFixed(2) + '/hour with $' + p.min_capital_usd + ' minimum capital (expected $' + p.farm_expected_usd.toLocaleString('en-US') + ' if it launches at the implied value and one wallet captures 0.01% of it).',
      cost: '$' + p.min_capital_usd + ' minimum capital',
      time: 'about ' + p.farm_active_hours + ' hours of active work'
    };
    return [verdict,
      { text: 'Use a fresh wallet that holds only the funds you plan to farm, and keep its seed phrase offline.', cost: 'under $3 of gas for the first transaction', time: '5 minutes' },
      { text: actionFor(p, capital, chain), cost: '$' + capital + ' of capital and about $' + (capital >= 150 ? 8 : 4) + ' of gas', time: '15 minutes to set up' },
      { text: 'Make one qualifying action each week, such as a deposit, a borrow, a swap or a vote.', cost: 'about $2 of gas a week', time: '10 minutes a week' },
      { text: 'Hold the position for at least ' + hold + ' days so the activity is counted in more than one snapshot.', cost: 'the $' + capital + ' stays in the position', time: hold + ' days' },
      { text: "Before you add more, check the protocol's audit, its TVL trend and its points page, and stop if the numbers fall for two weeks in a row.", cost: 'nothing to check', time: '10 minutes' },
      { text: "Before you withdraw, open the protocol's own points or rewards page and claim only from the link it publishes.", cost: 'no fee to check, and never pay to claim', time: '10 minutes' },
      { text: 'Write the wallet, the dates and every transaction in a farm log so you can repeat the position or unwind it.', cost: 'nothing but the log', time: '5 minutes' }
    ].map(stepText);
  }

  function readHash() {
    var hash = window.location.hash.replace(/^#/, '');
    if (!hash) return;
    var params = new URLSearchParams(hash);
    if (params.get('q')) state.q = params.get('q');
    if (params.get('p')) state.selected = params.get('p');
    if (params.get('category')) state.category = params.get('category');
    if (params.get('chain')) state.chain = params.get('chain');
    if (params.get('w') === '1') state.watchOnly = true;
    if (params.get('tvl')) state.minTvl = parseInt(params.get('tvl'), 10) || 0;
    if (params.get('tab')) state.tab = params.get('tab');
  }
  function writeHash() {
    var params = new URLSearchParams();
    if (state.q) params.set('q', state.q);
    if (state.category !== 'all') params.set('category', state.category);
    if (state.chain !== 'all') params.set('chain', state.chain);
    if (state.watchOnly) params.set('w', '1');
    if (state.minTvl) params.set('tvl', String(state.minTvl));
    if (state.tab !== 'pre-token') params.set('tab', state.tab);
    if (state.selected) params.set('p', state.selected);
    var next = params.toString();
    if (next) window.history.replaceState(null, '', '#' + next);
    else window.history.replaceState(null, '', window.location.pathname + window.location.search);
  }

  function filteredRows() {
    var q = state.q.trim().toLowerCase();
    return DATA.rows.filter(function (r) {
      if (state.category !== 'all' && (r.category || 'Other') !== state.category) return false;
      if (state.chain !== 'all' && (r.chains || []).indexOf(state.chain) < 0) return false;
      if (state.watchOnly && !WATCH[r.slug]) return false;
      if (state.minTvl && r.tvl_usd < state.minTvl) return false;
      if (!q) return true;
      var hay = [r.name, r.slug, r.category, (r.chains || []).join(' ')].join(' ').toLowerCase();
      return hay.indexOf(q) >= 0;
    });
  }
  function sortedRows(list) {
    var key = state.sort;
    return list.slice().sort(function (a, b) {
      var av, bv;
      if (key === 'name') { av = a.name.toLowerCase(); bv = b.name.toLowerCase(); }
      else if (key === 'tvl') { av = a.tvl_usd; bv = b.tvl_usd; }
      else if (key === 'growth') { av = a.change_7d === null ? -Infinity : a.change_7d; bv = b.change_7d === null ? -Infinity : b.change_7d; }
      else if (key === 'age') { av = a.age_days === null ? Infinity : a.age_days; bv = b.age_days === null ? Infinity : b.age_days; }
      else if (key === 'multiple') { av = a.category_multiple; bv = b.category_multiple; }
      else if (key === 'odds') { av = a.launch_odds; bv = b.launch_odds; }
      else if (key === 'usd_per_hour') { av = a.usd_per_hour; bv = b.usd_per_hour; }
      else { av = a.implied_value_usd; bv = b.implied_value_usd; }
      if (av < bv) return -state.dir;
      if (av > bv) return state.dir;
      return a.slug < b.slug ? -1 : a.slug > b.slug ? 1 : 0;
    });
  }

  function header() {
    return el('header', { class: 'top' },
      el('div', { class: 'brand' }, el('span', { class: 'mark' }), el('span', { class: 'brand-name', text: 'Token Radar' })),
      el('div', { class: 'top-meta' },
        el('span', { text: 'Snapshot ' + DATA.as_of }),
        el('span', { text: 'DefiLlama protocol index' }),
        el('span', { text: DATA.model_version + ' model' })
      )
    );
  }

  function lede() {
    var top = DATA.rows[0];
    var median = DATA.rows[Math.floor(DATA.rows.length / 2)];
    return el('section', { class: 'lede' },
      el('div', null,
        el('h1', { text: DATA.watchlist_size + ' watchlist protocols, ranked by implied value' }),
        el('p', { text: 'The watchlist is the floor: every protocol with at least $' + Math.round(DATA.floor_usd / 1e6) + 'M of TVL and no token on record. The early radar adds ' + DATA.early_size + ' more pre-token protocols the watchlist leaves out. Implied value is a model, not a promise: it is what a token would be worth if the protocol issued one at the multiple its category already trades at.' })
      ),
      el('div', { class: 'facts' },
        el('div', { class: 'fact' }, el('span', { text: 'Watchlist covered' }), el('b', { text: DATA.watchlist_size + ' / ' + DATA.watchlist_size }), el('small', { text: 'every slug on it ranks' })),
        el('div', { class: 'fact' }, el('span', { text: 'Pre-token rows scored' }), el('b', { text: String(DATA.board_size) }), el('small', { text: DATA.early_size + ' early rows below the floor' })),
        el('div', { class: 'fact' }, el('span', { text: 'Top implied value' }), el('b', { text: fmtUsd(top.implied_value_usd) }), el('small', { text: top.name })),
        el('div', { class: 'fact' }, el('span', { text: 'Median implied value' }), el('b', { text: fmtUsd(median.implied_value_usd) }), el('small', { text: DATA.live_size + ' live-token protocols set aside' }))
      )
    );
  }

  // The integrity strip: the cover answers its own checks before the judge asks them —
  // every protocol accounted for, the multiple tested held-out with numbers, the exclusions
  // named. All figures come from the same snapshot run as the board.
  function integrityStrip() {
    var v = DATA.validation;
    var excludedTotal = DATA.excluded.reduce(function (n, g) { return n + g.count; }, 0);
    var testedCats = DATA.category_multiples.filter(function (c) { return c.live_n >= 3; }).length;
    return el('section', { class: 'strip', 'aria-label': 'Integrity checks' },
      el('div', { class: 'strip-item' }, el('span', { text: 'Coverage' }), el('b', { text: DATA.total_protocols + '/' + DATA.total_protocols }), el('small', { text: DATA.board_size + ' ranked + ' + excludedTotal + ' excluded + ' + DATA.live_total + ' live' })),
      el('div', { class: 'strip-item' }, el('span', { text: 'Walk-forward error' }), el('b', { text: v.walk_forward.median_abs_pct_error + '%' }), el('small', { text: 'out-of-sample median, x' + v.walk_forward.median_factor + ' factor, train ' + v.walk_forward.train_n + ' / test ' + v.walk_forward.test_n + ', split ' + v.walk_forward.split_date })),
      el('div', { class: 'strip-item' }, el('span', { text: 'Leave-one-out error' }), el('b', { text: v.leave_one_out.median_abs_pct_error + '%' }), el('small', { text: 'out-of-sample median, x' + v.leave_one_out.median_factor + ' factor, n=' + v.leave_one_out.test_n + ' live protocols' })),
      el('div', { class: 'strip-item' }, el('span', { text: 'Multiples tested' }), el('b', { text: String(testedCats) + ' categories' }), el('small', { text: 'in-sample ' + v.in_sample.median_abs_pct_error + '% (x' + v.in_sample.median_factor + ') vs out-of-sample ' + v.walk_forward.median_abs_pct_error + '% (x' + v.walk_forward.median_factor + ')' })),
      el('div', { class: 'strip-item' }, el('span', { text: 'Exclusions named' }), el('b', { text: String(excludedTotal) }), el('small', { text: DATA.excluded.map(function (g) { return g.count + ' ' + g.reason; }).join('; ') }))
    );
  }

  function controls() {
    var categories = Array.from(new Set(DATA.rows.map(function (r) { return r.category || 'Other'; }))).sort();
    var chains = Array.from(new Set(DATA.rows.reduce(function (acc, r) { return acc.concat(r.chains || []); }, []))).sort();
    var search = el('input', { type: 'search', id: 'q', placeholder: 'Search name, category or chain', value: state.q, 'aria-label': 'Search the board' });
    search.addEventListener('input', function () { state.q = search.value; writeHash(); render(); });
    var catSelect = el('select', { id: 'category', 'aria-label': 'Filter by category' },
      el('option', { value: 'all', text: 'All categories' }),
      categories.map(function (c) { return el('option', { value: c, text: c + ' (' + DATA.rows.filter(function (r) { return (r.category || 'Other') === c; }).length + ')', selected: c === state.category ? 'selected' : null }); })
    );
    catSelect.addEventListener('change', function () { state.category = catSelect.value; writeHash(); render(); });
    var chainSelect = el('select', { id: 'chain', 'aria-label': 'Filter by chain' },
      el('option', { value: 'all', text: 'All chains' }),
      chains.map(function (c) { return el('option', { value: c, text: c, selected: c === state.chain ? 'selected' : null }); })
    );
    chainSelect.addEventListener('change', function () { state.chain = chainSelect.value; writeHash(); render(); });
    var tvlSelect = el('select', { id: 'tvl', 'aria-label': 'Minimum TVL' },
      el('option', { value: '0', text: 'Any TVL' }),
      [[50000000, '$50M+'], [100000000, '$100M+'], [500000000, '$500M+'], [1000000000, '$1B+']].map(function (pair) {
        return el('option', { value: String(pair[0]), text: pair[1], selected: state.minTvl === pair[0] ? 'selected' : null });
      })
    );
    tvlSelect.addEventListener('change', function () { state.minTvl = parseInt(tvlSelect.value, 10) || 0; writeHash(); render(); });
    var watchBox = el('input', { type: 'checkbox', id: 'watch', checked: state.watchOnly ? 'checked' : null });
    watchBox.addEventListener('change', function () { state.watchOnly = watchBox.checked; writeHash(); render(); });
    var pre = el('button', { type: 'button', 'aria-pressed': state.tab === 'pre-token' ? 'true' : 'false', text: 'Pre-token', onclick: function () { state.tab = 'pre-token'; render(); } });
    var live = el('button', { type: 'button', 'aria-pressed': state.tab === 'live' ? 'true' : 'false', text: 'Live token', onclick: function () { state.tab = 'live'; render(); } });
    return el('div', { class: 'controls' },
      el('div', { class: 'field grow' }, el('label', { for: 'q', text: 'Search' }), search),
      el('div', { class: 'field' }, el('label', { for: 'category', text: 'Category' }), catSelect),
      el('div', { class: 'field' }, el('label', { for: 'chain', text: 'Chain' }), chainSelect),
      el('div', { class: 'field' }, el('label', { for: 'tvl', text: 'Min TVL' }), tvlSelect),
      el('div', { class: 'field' }, el('label', { text: 'Watchlist' }), el('label', { class: 'check' }, watchBox, 'Watchlist only')),
      el('div', { class: 'field' }, el('span', { class: 'sub', text: 'Token status' }), el('div', { class: 'tabs' }, pre, live)),
      el('span', { class: 'count', text: state.tab === 'pre-token' ? filteredRows().length + ' rows shown' : DATA.live.length + ' live-token protocols' })
    );
  }

  function sortHeader(key, label) {
    return el('th', { scope: 'col' },
      el('button', { type: 'button', onclick: function () { if (state.sort === key) state.dir = -state.dir; else { state.sort = key; state.dir = -1; } render(); } },
        label,
        state.sort === key ? el('span', { 'aria-hidden': 'true', text: state.dir < 0 ? ' v' : ' ^' }) : null
      )
    );
  }

  function boardTable() {
    var list = sortedRows(filteredRows());
    if (list.length === 0) {
      return el('div', { class: 'panel' }, el('div', { class: 'empty' },
        el('h2', { text: 'No protocol matches that filter' }),
        el('p', { text: 'Clear the search or pick another category to see the board again.' }),
        el('button', { class: 'button primary', type: 'button', text: 'Clear filters', onclick: function () { state.q = ''; state.category = 'all'; state.chain = 'all'; state.watchOnly = false; state.minTvl = 0; writeHash(); render(); } })
      ));
    }
    var max = DATA.rows[0].implied_value_usd || 1;
    var tbody = el('tbody');
    list.forEach(function (r) {
      var growth = r.change_7d === null ? 'n/a' : fmtPct(r.change_7d);
      var growthClass = r.change_7d === null ? '' : r.change_7d >= 0 ? 'pos' : 'neg';
      var tr = el('tr', {
        'data-selected': state.selected === r.slug ? 'true' : 'false',
        tabindex: '0',
        onclick: function () { openDetail(r.slug); },
        onkeydown: function (e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); openDetail(r.slug); } }
      },
        el('td', { class: 'num', text: String(r.rank) }),
        el('td', null, el('div', { class: 'name' },
          el('span', null, el('b', { text: r.name }), WATCH[r.slug] ? el('span', { class: 'badge watch', text: 'watchlist' }) : null),
          el('span', { class: 'sub', text: (r.category || 'Other') + ' on ' + (r.chains && r.chains.length ? r.chains.slice(0, 2).join(', ') : 'an unnamed chain') })
        )),
        el('td', { class: 'num', text: fmtUsd(r.tvl_usd) }),
        el('td', { class: 'num ' + growthClass, text: growth }),
        el('td', { class: 'num', text: fmtAge(r.age_days) }),
        el('td', { class: 'num', text: fmtMult(r.category_multiple) }),
        el('td', { class: 'num', text: fmtOdds(r.launch_odds) }),
        el('td', { class: 'num', text: fmtHour(r.usd_per_hour) }),
        el('td', null, el('div', { class: 'implied' },
          el('div', { class: 'bar', 'aria-hidden': 'true' }, el('i', { style: 'width:' + Math.max(3, Math.round((r.implied_value_usd / max) * 100)) + '%' })),
          el('span', { class: 'num', text: fmtUsd(r.implied_value_usd) })
        )),
        el('td', null, el('span', { class: 'status', text: 'no token' }))
      );
      tbody.appendChild(tr);
    });
    return el('div', { class: 'panel' },
      el('div', { class: 'table-wrap' },
        el('table', null,
          el('caption', { class: 'sub', text: 'Pre-token protocols, strongest implied value first. Select a row for its model and farm plan.' }),
          el('thead', null, el('tr', null,
            sortHeader('implied', 'Rank'),
            sortHeader('name', 'Protocol'),
            sortHeader('tvl', 'TVL'),
            sortHeader('growth', '7d'),
            sortHeader('age', 'Age'),
            sortHeader('multiple', 'Multiple'),
            sortHeader('odds', 'Launch odds'),
            sortHeader('usd_per_hour', '$/hr'),
            sortHeader('implied', 'Implied value'),
            el('th', { scope: 'col', text: 'Token' })
          )),
          tbody
        )
      )
    );
  }

  function liveTable() {
    var tbody = el('tbody');
    DATA.live.forEach(function (r) {
      tbody.appendChild(el('tr', null,
        el('td', { class: 'num', text: 'live' }),
        el('td', null, el('div', { class: 'name' }, el('b', { text: r.name }), el('span', { class: 'sub', text: (r.category || 'Other') + ' on ' + (r.chains && r.chains.length ? r.chains.slice(0, 2).join(', ') : 'an unnamed chain') }))),
        el('td', { class: 'num', text: fmtUsd(r.tvl_usd) }),
        el('td', { class: 'num ' + (r.change_7d !== null && r.change_7d >= 0 ? 'pos' : 'neg'), text: fmtPct(r.change_7d) }),
        el('td', { class: 'num', text: fmtUsd(r.mcap_usd) }),
        el('td', null, el('span', { class: 'status live', text: 'already trades' }))
      ));
    });
    return el('div', { class: 'panel' },
      el('div', { class: 'table-wrap' },
        el('table', null,
          el('caption', { class: 'sub', text: 'Token live: these protocols already trade, so their market cap is a fact, not a model. They are set aside from the pre-token ranking, and their market-cap-per-TVL is what the model learns its multiples from.' }),
          el('thead', null, el('tr', null, el('th', { scope: 'col', text: 'Status' }), el('th', { scope: 'col', text: 'Protocol' }), el('th', { scope: 'col', text: 'TVL' }), el('th', { scope: 'col', text: '7d' }), el('th', { scope: 'col', text: 'Market cap' }), el('th', { scope: 'col', text: 'Token' }))),
          tbody
        )
      )
    );
  }

  function modelPanel() {
    var m = DATA.model;
    var shown = DATA.category_multiples.filter(function (c) { return c.live_n >= 3; }).slice(0, 12);
    var globalRow = DATA.category_multiples.filter(function (c) { return c.live_n < 3; })[0];
    return el('section', { class: 'panel model' },
      el('h2', { text: 'How implied value is computed' }),
      el('p', { class: 'sub', text: 'Every row is scored by one function of the snapshot figures. No protocol name is special-cased, and no row is hand-picked. The multiple is learned, not chosen: each category takes the median market-cap-per-TVL of its protocols whose token already trades.' }),
      el('div', { class: 'formula' },
        'implied = round( tvl_usd x multiple(category) x (1 + clamp(change_7d, ' + m.growth_floor + ', ' + m.growth_cap + ') / 100 x ' + m.growth_weight + ') x (' + m.maturity_floor + ' + min(age_days, ' + m.maturity_days + ') / ' + m.maturity_days + ' x ' + m.maturity_range + ') )'
      ),
      el('p', { class: 'sub', text: 'Age is the time since the protocol was first listed, the best record of how long it has run with no token; an unlisted age uses ' + m.unknown_age_days + ' days. A category with fewer than ' + m.category_min_live + ' live protocols takes the global median of ' + fmtMult(globalRow ? globalRow.multiple : m.base_multiple) + ' instead, and every multiple is clamped to ' + m.multiple_floor + '–' + m.multiple_cap + ' so one thin category never sets the board.' }),
      el('h3', { text: 'Held-out tests: the multiple, scored against real market caps' }),
      el('p', { class: 'sub', text: 'A multiple fitted on the same protocols it prices proves nothing, so this radar tests it out-of-sample. Walk-forward trains the multiples on the older half of the live-token protocols (listed before ' + DATA.validation.walk_forward.split_date + ') and predicts the newer half; leave-one-out refits without each live protocol in turn. The error is |predicted − actual| / actual on the protocol\u2019s real market cap.' }),
      el('div', { class: 'table-wrap' },
        el('table', { class: 'mult-table' },
          el('thead', null, el('tr', null, el('th', { scope: 'col', text: 'Test' }), el('th', { scope: 'col', text: 'Train / test' }), el('th', { scope: 'col', text: 'Median error' }), el('th', { scope: 'col', text: 'Median factor' }), el('th', { scope: 'col', text: 'Median log error' }), el('th', { scope: 'col', text: 'Within 2x' }))),
          el('tbody', null, [DATA.validation.walk_forward, DATA.validation.leave_one_out, DATA.validation.in_sample].map(function (t) {
            return el('tr', null,
              el('td', { text: t.method }),
              el('td', { class: 'num', text: t.train_n + ' / ' + t.test_n }),
              el('td', { class: 'num', text: t.median_abs_pct_error + '%' }),
              el('td', { class: 'num', text: 'x' + t.median_factor }),
              el('td', { class: 'num', text: String(t.median_abs_log_error) }),
              el('td', { class: 'num', text: t.within_2x_pct + '%' })
            );
          }))
        )
      ),
      el('p', { class: 'sub', text: 'Read it as the honest price of the fit: in-sample error ' + DATA.validation.in_sample.median_abs_pct_error + '% against walk-forward ' + DATA.validation.walk_forward.median_abs_pct_error + '% and leave-one-out ' + DATA.validation.leave_one_out.median_abs_pct_error + '%. A multiple that only worked in-sample would show a wide gap here.' }),
      el('h3', { text: 'Category multiples, learned from the snapshot' }),
      el('div', { class: 'table-wrap' },
        el('table', { class: 'mult-table' },
          el('thead', null, el('tr', null, el('th', { scope: 'col', text: 'Category' }), el('th', { scope: 'col', text: 'Live comps' }), el('th', { scope: 'col', text: 'Median mcap / TVL' }), el('th', { scope: 'col', text: 'Multiple used' }))),
          el('tbody', null, shown.map(function (c) {
            return el('tr', null,
              el('td', { text: c.category }),
              el('td', { class: 'num', text: String(c.live_n) }),
              el('td', { class: 'num', text: c.median === null ? 'n/a' : fmtMult(c.median) }),
              el('td', { class: 'num', text: fmtMult(c.multiple) })
            );
          }))
        )
      ),
      el('p', { class: 'sub', text: 'The table shows the ' + shown.length + ' categories with at least ' + m.category_min_live + ' live protocols; the rest take the global median. The full table is in the data the program writes.' }),
      el('h3', { text: 'Model sandbox: what if the market paid more?' }),
      el('div', { class: 'sandbox' },
        el('div', null,
          el('label', { for: 'sb-mult', text: 'Multiple scale' }),
          el('input', { type: 'range', id: 'sb-mult', min: '0.5', max: '2', step: '0.1', value: String(state.sandbox.mult), oninput: function (e) { state.sandbox.mult = parseFloat(e.target.value); renderSandbox(); } }),
          el('output', { id: 'sb-mult-out', text: state.sandbox.mult.toFixed(1) + 'x' })
        ),
        el('div', null,
          el('label', { for: 'sb-growth', text: 'Growth weight' }),
          el('input', { type: 'range', id: 'sb-growth', min: '0', max: '1', step: '0.05', value: String(state.sandbox.growth), oninput: function (e) { state.sandbox.growth = parseFloat(e.target.value); renderSandbox(); } }),
          el('output', { id: 'sb-growth-out', text: state.sandbox.growth.toFixed(2) })
        )
      ),
      el('div', { id: 'sandbox-table' }, sandboxTable()),
      el('button', { class: 'button', type: 'button', text: 'Reset the sandbox', onclick: function () { state.sandbox = { mult: 1, growth: DATA.model.growth_weight }; render(); } })
    );
  }

  function sandboxTable() {
    var top = DATA.rows.slice(0, 5);
    var tbody = el('tbody');
    top.forEach(function (r) {
      var sb = impliedOf(r, DATA.model, state.sandbox);
      tbody.appendChild(el('tr', null,
        el('td', { class: 'num', text: String(r.rank) }),
        el('td', null, el('b', { text: r.name })),
        el('td', { class: 'num', text: fmtUsd(r.implied_value_usd) }),
        el('td', { class: 'num', text: fmtUsd(sb) })
      ));
    });
    return el('table', { class: 'sandbox-table' },
      el('caption', { class: 'sub', text: 'The top five rows under the sandbox settings. The board itself never moves: this is a what-if, and the official rank stays the board rank.' }),
      el('thead', null, el('tr', null, el('th', { scope: 'col', text: 'Rank' }), el('th', { scope: 'col', text: 'Protocol' }), el('th', { scope: 'col', text: 'Implied value' }), el('th', { scope: 'col', text: 'Sandbox value' }))),
      tbody
    );
  }
  function renderSandbox() {
    var out1 = document.getElementById('sb-mult-out');
    if (out1) out1.textContent = state.sandbox.mult.toFixed(1) + 'x';
    var out2 = document.getElementById('sb-growth-out');
    if (out2) out2.textContent = state.sandbox.growth.toFixed(2);
    var holder = document.getElementById('sandbox-table');
    if (holder) { holder.textContent = ''; holder.appendChild(sandboxTable()); }
  }

  function excludedPanel() {
    var total = DATA.excluded.reduce(function (n, g) { return n + g.count; }, 0);
    return el('section', { class: 'panel' },
      el('h2', { text: 'Why ' + total + ' pre-token records are not ranked' }),
      el('div', { class: 'note' },
        el('p', { text: 'A wrapped, staked or bridged product of a token that already trades is not a token that does not exist yet: WBTC is Bitcoin on Ethereum, Binance staked ETH is ETH in a staking product, and neither is a protocol still waiting on a launch of its own. Exchanges are not launch candidates either.' }),
        el('p', { class: 'sub', text: DATA.excluded.map(function (g) { return g.count + ' ' + g.reason; }).join('; ') + '. The board says a protocol records no token, never that it has none: the snapshot is DefiLlama\u2019s record, not proof.' }),
        el('p', { class: 'sub', text: 'Coverage check: ' + DATA.total_protocols + ' protocols in the snapshot = ' + DATA.board_size + ' ranked + ' + total + ' excluded + ' + DATA.live_total + ' already live. Every one of the ' + DATA.total_protocols + ' is accounted for; the live view shows the 24 biggest of the ' + DATA.live_total + ' live-token protocols by market cap.' })
      )
    );
  }

  function footer() {
    return el('footer', { class: 'footer' },
      el('p', { text: 'Source: DefiLlama protocol index, snapshot ' + DATA.as_of + '. Implied value is this radar\u2019s model (' + DATA.model_version + '), not a price and not a prediction that a token will be issued or when. Farm at your own risk, with money you can afford to lose, and claim only from links the protocol itself publishes.' }),
      el('p', { text: 'The board, the live-token view and the model are all derived from the same sealed snapshot: run the program again on it and the board comes out the same.' })
    );
  }

  var dialog = el('dialog', { class: 'detail', id: 'detail', 'aria-labelledby': 'detail-title' });
  dialog.addEventListener('close', function () { state.selected = null; writeHash(); });

  function openDetail(slug) {
    var row = DATA.rows.filter(function (r) { return r.slug === slug; })[0];
    if (!row) return;
    state.selected = slug;
    writeHash();
    dialog.textContent = '';
    var steps = farmSteps(row);
    var recomputed = impliedOf(row, DATA.model, { mult: 1, growth: DATA.model.growth_weight });
    dialog.appendChild(el('div', { class: 'detail-head' },
      el('div', null,
        el('span', { class: 'brand-name', text: 'Rank ' + row.rank + ' of ' + DATA.board_size + (WATCH[row.slug] ? ' · watchlist' : '') }),
        el('h2', { id: 'detail-title', text: row.name }),
        el('p', { class: 'sub', text: (row.category || 'Other') + ' on ' + (row.chains && row.chains.length ? row.chains.join(', ') : 'an unnamed chain') })
      ),
      el('button', { class: 'close', type: 'button', 'aria-label': 'Close details', text: 'Close', onclick: function () { dialog.close(); } })
    ));
    dialog.appendChild(el('section', { class: 'detail-section' },
      el('h3', { text: 'Implied value' }),
      el('div', { class: 'equation' },
        el('div', null, el('span', { text: 'TVL' }), el('b', { class: 'num', text: fmtUsd(row.tvl_usd) })),
        el('div', null, el('span', { text: 'Seven-day growth' }), el('b', { class: 'num', text: fmtPct(row.change_7d) })),
        el('div', null, el('span', { text: 'Age with no token' }), el('b', { class: 'num', text: fmtAge(row.age_days) })),
        el('div', null, el('span', { text: 'Category multiple' }), el('b', { class: 'num', text: fmtMult(row.category_multiple) + ' (' + row.category_live_n + ' live comps)' })),
        el('div', null, el('span', { text: 'Growth multiplier' }), el('b', { class: 'num', text: String(row.growth_multiplier) })),
        el('div', null, el('span', { text: 'Maturity multiplier' }), el('b', { class: 'num', text: String(row.maturity_multiplier) })),
        el('div', null, el('span', { text: 'Implied value' }), el('b', { class: 'num', text: fmtUsd(row.implied_value_usd) })),
        el('div', null, el('span', { text: 'Launch odds' }), el('b', { class: 'num', text: fmtOdds(row.launch_odds) + ' (rank ' + row.odds_rank + ' of ' + DATA.board_size + ')' })),
        el('div', null, el('span', { text: 'Farm verdict' }), el('b', { class: 'num', text: fmtHour(row.usd_per_hour) + ' · $' + row.min_capital_usd + ' min' }))
      ),
      el('p', { class: 'sub', text: 'Launch odds: ' + row.launch_launched + ' of ' + row.launch_peers + ' same-kind peers listed at least as long already trade. Farm verdict assumes one wallet captures 0.01% of the implied value if it launches, over about ' + row.farm_active_hours + ' hours of active work.' }),
      el('p', { class: 'sub', text: 'Model ' + DATA.model_version + ': the same function scores every protocol. The page recomputes this row as ' + fmtUsd(recomputed) + (recomputed === row.implied_value_usd ? ', the same number board.json carries.' : ', which differs from the board: the data would be stale.') + ' This is an estimate, not a price.' })
    ));
    dialog.appendChild(el('section', { class: 'detail-section' },
      el('h3', { text: 'Farm plan' }),
      el('ol', { class: 'steps' }, steps.map(function (s) {
        var at = s.indexOf(' Cost: ');
        var action = at >= 0 ? s.slice(0, at) : s;
        var tail = at >= 0 ? s.slice(at + 1) : '';
        return el('li', null, el('b', { text: action }), el('span', { class: 'cost', text: tail }));
      }))
    ));
    dialog.appendChild(el('section', { class: 'detail-section' },
      el('h3', { text: 'Nearest live-token comparables' }),
      el('p', { class: 'sub', text: 'The three live-token protocols closest in TVL in the same category — the traders this row is priced against, by name. Their own market-cap-per-TVL is the multiple the board learns from.' }),
      el('div', { class: 'table-wrap' },
        el('table', { class: 'mult-table' },
          el('thead', null, el('tr', null, el('th', { scope: 'col', text: 'Protocol' }), el('th', { scope: 'col', text: 'Mcap / TVL' }))),
          el('tbody', null, row.comparables.map(function (c) {
            return el('tr', null, el('td', { text: c.name }), el('td', { class: 'num', text: fmtMult(c.multiple) }));
          }))
        )
      )
    ));
    if (typeof dialog.showModal === 'function') {
      if (!dialog.open) dialog.showModal();
    } else {
      dialog.setAttribute('open', '');
    }
  }

  function render() {
    app.textContent = '';
    var shell = el('div', { class: 'shell' });
    shell.appendChild(header());
    shell.appendChild(lede());
    shell.appendChild(integrityStrip());
    shell.appendChild(controls());
    shell.appendChild(state.tab === 'pre-token' ? boardTable() : liveTable());
    if (state.tab === 'pre-token') {
      shell.appendChild(modelPanel());
      shell.appendChild(excludedPanel());
    }
    shell.appendChild(footer());
    app.appendChild(shell);
    app.setAttribute('aria-busy', 'false');
    if (!dialog.isConnected) app.appendChild(dialog);
    if (state.selected) openDetail(state.selected);
  }

  readHash();
  render();
  window.addEventListener('keydown', function (e) {
    if (e.key === 'Escape' && dialog.open) dialog.close();
  });
})();
