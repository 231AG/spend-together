// Enforces the import rule in docs/plans/00-shared/repo-structure.md:
//
//   apps/web/server     may not import apps/web/components
//   apps/web/components may not import apps/web/server
//   packages/schemas    may import nothing but zod (and its own files)
//   packages/domain     may import nothing but decimal.js and date-fns-tz (and its own files)
//
// The purity rule covers production source (`src/`, excluding `*.test.ts`); test and
// tooling files in those packages may use test and build dependencies.
//
// Paths are compared relative to the repo root, which is the ESLint working directory.
import path from 'node:path';

const PURE = {
  'packages/domain/': new Set(['decimal.js', 'date-fns-tz']),
  'packages/schemas/': new Set(['zod']),
};

/** Resolve an import specifier to a repo-relative path, or null for a bare package. */
function resolveLocal(specifier, fromFile, root) {
  if (specifier.startsWith('@/')) return `apps/web/${specifier.slice(2)}`;
  if (specifier.startsWith('.')) {
    return path
      .relative(root, path.resolve(path.dirname(fromFile), specifier))
      .replaceAll('\\', '/');
  }
  return null;
}

/** Package name of a bare specifier: "@scope/pkg/sub" -> "@scope/pkg", "pkg/sub" -> "pkg". */
function packageName(specifier) {
  const parts = specifier.split('/');
  return specifier.startsWith('@') ? parts.slice(0, 2).join('/') : parts[0];
}

/** @type {import('eslint').Rule.RuleModule} */
export default {
  meta: {
    type: 'problem',
    docs: { description: 'Enforce the layer boundaries between packages and app folders.' },
    schema: [],
    messages: {
      layer: '`{{from}}` may not import from `{{to}}` (see repo-structure.md).',
      pure: '`{{pkg}}` must stay pure; `{{specifier}}` is not an allowed dependency.',
      escape: '`{{pkg}}` may only import its own files; `{{specifier}}` leaves the package.',
    },
  },
  create(context) {
    const root = context.cwd;
    const file = path.relative(root, context.filename).replaceAll('\\', '/');

    function check(node, specifier) {
      if (typeof specifier !== 'string') return;

      for (const [pkg, allowed] of Object.entries(PURE)) {
        if (!file.startsWith(`${pkg}src/`) || /\.test\.tsx?$/.test(file)) continue;
        const local = resolveLocal(specifier, context.filename, root);
        if (local === null) {
          const name = packageName(specifier);
          if (!allowed.has(name))
            context.report({ node, messageId: 'pure', data: { pkg, specifier } });
        } else if (!local.startsWith(pkg)) {
          context.report({ node, messageId: 'escape', data: { pkg, specifier } });
        }
        return;
      }

      const target = resolveLocal(specifier, context.filename, root);
      if (target === null) return;
      const banned = [
        ['apps/web/server/', 'apps/web/components/'],
        ['apps/web/components/', 'apps/web/server/'],
      ];
      for (const [from, to] of banned) {
        if (file.startsWith(from) && (target.startsWith(to) || `${target}/` === to)) {
          context.report({ node, messageId: 'layer', data: { from, to } });
        }
      }
    }

    return {
      ImportDeclaration: (node) => check(node, node.source.value),
      ExportNamedDeclaration: (node) => node.source && check(node, node.source.value),
      ExportAllDeclaration: (node) => check(node, node.source.value),
      ImportExpression: (node) => node.source.type === 'Literal' && check(node, node.source.value),
    };
  },
};
