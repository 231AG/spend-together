import { icon, money, donut, lineChart, groupedBars, progress, responsiveChart } from './lib.mjs';
import {
  TODAY, me, partner, month, categories, transactions, daily, monthly, goals, status, laptopDetail, vacationSplit,
} from './data.mjs';

// ------------------------------------------------------------------ shell

const NAV = [
  { key: 'home', label: 'Home', icon: 'house', href: 'home.html' },
  { key: 'activity', label: 'Activity', icon: 'list-ordered', href: 'activity.html' },
  { key: 'goals', label: 'Goals', icon: 'target', href: 'goals.html' },
  { key: 'insights', label: 'Insights', icon: 'chart-column', href: 'insights.html' },
  { key: 'profile', label: 'Profile', icon: 'user-round', href: 'profile.html' },
];

const brandMark = () => `<span class="brand-mark">${icon('sprout', { size: 20 })}</span>`;

function nav(active) {
  return `<nav class="nav" aria-label="Primary">
    <a class="nav-brand" href="home.html" aria-label="SpendTogether home">${brandMark()}<span class="nav-brand-name">SpendTogether</span></a>
    <button class="nav-add" type="button" aria-label="Add">${icon('plus', { size: 20 })}<span class="nav-add-label">Add</span><kbd class="nav-add-label" aria-hidden="true">N</kbd></button>
    <ul class="nav-list">
      ${NAV.map((n) => `<li><a class="nav-link" href="${n.href}" ${n.key === active ? 'aria-current="page"' : ''}>
        <span class="nav-ico">${icon(n.icon, { size: 24 })}</span><span>${n.label}</span></a></li>`).join('')}
    </ul>
    <div class="nav-user"><span class="avatar">${me.initials}</span><div class="grow"><div class="row-title">${me.name}</div><div class="row-sub">Base currency USD</div></div></div>
  </nav>
  <button class="fab" type="button" aria-label="Add income, expense or savings">${icon('plus', { size: 26 })}</button>`;
}

function appPage(active, body, { topbar = '', cls = '' } = {}) {
  return `<div class="shell ${cls}">${nav(active)}${topbar}<main class="main" id="main">${body}</main></div>`;
}

const statusChip = (key) => `<span class="chip chip-${key}">${icon(status[key].icon, { size: 14 })}${status[key].label}</span>`;
const progressCls = { ontrack: '', atrisk: 'atrisk', behind: 'behind' };

// ------------------------------------------------------------------ fragments

function txRow(t, { current = false } = {}) {
  const map = {
    income: { tile: 'tile-income', title: t.category?.name, ico: 'arrow-down-left', cls: 'income', sign: true, label: 'Income' },
    expense: { tile: 'tile-expense', title: t.category?.name, ico: 'arrow-up-right', cls: 'expense', sign: false, label: 'Expense' },
    saving: { tile: 'tile-saving', title: t.goal, ico: 'piggy-bank', cls: 'saving', sign: false, label: 'Savings' },
  }[t.type];
  const tileIcon = t.type === 'saving' ? 'piggy-bank' : t.category.icon;
  const amt = t.type === 'expense' ? money(-t.amount) : t.type === 'income' ? money(t.amount, { sign: true }) : money(t.amount);
  return `<a class="tx" href="#" ${current ? 'aria-current="true"' : ''}>
    <span class="tile ${map.tile}">${icon(tileIcon)}</span>
    <span class="grow" style="min-width:0;flex:1"><span class="row-title" style="display:block">${map.title}</span><span class="row-sub" style="display:block">${t.note}</span></span>
    <span style="text-align:right"><span class="amount num ${map.cls}" style="display:block">${amt}${t.type === 'saving' ? ' saved' : ''}</span>
      <span class="caption tx-type">${icon(map.ico, { size: 12 })}${map.label}</span></span>
  </a>`;
}

