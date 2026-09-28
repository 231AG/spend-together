// Money is integer minor units (CLAUDE.md). This rule catches the three ways a float
// sneaks in: parsing a money value as a float, multiplying/dividing it by a fractional
// literal, and formatting it with toFixed (which rounds through a float). The API's
// display-only `formatted` string counts as money too: clients never parse it (§10.1).

const MONEY_NAME =
  /(^amount|amount$|^balance|balance$|_minor$|Minor$|^price|price$|^total|total$|^formatted$)/i;
const PARSERS = new Set(['parseFloat', 'Number']);

/** The trailing identifier of an expression: `a.b.amountMinor` -> "amountMinor". */
function nameOf(node) {
  if (!node) return null;
  if (node.type === 'Identifier') return node.name;
  if (node.type === 'MemberExpression' && !node.computed && node.property.type === 'Identifier') {
    return node.property.name;
  }
  if (node.type === 'TSNonNullExpression' || node.type === 'TSAsExpression')
    return nameOf(node.expression);
  // Look through `String(x)` and `x.toString()`, which only delay the float parse.
  if (node.type === 'CallExpression') {
    const c = node.callee;
    if (c.type === 'Identifier' && c.name === 'String') return nameOf(node.arguments[0]);
    if (
      c.type === 'MemberExpression' &&
      c.property.type === 'Identifier' &&
      c.property.name === 'toString'
    ) {
      return nameOf(c.object);
    }
  }
  return null;
}

const isMoney = (node) => {
  const name = nameOf(node);
  return name !== null && MONEY_NAME.test(name);
};

const isFractionalLiteral = (node) =>
  node.type === 'Literal' && typeof node.value === 'number' && !Number.isInteger(node.value);

/** @type {import('eslint').Rule.RuleModule} */
export default {
  meta: {
    type: 'problem',
    docs: { description: 'Disallow float arithmetic on money values (integer minor units only).' },
    schema: [],
    messages: {
      parse:
        '`{{fn}}` on a money value. Money is integer minor units; parse with the domain money helpers.',
      fraction:
        'Fractional arithmetic on a money value. Use integer minor units, and decimal.js for exchange rates.',
      toFixed: '`toFixed` rounds through a float. Format money with the shared money formatter.',
    },
  },
  create(context) {
    return {
      CallExpression(node) {
        const callee = node.callee;
        const fn =
          callee.type === 'Identifier'
            ? callee.name
            : callee.type === 'MemberExpression' &&
                callee.object.type === 'Identifier' &&
                callee.object.name === 'Number' &&
                callee.property.type === 'Identifier'
              ? `Number.${callee.property.name}`
              : null;
        if (fn && (PARSERS.has(fn) || fn === 'Number.parseFloat') && node.arguments.some(isMoney)) {
          context.report({ node, messageId: 'parse', data: { fn } });
        }
        if (
          callee.type === 'MemberExpression' &&
          callee.property.type === 'Identifier' &&
          callee.property.name === 'toFixed' &&
          isMoney(callee.object)
        ) {
          context.report({ node, messageId: 'toFixed' });
        }
      },
      BinaryExpression(node) {
        if (!['*', '/'].includes(node.operator)) return;
        const pairs = [
          [node.left, node.right],
          [node.right, node.left],
        ];
        if (pairs.some(([a, b]) => isMoney(a) && isFractionalLiteral(b))) {
          context.report({ node, messageId: 'fraction' });
        }
      },
    };
  },
};
