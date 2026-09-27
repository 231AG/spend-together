// Time is injected (CLAUDE.md, repo-structure.md). Reading the wall clock anywhere but
// the clock module makes period and pace logic untestable, so `new Date()` with no
// arguments and `Date.now()` are banned outside the allow-listed files. Constructing a
// date from a value (`new Date(iso)`) is fine: that is parsing, not reading the clock.

/** @type {import('eslint').Rule.RuleModule} */
export default {
  meta: {
    type: 'problem',
    docs: { description: 'Disallow reading the wall clock outside the injectable clock.' },
    schema: [
      {
        type: 'object',
        properties: { allow: { type: 'array', items: { type: 'string' } } },
        additionalProperties: false,
      },
    ],
    messages: {
      ambient:
        'Reading the wall clock here makes time untestable. Take a `Clock` and call `clock.now()`.',
    },
  },
  create(context) {
    const allow = context.options[0]?.allow ?? [];
    const file = context.filename.replaceAll('\\', '/');
    if (allow.some((suffix) => file.endsWith(suffix))) return {};
    const isDate = (node) => node.type === 'Identifier' && node.name === 'Date';
    return {
      NewExpression(node) {
        if (isDate(node.callee) && node.arguments.length === 0) {
          context.report({ node, messageId: 'ambient' });
        }
      },
      CallExpression(node) {
        const c = node.callee;
        if (
          c.type === 'MemberExpression' &&
          isDate(c.object) &&
          c.property.type === 'Identifier' &&
          c.property.name === 'now'
        ) {
          context.report({ node, messageId: 'ambient' });
        }
      },
    };
  },
};
