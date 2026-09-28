// Components use design tokens only (CLAUDE.md, spec §18). This rule catches the literal
// ways a visual value sneaks into UI code:
//   - a hex or functional colour anywhere in a string (`#10B981`, `rgb(…)`);
//   - a Tailwind arbitrary value holding a raw number (`w-[12px]`, `z-[60]`,
//     `duration-[200ms]`); reference a token instead: `w-(--touch-min)`, `z-(--z-modal)`;
//   - a Tailwind default-palette or default-size class, which the token theme removed and
//     so would silently do nothing (`text-red-500`, `text-sm`, `shadow-md`);
//   - a static number or unit string in a `style` object (`{ width: 12 }`, `{ gap: '8px' }`).
// Dynamic values (template literals with expressions, e.g. a progress width) are allowed.

const COLOUR = /#[0-9a-f]{3,8}\b|\b(?:rgba?|hsla?|oklch|oklab|lab|lch|color)\(/i;
const ARBITRARY = /\[([^\]]+)\]/g;
const RAW_IN_ARBITRARY = /(?:^|[^\w-])-?\d*\.?\d+(?:px|rem|em|ms|s|deg|vh|vw|dvh|svh|%)?(?![\w-])/;
const DEFAULT_PALETTE =
  /(?:^|[\s:])-?(?:bg|text|border|ring|fill|stroke|from|to|via|outline|decoration|divide|accent|caret|placeholder|shadow)-(?:slate|gray|zinc|stone|red|orange|amber|yellow|lime|green|emerald|teal|cyan|sky|blue|indigo|violet|purple|fuchsia|pink|rose|black|white)(?:-\d{2,3})?(?:\/\d+)?(?=$|[\s])/;
const DEFAULT_SIZES =
  /(?:^|[\s:])(?:text-(?:xs|sm|base|lg|[2-9]?xl)|shadow(?:-(?:2xs|xs|sm|md|lg|xl|2xl))?|rounded(?:-(?:xs|2xl|3xl|4xl))?|font-(?:thin|extralight|light|normal|medium|semibold|bold|extrabold|black)|z-\d+|duration-\d+|delay-\d+)(?=$|[\s])/;

function problemsIn(text) {
  const found = [];
  if (COLOUR.test(text)) found.push('colour');
  for (const [, inner] of text.matchAll(ARBITRARY)) {
    const value = inner.replace(/^[\w-]+:/, ''); // `[length:…]` type hints
    if (/^(?:var\(|--)/.test(value)) continue;
    if (/^[\d_]*fr(?:_\d*fr)*$|^\d+fr/.test(value)) continue; // grid fractions are layout, not tokens
    if (RAW_IN_ARBITRARY.test(value)) found.push('arbitrary');
  }
  if (DEFAULT_PALETTE.test(text) || DEFAULT_SIZES.test(text)) found.push('tailwindDefault');
  return found;
}

function isStyleObject(node) {
  const parent = node.parent;
  return (
    parent?.type === 'JSXExpressionContainer' &&
    parent.parent?.type === 'JSXAttribute' &&
    parent.parent.name.name === 'style'
  );
}

/** @type {import('eslint').Rule.RuleModule} */
export default {
  meta: {
    type: 'problem',
    docs: {
      description: 'Disallow hard-coded colours, sizes, radii, durations and z-indexes in UI code.',
    },
    schema: [],
    messages: {
      colour:
        'Hard-coded colour. Use a colour token (e.g. `text-fg-default`, `var(--money-income)`).',
      arbitrary:
        'Raw value in a Tailwind arbitrary class. Reference a token instead, e.g. `w-(--touch-min)` or `z-(--z-modal)`.',
      tailwindDefault:
        "Tailwind default class. The token theme removed Tailwind's palette and scales; use a token class (e.g. `type-body-sm`, `shadow-elev-2`).",
      style: 'Static value in a style object. Use a token class or `var(--token)`.',
    },
  },
  create(context) {
    function checkText(node, text) {
      for (const messageId of new Set(problemsIn(text))) context.report({ node, messageId });
    }
    return {
      Literal(node) {
        if (typeof node.value === 'string') checkText(node, node.value);
      },
      TemplateElement(node) {
        checkText(node, node.value.cooked ?? '');
      },
      ObjectExpression(node) {
        if (!isStyleObject(node)) return;
        for (const prop of node.properties) {
          if (prop.type !== 'Property') continue;
          const v = prop.value;
          const staticNumber = v.type === 'Literal' && typeof v.value === 'number' && v.value !== 0;
          const staticUnit =
            v.type === 'Literal' &&
            typeof v.value === 'string' &&
            !/^var\(--[\w-]+\)$/.test(v.value) &&
            /\d/.test(v.value);
          if (staticNumber || staticUnit) context.report({ node: v, messageId: 'style' });
        }
      },
    };
  },
};