function catRow(c) {
  return `<a class="cat-row" href="activity.html" style="--bar:var(--${c.token});text-decoration:none">
    <span class="tile tile-neutral" style="color:var(--fg-default)">${icon(c.icon)}</span>
    <span class="cat-name"><span class="row-title">${c.name}</span><span class="cat-pct num">${c.pct}</span></span>
    <span class="amount num" style="color:var(--fg-default)">${money(c.amount)}</span>
    ${progress(Math.round((c.amount * 100) / month.expenses))}
  </a>`;
}

function goalMini(g) {
  return `<a class="goal-mini" href="goal-details.html" style="text-decoration:none;color:inherit">
    <div class="goal-mini-top">
      <span class="tile ${g.type === 'Couple' ? 'tile-saving' : 'tile-income'}">${icon(g.icon)}</span>
      <div class="grow"><div class="row-title">${g.name}</div><div class="row-sub num">${money(g.saved)} of ${money(g.target)}</div></div>
      <span class="amount num">${g.pct}%</span>
    </div>
    ${progress(g.pct, g.type === 'Couple' ? 'couple' : progressCls[g.status])}
    <div class="goal-foot">${statusChip(g.status)}${g.type === 'Couple' ? `<span class="chip chip-couple">${icon('users', { size: 14 })}Shared</span>` : `<span class="caption">Due ${g.due}</span>`}</div>
  </a>`;
}

// ------------------------------------------------------------------ pages

function homeBody() {
  const recent = transactions.slice(0, 5);
  return `
  <div class="greeting">
    <div>
      <h1>Good afternoon, ${me.first}</h1>
      <div class="greeting-meta sm muted">${TODAY}<span class="chip chip-neutral">USD</span></div>
    </div>
    <div class="segmented" role="group" aria-label="Period">
      <button type="button" aria-pressed="false">Today</button><button type="button" aria-pressed="false">This week</button><button type="button" aria-pressed="true">This month</button>
    </div>
  </div>
  <div class="home-grid">
    <section class="hero area-hero" aria-labelledby="hero-label">
      <div id="hero-label" class="hero-label">Remaining this month</div>
      <div class="hero-value num">${money(month.remaining)}</div>
      <div class="hero-sub">Net cash flow <strong class="num">${money(month.net, { sign: true })}</strong> after income and expenses</div>
      <div class="hero-pace">
        <div class="row"><span>Day 17 of 30</span><span>Average spending <strong class="num">${money(month.avgDaily)}</strong> a day</span></div>
        ${progress(57)}
      </div>
      <dl class="hero-metrics">
        <div class="hero-metric"><dt>${icon('arrow-down-left', { size: 14 })}Income</dt><dd class="num">${money(month.income)}</dd></div>
        <div class="hero-metric"><dt>${icon('arrow-up-right', { size: 14 })}Expenses</dt><dd class="num">${money(month.expenses)}</dd></div>
        <div class="hero-metric"><dt>${icon('piggy-bank', { size: 14 })}Saved</dt><dd class="num">${money(month.saved)}</dd></div>
        <div class="hero-metric"><dt>${icon('trending-up', { size: 14 })}Savings rate</dt><dd class="num">${month.savingsRate}</dd></div>
      </dl>
    </section>
    <section class="card area-goals" aria-labelledby="goals-h">
      <div class="card-head"><h2 id="goals-h">Goals</h2><a href="goals.html">See all</a></div>
      <div class="divide">${goals.map(goalMini).join('')}</div>
    </section>
    <section class="card area-cats" aria-labelledby="cats-h">
      <div class="card-head"><h2 id="cats-h">Where your money went</h2><a href="insights.html">Insights</a></div>
      <p class="sm muted" style="margin:-8px 0 4px">${money(month.expenses)} spent in September, top categories</p>
      <div>${categories.map(catRow).join('')}</div>
    </section>
    <section class="card area-recent" aria-labelledby="recent-h" style="padding:var(--space-5) 0 var(--space-2)">
      <div class="card-head" style="padding:0 var(--space-5)"><h2 id="recent-h">Recent activity</h2><a href="activity.html">View all</a></div>
      <div class="divide">${recent.map((t) => txRow(t)).join('')}</div>
    </section>
  </div>`;
}

