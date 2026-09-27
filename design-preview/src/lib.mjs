// Shared helpers for the static design preview: icons, money formatting, charts.
// Every amount is integer minor units (cents). Nothing here parses money as a float.
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const iconDir = require.resolve('lucide-static/package.json').replace('package.json', 'icons/');

/** Inline a Lucide icon at the spec stroke width (1.75). Decorative unless a label is given. */
export function icon(name, { size = 20, label, cls = '' } = {}) {
  const raw = readFileSync(`${iconDir}${name}.svg`, 'utf8')
    .replace(/<!--.*?-->/s, '')
    .replace(/\s+/g, ' ')
    .trim();
  const a11y = label ? `role="img" aria-label="${label}"` : 'aria-hidden="true" focusable="false"';
  return raw
    .replace(/class="[^"]*"/, `class="icon ${cls}" ${a11y}`)
    .replace(/width="24"/, `width="${size}"`)
    .replace(/height="24"/, `height="${size}"`)
    .replace(/stroke-width="2"/, 'stroke-width="1.75"');
}

const MINUS = '−';

/** Format integer minor units as USD, e.g. 57000 -> "$570.00". */
export function money(minor, { sign = false, code = '$' } = {}) {
  const neg = minor < 0;
  const abs = Math.abs(minor);
  const whole = Math.trunc(abs / 100).toLocaleString('en-US');
  const cents = String(abs % 100).padStart(2, '0');
  const prefix = neg ? MINUS : sign ? '+' : '';
  return `${prefix}${code}${whole}.${cents}`;
}

/** Short axis money: 8000 -> "$80". */
export const moneyShort = (minor) => `$${Math.round(minor / 100).toLocaleString('en-US')}`;

export const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;');

// ---------------------------------------------------------------- charts

/** C-01 donut: inner radius 60%, 2px surface gap between segments, total in the centre. */
export function donut(segments, { size = 200, centreLabel, centreValue }) {
  const r = size / 2;
  const inner = r * 0.6;
  const total = segments.reduce((s, x) => s + x.amount, 0);
  const gap = 2 / r; // radians, gives ~2px surface gap at the outer edge
  let angle = -Math.PI / 2;
  const paths = segments.map((seg) => {
    const sweep = (seg.amount / total) * Math.PI * 2;
    const a0 = angle + gap / 2;
    const a1 = angle + sweep - gap / 2;
    angle += sweep;
    const large = a1 - a0 > Math.PI ? 1 : 0;
    const p = (rad, a) => `${(r + rad * Math.cos(a)).toFixed(2)} ${(r + rad * Math.sin(a)).toFixed(2)}`;
    return `<path d="M ${p(r, a0)} A ${r} ${r} 0 ${large} 1 ${p(r, a1)} L ${p(inner, a1)} A ${inner} ${inner} 0 ${large} 0 ${p(inner, a0)} Z" fill="var(--${seg.token})"/>`;
  });
  return `<div class="donut" style="--size:${size}px">
    <svg viewBox="0 0 ${size} ${size}" width="${size}" height="${size}" aria-hidden="true">${paths.join('')}</svg>
    <div class="donut-centre"><span class="num donut-value">${centreValue}</span><span class="donut-label">${centreLabel}</span></div>
  </div>`;
}

/** C-02 line: 2px line, y-axis from 0, dashed average line. points: [{label, value}] in minor units. */
export function lineChart(points, { avg, yMax, yStep, w = 640, h = 220, avgLabel }) {
  const padL = 40, padR = 12, padT = 12, padB = 26;
  const iw = w - padL - padR, ih = h - padT - padB;
  const x = (i) => padL + (i / (points.length - 1)) * iw;
  const y = (v) => padT + ih - (v / yMax) * ih;
  const grid = [];
  for (let v = 0; v <= yMax; v += yStep) {
    grid.push(`<line x1="${padL}" x2="${w - padR}" y1="${y(v)}" y2="${y(v)}" class="grid"/>`);
    grid.push(`<text x="${padL - 8}" y="${y(v) + 4}" class="axis" text-anchor="end">${moneyShort(v)}</text>`);
  }
  const xl = points
    .map((p, i) => (p.tick ? `<text x="${x(i)}" y="${h - 6}" class="axis" text-anchor="middle">${p.label}</text>` : ''))
    .join('');
  const d = points.map((p, i) => `${i ? 'L' : 'M'} ${x(i).toFixed(1)} ${y(p.value).toFixed(1)}`).join(' ');
  const area = `${d} L ${x(points.length - 1)} ${y(0)} L ${x(0)} ${y(0)} Z`;
  const last = points.length - 1;
  return `<svg class="chart-svg" viewBox="0 0 ${w} ${h}" aria-hidden="true">
    ${grid.join('')}
    <path d="${area}" class="line-area"/>
    <line x1="${padL}" x2="${w - padR}" y1="${y(avg)}" y2="${y(avg)}" class="avg-line"/>
    <path d="${d}" class="line"/>
    <circle cx="${x(last)}" cy="${y(points[last].value)}" r="4" class="line-dot"/>
    ${xl}
  </svg>`;
}

/** C-03 grouped bars: income left, expenses right, value labels above bars, 2px gap between bars. */
export function groupedBars(groups, { yMax, yStep, w = 460, h = 240 }) {
  const padL = 44, padR = 8, padT = 22, padB = 26;
  const iw = w - padL - padR, ih = h - padT - padB;
  const y = (v) => padT + ih - (v / yMax) * ih;
  const slot = iw / groups.length;
  const bw = Math.min(34, slot * 0.28);
  const grid = [];
  for (let v = 0; v <= yMax; v += yStep) {
    grid.push(`<line x1="${padL}" x2="${w - padR}" y1="${y(v)}" y2="${y(v)}" class="grid"/>`);
    grid.push(`<text x="${padL - 8}" y="${y(v) + 4}" class="axis" text-anchor="end">${moneyShort(v)}</text>`);
  }
  const bar = (bx, v, cls) => {
    const top = y(v), bottom = y(0), r = 4;
    return `<path class="${cls}" d="M ${bx} ${bottom} L ${bx} ${top + r} Q ${bx} ${top} ${bx + r} ${top} L ${bx + bw - r} ${top} Q ${bx + bw} ${top} ${bx + bw} ${top + r} L ${bx + bw} ${bottom} Z"/>
      <text x="${bx + bw / 2}" y="${top - 6}" class="bar-value" text-anchor="middle">${moneyShort(v)}</text>`;
  };
  const bars = groups
    .map((g, i) => {
      const cx = padL + slot * i + slot / 2;
      return `${bar(cx - bw - 1, g.income, 'bar-income')}${bar(cx + 1, g.expenses, 'bar-expense')}
        <text x="${cx}" y="${h - 6}" class="axis" text-anchor="middle">${g.label}</text>`;
    })
    .join('');
  return `<svg class="chart-svg" viewBox="0 0 ${w} ${h}" aria-hidden="true">${grid.join('')}${bars}</svg>`;
}

/** C-04 progress bar: 8px, rounded, fill in primary-600; always paired with % text by the caller. */
export const progress = (pct, cls = '') =>
  `<div class="progress ${cls}" role="progressbar" aria-valuenow="${pct}" aria-valuemin="0" aria-valuemax="100"><span style="width:${pct}%"></span></div>`;

/** Render a chart twice, sized for small and large containers, so SVG text stays at its real size. */
export const responsiveChart = (render, small, large) =>
  `<div class="chart-sm">${render(small)}</div><div class="chart-lg">${render(large)}</div>`;
