import type { ReactNode } from 'react';

// Token-coloured spot illustrations for Welcome and onboarding (F3-16 stand-ins, D-53).
// Decorative: the text beside them carries the meaning, so they are hidden from
// assistive technology. They read the palette through CSS variables, so they follow the
// tokens. Canva artwork replaces them once its download hosts are reachable (D-51).

const C = {
  primary: 'var(--color-primary-500)',
  primaryDeep: 'var(--color-primary-700)',
  primarySoft: 'var(--color-primary-100)',
  indigo: 'var(--color-secondary-500)',
  indigoSoft: 'var(--color-secondary-100)',
  amber: 'var(--color-accent-500)',
  amberSoft: 'var(--color-accent-50)',
  card: 'var(--color-white)',
  line: 'var(--color-neutral-200)',
  ink: 'var(--color-neutral-700)',
};

function Frame({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <svg
      aria-hidden
      focusable="false"
      viewBox="0 0 320 240"
      className={className}
      role="presentation"
    >
      <circle cx="160" cy="124" r="104" fill={C.primarySoft} />
      {children}
    </svg>
  );
}

/** Welcome: a phone showing a chart, a growing jar of coins, and a plant. */
export function WelcomeIllustration({ className }: { className?: string }) {
  return (
    <Frame {...(className ? { className } : {})}>
      <rect x="96" y="40" width="104" height="176" rx="18" fill={C.ink} />
      <rect x="104" y="52" width="88" height="152" rx="10" fill={C.card} />
      <rect x="116" y="66" width="46" height="8" rx="4" fill={C.line} />
      <rect x="116" y="82" width="64" height="14" rx="4" fill={C.primaryDeep} />
      <rect x="118" y="160" width="10" height="28" rx="3" fill={C.primary} />
      <rect x="134" y="146" width="10" height="42" rx="3" fill={C.primary} />
      <rect x="150" y="132" width="10" height="56" rx="3" fill={C.indigo} />
      <rect x="166" y="120" width="10" height="68" rx="3" fill={C.primary} />
      <path
        d="M118 150 L140 136 L156 124 L176 108"
        stroke={C.amber}
        strokeWidth="3"
        fill="none"
        strokeLinecap="round"
      />
      <rect
        x="214"
        y="126"
        width="54"
        height="72"
        rx="14"
        fill={C.indigoSoft}
        stroke={C.indigo}
        strokeWidth="3"
      />
      <rect x="222" y="118" width="38" height="12" rx="4" fill={C.indigo} />
      <circle cx="232" cy="176" r="10" fill={C.amber} />
      <circle cx="250" cy="164" r="10" fill={C.amber} />
      <circle cx="240" cy="150" r="10" fill={C.amberSoft} stroke={C.amber} strokeWidth="3" />
      <path
        d="M62 198 C62 170 70 152 84 140"
        stroke={C.primaryDeep}
        strokeWidth="4"
        fill="none"
        strokeLinecap="round"
      />
      <ellipse cx="74" cy="150" rx="16" ry="8" transform="rotate(-35 74 150)" fill={C.primary} />
      <ellipse cx="88" cy="168" rx="14" ry="7" transform="rotate(25 88 168)" fill={C.primary} />
      <rect x="48" y="196" width="30" height="20" rx="4" fill={C.amber} />
    </Frame>
  );
}

/** Onboarding 1: money in and money out. */
export function TrackIllustration({ className }: { className?: string }) {
  return (
    <Frame {...(className ? { className } : {})}>
      <rect
        x="84"
        y="48"
        width="152"
        height="160"
        rx="16"
        fill={C.card}
        stroke={C.line}
        strokeWidth="3"
      />
      {[0, 1, 2, 3].map((i) => (
        <g key={i} transform={`translate(0 ${i * 36})`}>
          <circle
            cx="110"
            cy="80"
            r="12"
            fill={i === 0 ? C.primarySoft : i === 2 ? C.indigoSoft : C.amberSoft}
          />
          <path
            d={i === 0 ? 'M104 86 L116 74 M106 74 H116 V84' : 'M104 74 L116 86 M106 86 H116 V76'}
            stroke={i === 0 ? C.primaryDeep : i === 2 ? C.indigo : C.amber}
            strokeWidth="3"
            fill="none"
            strokeLinecap="round"
          />
          <rect x="132" y="72" width="52" height="7" rx="3.5" fill={C.line} />
          <rect x="132" y="84" width="34" height="6" rx="3" fill={C.line} />
          <rect
            x="194"
            y="74"
            width="28"
            height="10"
            rx="4"
            fill={i === 0 ? C.primaryDeep : C.ink}
          />
        </g>
      ))}
    </Frame>
  );
}

/** Onboarding 2: daily, weekly and monthly patterns. */
export function PatternsIllustration({ className }: { className?: string }) {
  return (
    <Frame {...(className ? { className } : {})}>
      <rect
        x="64"
        y="56"
        width="192"
        height="140"
        rx="16"
        fill={C.card}
        stroke={C.line}
        strokeWidth="3"
      />
      {[40, 64, 52, 88, 70, 100].map((h, i) => (
        <rect
          key={i}
          x={86 + i * 26}
          y={176 - h}
          width="16"
          height={h}
          rx="4"
          fill={i === 5 ? C.primaryDeep : C.primary}
        />
      ))}
      <path
        d="M86 132 C120 110 150 140 180 112 S230 96 244 88"
        stroke={C.indigo}
        strokeWidth="3"
        strokeDasharray="6 6"
        fill="none"
      />
      <circle cx="244" cy="88" r="7" fill={C.indigo} />
      <rect x="84" y="70" width="60" height="10" rx="5" fill={C.line} />
    </Frame>
  );
}

/** Onboarding 3: saving together toward one goal. */
export function TogetherIllustration({ className }: { className?: string }) {
  return (
    <Frame {...(className ? { className } : {})}>
      <circle cx="112" cy="92" r="22" fill={C.primaryDeep} />
      <path d="M76 176 C76 140 148 140 148 176 Z" fill={C.primary} />
      <circle cx="208" cy="92" r="22" fill={C.indigo} />
      <path
        d="M172 176 C172 140 244 140 244 176 Z"
        fill={C.indigoSoft}
        stroke={C.indigo}
        strokeWidth="3"
      />
      <rect
        x="130"
        y="150"
        width="60"
        height="58"
        rx="14"
        fill={C.amberSoft}
        stroke={C.amber}
        strokeWidth="3"
      />
      <rect x="138" y="142" width="44" height="12" rx="4" fill={C.amber} />
      <path
        d="M160 170 C154 162 144 168 150 176 L160 186 L170 176 C176 168 166 162 160 170 Z"
        fill={C.primaryDeep}
      />
    </Frame>
  );
}