export const pages = {
  welcome: {
    title: 'Welcome',
    body: () => `<div class="auth">
      <main class="auth-panel">
        <div class="brand-row">${brandMark()}<span class="name">SpendTogether</span></div>
        <img class="welcome-art mobile-only" src="assets/illustrations/welcome.jpg" alt="" width="320" height="400">
        <div style="margin-top:var(--space-8)">
          <h1 class="welcome-title">Track. Save. Grow.<br>Together.</h1>
          <ul class="promise">
            <li><span class="tile tile-income">${icon('wallet', { size: 18 })}</span>Record income and spending in seconds</li>
            <li><span class="tile tile-expense">${icon('chart-column', { size: 18 })}</span>See your day, week and month at a glance</li>
            <li><span class="tile tile-saving">${icon('users', { size: 18 })}</span>Save for goals alone or with your partner</li>
          </ul>
        </div>
        <div class="auth-actions">
          <a class="btn btn-primary btn-lg btn-block" href="#">Create account</a>
          <a class="btn btn-secondary btn-lg btn-block" href="login.html">Log in</a>
        </div>
      </main>
      <div class="auth-art" aria-hidden="true"><img src="assets/illustrations/welcome.jpg" alt=""></div>
    </div>`,
  },

  login: {
    title: 'Log in',
    body: () => `<div class="auth">
      <main class="auth-panel">
        <div class="brand-row">${brandMark()}<span class="name">SpendTogether</span></div>
        <div style="margin:var(--space-10) 0 var(--space-6)">
          <h1>Welcome back</h1>
          <p class="muted" style="margin-top:var(--space-2)">Log in to see where your money stands this month.</p>
        </div>
        <form class="form-grid" onsubmit="return false">
          <div class="field"><label for="id">Email or phone</label>
            <div class="input focused">${icon('mail', { size: 18, cls: 'muted' })}<span class="grow">${me.email}</span></div></div>
          <div class="field"><label for="pw">Password</label>
            <div class="input"><span class="grow" style="letter-spacing:.2em">••••••••••</span><button class="icon-btn" type="button" aria-label="Show password" style="width:36px;height:36px">${icon('eye', { size: 18 })}</button></div>
            <a class="link" href="#" style="justify-self:end">Forgot password?</a></div>
          <div class="form-error" role="alert">${icon('info', { size: 18 })}<span>That email or password didn't match. Check both and try again.</span></div>
          <button class="btn btn-primary btn-lg btn-block" type="submit">Log in</button>
        </form>
        <p class="sm muted" style="text-align:center;margin-top:var(--space-6)">New to SpendTogether? <a href="welcome.html" style="font-weight:600">Create an account</a></p>
      </main>
      <div class="auth-art" aria-hidden="true"><img src="assets/illustrations/login.jpg" alt=""></div>
    </div>`,
  },

  home: { title: 'Home', body: () => appPage('home', homeBody()) },

  'add-sheet': {
    title: 'Add',
    body: () => `${appPage('home', homeBody())}
      <div class="scrim"></div>
      <section class="sheet" role="dialog" aria-modal="true" aria-labelledby="add-h">
        <div class="grabber"></div>
        <div class="sheet-head"><h2 id="add-h">What would you like to add?</h2><button class="icon-btn" aria-label="Close">${icon('x')}</button></div>
        <a class="add-option" href="add-expense.html"><span class="tile tile-lg tile-income">${icon('arrow-down-left', { size: 24 })}</span><span class="grow"><span class="row-title" style="display:block">Income</span><span class="row-sub" style="display:block">Money you received</span></span>${icon('chevron-right', { cls: 'muted' })}</a>
        <a class="add-option" href="add-expense.html"><span class="tile tile-lg tile-expense">${icon('arrow-up-right', { size: 24 })}</span><span class="grow"><span class="row-title" style="display:block">Expense</span><span class="row-sub" style="display:block">Money you spent</span></span>${icon('chevron-right', { cls: 'muted' })}</a>
        <a class="add-option" href="goal-details.html"><span class="tile tile-lg tile-saving">${icon('piggy-bank', { size: 24 })}</span><span class="grow"><span class="row-title" style="display:block">Savings contribution</span><span class="row-sub" style="display:block">Money you put toward a goal</span></span>${icon('chevron-right', { cls: 'muted' })}</a>
      </section>`,
  },

  'add-expense': {
    title: 'Add expense',
    body: () => `${appPage('home', homeBody())}
      <div class="scrim"></div>
      <section class="sheet sheet-full" role="dialog" aria-modal="true" aria-labelledby="exp-h">
        <div class="grabber"></div>
        <div class="sheet-head"><button class="icon-btn" aria-label="Close">${icon('x')}</button><h2 id="exp-h">Add expense</h2><span style="width:44px"></span></div>
        <div class="amount-entry">
          <label class="caption" for="amt">Amount</label>
          <div class="value num" id="amt">$22.50<span class="caret"></span></div>
          <button class="currency-chip" type="button">USD${icon('chevron-down', { size: 16 })}</button>
        </div>
        <div class="form-grid">
          <div class="field"><label>Category</label>
            <div class="recent-cats">
              <button class="filter-chip" aria-pressed="true" type="button">${icon('utensils', { size: 16 })}Food</button>
              <button class="filter-chip" aria-pressed="false" type="button">${icon('bus', { size: 16 })}Transport</button>
              <button class="filter-chip" aria-pressed="false" type="button">${icon('receipt', { size: 16 })}Bills</button>
              <button class="filter-chip" aria-pressed="false" type="button">${icon('shopping-bag', { size: 16 })}Shopping</button>
              <button class="filter-chip" aria-pressed="false" type="button">More${icon('chevron-down', { size: 16 })}</button>
            </div></div>
          <div class="field"><label>Date</label><div class="input">${icon('calendar', { size: 18, cls: 'muted' })}<span class="grow">Today, 17 Sep 2026</span>${icon('chevron-down', { size: 18, cls: 'muted' })}</div></div>
          <div class="field"><label>Note <span class="muted" style="font-weight:400">(optional)</span></label><div class="input"><span class="grow">Lunch at Waterside market</span></div><span class="helper">25 of 280 characters</span></div>
        </div>
        <div class="sheet-foot"><button class="btn btn-primary btn-lg btn-block" type="button">Save expense</button></div>
      </section>`,
  },

  activity: {
    title: 'Activity',
    body: () => {
      const days = [...new Set(transactions.map((t) => t.day))];
      const selected = transactions.find((t) => t.day === 14);
      const groups = days.slice(0, 7).map((d) => {
        const rows = transactions.filter((t) => t.day === d);
        const label = d === 16 ? 'Yesterday' : `${['Thu', 'Fri', 'Sat', 'Sun', 'Mon', 'Tue', 'Wed'][(((d - 17) % 7) + 7) % 7]}, ${d} September`;
        return `<section class="day-group"><h2><span>${label}</span></h2><div class="tx-list divide">${rows.map((t) => txRow(t, { current: t === selected })).join('')}</div></section>`;
      });
      return appPage('activity', `
        <div class="page-head"><h1>Activity</h1><span class="sm muted">September 2026</span></div>
        <div class="split">
          <div>
            <div class="search">${icon('search', { size: 18 })}<span>Search notes, categories or goals</span></div>
            <div class="filter-chips" role="group" aria-label="Filter" style="margin-top:var(--space-3)">
              <button class="filter-chip" aria-pressed="true">All</button><button class="filter-chip" aria-pressed="false">Income</button>
              <button class="filter-chip" aria-pressed="false">Expense</button><button class="filter-chip" aria-pressed="false">Savings contributions</button>
              <button class="filter-chip" aria-pressed="false">Category${icon('chevron-down', { size: 14 })}</button><button class="filter-chip" aria-pressed="false">${icon('calendar', { size: 14 })}Date range</button>
            </div>
            ${groups.join('')}
          </div>
          <aside class="card detail-panel" aria-labelledby="det-h">
            <div class="row"><span class="tile tile-lg tile-expense">${icon('receipt', { size: 24 })}</span><div class="grow"><h2 id="det-h" style="font-size:var(--text-h3)">Bills</h2><span class="caption tx-type" style="color:var(--money-expense)">${icon('arrow-up-right', { size: 12 })}Expense</span></div></div>
            <div class="detail-amount num expense">${money(-selected.amount)}</div>
            <p class="sm muted">Recorded in USD, your base currency</p>
            <dl class="kv">
              <dt>Date</dt><dd>Mon, 14 Sep 2026</dd>
              <dt>Category</dt><dd>Bills</dd>
              <dt>Note</dt><dd>${selected.note}</dd>
              <dt>Added</dt><dd>14 Sep, 18:42</dd>
            </dl>
            <div class="row" style="gap:var(--space-3)"><button class="btn btn-secondary" style="flex:1">${icon('pencil', { size: 18 })}Edit</button><button class="btn btn-danger-outline" style="flex:1">${icon('trash-2', { size: 18 })}Delete</button></div>
          </aside>
        </div>`);
    },
  },

  insights: {
    title: 'Insights',
    body: () => {
      const metric = (label, ico, tile, value, delta, good) => `<div class="card metric">
        <div class="metric-label"><span class="tile ${tile}" style="width:28px;height:28px;border-radius:var(--radius-sm)">${icon(ico, { size: 16 })}</span>${label}</div>
        <div class="metric-value num">${value}</div>
        <span class="delta ${good ? 'delta-good' : 'delta-bad'}">${icon(delta.startsWith('+') ? 'arrow-up' : 'arrow-down', { size: 12 })}<span class="num">${delta}</span></span> <span class="caption">vs Aug</span>
      </div>`;
      const table = `<button class="table-toggle" type="button">${icon('table', { size: 16 })}View as table</button>`;
      return appPage('insights', `
        <div class="page-head"><h1>Insights</h1></div>
        <div class="period-bar">
          <div class="segmented" role="tablist" aria-label="Period"><button role="tab" aria-selected="false">Daily</button><button role="tab" aria-selected="false">Weekly</button><button role="tab" aria-selected="true">Monthly</button></div>
          <div class="stepper"><button class="icon-btn" aria-label="Previous month">${icon('chevron-left')}</button>September 2026<button class="icon-btn" aria-label="Next month" disabled style="opacity:var(--opacity-disabled)">${icon('chevron-right')}</button></div>
        </div>
        <div class="metrics">
          ${metric('Income', 'arrow-down-left', 'tile-income', money(month.income), month.change.income, true)}
          ${metric('Expenses', 'arrow-up-right', 'tile-expense', money(month.expenses), month.change.expenses, true)}
          ${metric('Saved', 'piggy-bank', 'tile-saving', money(month.saved), month.change.saved, true)}
          ${metric('Savings rate', 'trending-up', 'tile-neutral', month.savingsRate, month.change.savingsRate, true)}
        </div>
        <div class="insights-grid">
          <section class="card chart-card">
            <div class="card-head"><h2>Spending trend</h2>${table}</div>
            <p class="chart-desc">Daily expenses in September, USD. You average <strong class="num" style="color:var(--fg-default)">${money(month.avgDaily)}</strong> a day.</p>
            <div class="legend"><span><span class="swatch" style="background:var(--chart-expense);height:3px"></span>Daily spending</span><span><span class="line-key"></span>Daily average <strong class="num">${money(month.avgDaily)}</strong></span></div>
            ${responsiveChart((w) => lineChart(daily, { avg: month.avgDaily, yMax: 8000, yStep: 2000, w, h: w < 500 ? 200 : 240, avgLabel: `avg ${money(month.avgDaily)}/day` }), 340, 640)}
          </section>
          <section class="card chart-card">
            <div class="card-head"><h2>Income vs expenses</h2>${table}</div>
            <p class="chart-desc">Monthly totals since you joined, USD</p>
            <div class="legend"><span><span class="swatch" style="background:var(--chart-income)"></span>Income</span><span><span class="swatch" style="background:var(--chart-expense)"></span>Expenses</span></div>
            ${responsiveChart((w) => groupedBars(monthly, { yMax: 120000, yStep: 40000, w, h: 240 }), 340, 460)}
          </section>
          <section class="card chart-card span-all">
            <div class="card-head"><h2>Category breakdown</h2>${table}</div>
            <p class="chart-desc">Where ${money(month.expenses)} of expenses went in September, USD</p>
            <div class="breakdown">
              ${donut(categories, { size: 208, centreValue: money(month.expenses), centreLabel: 'Total expenses' })}
              <div class="breakdown-list divide">
                ${categories.map((c) => `<a class="row" href="activity.html" style="padding:var(--space-3) 0;text-decoration:none">
                  <span class="swatch" style="background:var(--${c.token})"></span>${icon(c.icon, { size: 18, cls: 'muted' })}
                  <span class="grow row-title">${c.name}</span><span class="cat-pct num" style="width:52px;text-align:right">${c.pct}</span>
                  <span class="amount num" style="width:84px;color:var(--fg-default)">${money(c.amount)}</span>${icon('chevron-right', { size: 16, cls: 'muted' })}</a>`).join('')}
              </div>
            </div>
          </section>
        </div>`);
    },
  },

  goals: {
    title: 'Goals',
    body: () => {
      const mine = goals.filter((g) => g.type === 'Individual');
      const card = (g) => `<a class="card goal-card" href="goal-details.html">
        <div class="goal-card-top"><span class="tile tile-lg tile-income">${icon(g.icon, { size: 24 })}</span>
          <div class="grow"><h2 style="font-size:var(--text-h3);line-height:var(--lh-h3)">${g.name}</h2><span class="caption">${icon('calendar', { size: 12 })} Due ${g.due}</span></div>${statusChip(g.status)}</div>
        <div class="goal-amounts"><span><span class="big num">${money(g.saved)}</span> <span class="sm muted num">of ${money(g.target)}</span></span><span class="amount num">${g.pct}%</span></div>
        ${progress(g.pct, progressCls[g.status])}
        <div class="goal-foot"><span class="sm muted num">${money(g.target - g.saved)} to go</span><span class="link">Add contribution</span></div>
      </a>`;
      return appPage('goals', `
        <div class="page-head"><h1>Goals</h1><a class="btn btn-primary inline-cta" href="#">${icon('plus', { size: 18 })}Create goal</a></div>
        <div class="segmented" role="tablist" aria-label="Goal owner" style="margin-bottom:var(--space-5)"><button role="tab" aria-selected="true">My goals</button><button role="tab" aria-selected="false">Our goals</button></div>
        <div class="goal-grid">
          ${mine.map(card).join('')}
          <a class="goal-new" href="#">${icon('circle-plus', { size: 28 })}<span class="row-title">Create a goal</span><span class="sm">A phone, school fees, a rainy-day fund</span></a>
        </div>
        <button class="card collapsed" type="button" style="width:100%;text-align:left" aria-expanded="false">
          <span class="row">${icon('circle-check', { cls: 'income' })}<span class="row-title">Completed goals</span><span class="chip chip-neutral">1</span></span>${icon('chevron-down', { cls: 'muted' })}</button>`);
    },
  },

  'goal-details': {
    title: 'New Laptop',
    body: () => {
      const d = laptopDetail;
      const topbar = `<div class="topbar"><button class="icon-btn" aria-label="Back to goals">${icon('chevron-left', { size: 24 })}</button><span class="sm muted">Goals</span><span class="spacer"></span><button class="icon-btn" aria-label="Edit goal">${icon('pencil')}</button></div>`;
      return appPage('goals', `
        <div class="detail-grid">
          <section class="card goal-hero" aria-labelledby="gh">
            <div class="row"><span class="tile tile-lg tile-income">${icon('laptop', { size: 24 })}</span><div class="grow"><h1 id="gh" style="font-size:var(--text-h2);line-height:var(--lh-h2)">New Laptop</h1><span class="caption">Individual goal, due 31 Dec 2026</span></div>${statusChip('ontrack')}</div>
            <div><span class="overline">Saved</span><div class="big num">${money(60000)}</div><span class="sm muted num">of ${money(120000)} target</span></div>
            ${progress(50)}
            <div class="goal-amounts"><span class="sm"><strong class="num" style="color:var(--fg-default)">50.0%</strong> complete</span><span class="sm muted num">${money(d.remaining)} remaining</span></div>
            <a class="btn btn-primary btn-lg inline-cta" href="#">${icon('plus', { size: 18 })}Add contribution</a>
          </section>
          <div class="stack">
            <section class="card">
              <div class="card-head"><h2>To reach your goal</h2><span class="caption">${d.daysLeft} days left</span></div>
              <div class="pace-grid">
                <div class="pace"><strong class="num">${money(d.pace.day)}</strong><span class="caption">per day</span></div>
                <div class="pace"><strong class="num">${money(d.pace.week)}</strong><span class="caption">per week</span></div>
                <div class="pace"><strong class="num">${money(d.pace.month)}</strong><span class="caption">per month</span></div>
              </div>
            </section>
            <section class="card status-card">
              <div class="row" style="align-items:flex-start">${icon('circle-check', { size: 22, cls: 'income' })}
                <div><h2 style="font-size:var(--text-h3);line-height:var(--lh-h3);color:var(--status-ontrack-fg)">You're ahead of schedule</h2>
                <p class="sm" style="margin-top:var(--space-1)">You've saved ${money(60000)}; by today you needed about ${money(d.expected)}. At your recent pace of ${money(d.currentPaceDaily)} a day, you'll reach ${money(120000)} around <strong>${d.projected}</strong>.</p></div></div>
            </section>
          </div>
          <section class="card span-all" style="padding:var(--space-5) 0 var(--space-2)">
            <div class="card-head" style="padding:0 var(--space-5)"><h2>Contribution history</h2><span class="caption">5 contributions</span></div>
            <div class="divide">${d.history.map((h) => `<div class="tx"><span class="tile tile-saving">${icon('piggy-bank')}</span><span style="flex:1;min-width:0"><span class="row-title" style="display:block">${h.note}</span><span class="row-sub" style="display:block">${h.date}</span></span><span class="amount num saving">${money(h.amount)}</span></div>`).join('')}</div>
          </section>
        </div>
        <div class="sticky-bar"><a class="btn btn-primary btn-lg btn-block" href="#">${icon('plus', { size: 18 })}Add contribution</a></div>`, { topbar, cls: 'has-sticky' });
    },
  },

  couple: {
    title: 'Couple',
    body: () => {
      const v = goals.find((g) => g.id === 'vacation');
      const s = vacationSplit;
      return appPage('profile', `
        <div class="page-head"><h1>Saving together</h1></div>
        <div class="couple-grid">
          <div class="stack">
            <section class="card" style="padding:0;overflow:hidden">
              <img class="illustration" src="assets/illustrations/couple.jpg" alt="" style="border-radius:0;aspect-ratio:16/9;object-fit:cover">
              <div style="padding:var(--space-5)" class="row">
                <span class="avatar">${me.initials}</span><span class="avatar partner" style="margin-left:-14px;box-shadow:0 0 0 3px var(--bg-card)">${partner.initials}</span>
                <div class="grow"><div class="row-title">You and ${partner.name}</div><div class="row-sub">Connected since ${partner.since}</div></div>
                <span class="chip chip-ontrack">${icon('link-2', { size: 14 })}Connected</span>
              </div>
            </section>
            <div class="privacy">${icon('lock', { size: 18 })}<p class="sm"><strong style="color:var(--fg-default)">Only shared goals are shared.</strong> ${partner.first} never sees your income, expenses, balances or personal goals, and you never see theirs.</p></div>
          </div>
          <div class="stack">
            <section class="card">
              <div class="card-head"><h2>Shared goals</h2><a href="goals.html">Our goals</a></div>
              <a class="goal-card" href="goal-details.html">
                <div class="goal-card-top"><span class="tile tile-lg tile-saving">${icon('palmtree', { size: 24 })}</span><div class="grow"><div class="row-title" style="font-size:var(--text-base)">${v.name}</div><span class="caption">Due ${v.due}</span></div>${statusChip('atrisk')}</div>
                <div class="goal-amounts"><span><span class="big num">${money(v.saved)}</span> <span class="sm muted num">of ${money(v.target)}</span></span><span class="amount num">${v.pct}%</span></div>
                ${progress(v.pct, 'couple')}
              </a>
              <div style="margin-top:var(--space-5)">
                <div class="row-title" style="margin-bottom:var(--space-2)">Who contributed</div>
                <div class="split-bar" role="img" aria-label="You ${money(s.you)}, ${s.youPct} percent. ${partner.first} ${money(s.partner)}, ${s.partnerPct} percent."><span style="width:${s.youPct}%"></span><span style="width:${s.partnerPct}%"></span></div>
                <div class="legend" style="margin:var(--space-3) 0 0"><span><span class="swatch" style="background:var(--color-secondary-600)"></span>You <strong class="num">${money(s.you)}</strong> (${s.youPct}%)</span><span><span class="swatch" style="background:var(--color-accent-500)"></span>${partner.first} <strong class="num">${money(s.partner)}</strong> (${s.partnerPct}%)</span></div>
              </div>
            </section>
            <a class="btn btn-primary btn-lg btn-block" href="#">${icon('plus', { size: 18 })}Create shared goal</a>
            <button class="btn btn-danger-outline btn-block" type="button">End connection</button>
          </div>
        </div>`);
    },
  },

  profile: {
    title: 'Profile',
    body: () => {
      const setting = (ico, label, value, extra = '') => `<a class="setting" href="${extra || '#'}"><span class="tile tile-neutral">${icon(ico)}</span><span class="row-title">${label}</span>${value ? `<span class="setting-value">${value}</span>` : ''}${icon('chevron-right', { size: 18, cls: 'chev' })}</a>`;
      return appPage('profile', `
        <div class="page-head"><h1>Profile</h1></div>
        <div class="profile-grid">
          <div class="settings-group">
            <h2>Account</h2>
            <section class="card" style="display:flex;align-items:center;gap:var(--space-4)">
              <span class="avatar avatar-lg">${me.initials}</span>
              <div class="grow" style="min-width:0"><div class="row-title" style="font-size:var(--text-h3);line-height:var(--lh-h3)">${me.name}</div><div class="sm muted">${me.email}</div></div>
              <button class="icon-btn" aria-label="Edit profile">${icon('pencil')}</button>
            </section>
            <h2>Partner</h2>
            <div class="settings divide">${setting('heart', 'Couple', `Connected with ${partner.first}`, 'couple.html')}</div>
          </div>
          <div>
            <div class="settings-group"><h2>Preferences</h2>
              <div class="settings divide">
                ${setting('banknote', 'Base currency', 'USD, US Dollar')}
                ${setting('globe', 'Time zone', 'Africa/Monrovia')}
                ${setting('tags', 'Categories', '14 categories')}
                ${setting('bell', 'Notifications', 'Weekly summary, goal reminders')}
              </div>
            </div>
            <div class="settings-group"><h2>Security</h2>
              <div class="settings divide">${setting('lock', 'Change password', '')}${setting('circle-help', 'Keyboard shortcuts', 'On')}</div>
            </div>
            <button class="btn btn-danger-outline btn-block" type="button" style="margin-top:var(--space-6)">${icon('log-out', { size: 18 })}Log out</button>
          </div>
        </div>`);
    },
  },
};
