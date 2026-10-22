/**
 * lint-staged execs each command directly — no shell — so a bare
 * `cd backend && eslint` fails with ENOENT, and running eslint from the root
 * fails because flat config is looked up from the working directory. Hence the
 * explicit `bash -c`, which also lets the staged paths (root-relative) be
 * rewritten with `${@#<dir>/}` rather than passed through unchanged.
 *
 * Each file is JSON-quoted individually: an unquoted path with a space would
 * split into two arguments and eslint would fail on a file that does not exist.
 */
const runIn = (dir) => (files) => {
  const quoted = files.map((file) => JSON.stringify(file)).join(' ');
  return `bash -c 'cd ${dir} && exec npx eslint --fix "\${@#${dir}/}"' -- ${quoted}`;
};

export default {
  // Backend: eslint also carries prettier/prettier, which is the rule that
  // failed CI on fees.service.spec.ts after it was committed unformatted.
  'backend/**/*.ts': runIn('backend'),

  // App: same idea, driven by `expo lint`'s eslint config.
  'app/**/*.{ts,tsx,js,jsx,mjs}': runIn('app'),
};
