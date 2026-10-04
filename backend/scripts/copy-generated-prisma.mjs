import { cpSync, existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

/**
 * Copies the generated Prisma client into the build output.
 *
 * The client is generated as plain `.js`/`.d.ts`/`.wasm` (see `output` in
 * prisma/schema.prisma), not as TypeScript, so `nest build` never emits it —
 * `allowJs` is off and there is nothing to compile. Compiled code resolves
 * `@/generated/prisma` to a relative `../generated/prisma`, i.e.
 * `dist/generated/prisma`, which therefore has to exist at runtime or the app
 * dies on boot with MODULE_NOT_FOUND.
 *
 * Kept dependency-free and cross-platform (no `cp -r`) so the same build works
 * on Render's Linux image and on a Windows dev machine.
 */

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const from = join(root, 'src', 'generated');
const to = join(root, 'dist', 'generated');

if (!existsSync(from)) {
  // Fail loudly here rather than shipping a dist that cannot boot. On Render
  // this means `prisma generate` did not run before the build.
  console.error(
    `[copy-generated-prisma] ${from} not found. Run "npm run prisma:generate" first.`,
  );
  process.exit(1);
}

cpSync(from, to, { recursive: true, force: true });
console.log('[copy-generated-prisma] src/generated -> dist/generated');