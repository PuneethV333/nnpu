/**
 * CSS side-effect imports need a module declaration, or TypeScript 6 fails
 * them with TS2882 ("Cannot find module or type declarations for side-effect
 * import").
 *
 * This file exists because the declaration that normally covers it does not
 * reach CI. `expo/types/global.d.ts` declares `*.css`, but the only thing
 * pulling it in is the triple-slash reference in `expo-env.d.ts` — and that
 * file is gitignored by the Expo template and regenerated locally by any
 * `expo` command. So `npx tsc` passes on a developer machine and fails on a
 * fresh `npm ci`, with no local action able to reproduce it.
 *
 * Declaring it here instead makes the project self-sufficient: it no longer
 * depends on a generated file that only exists on machines that have run the
 * Expo CLI. Keep `expo-env.d.ts` ignored — it is regenerated on demand and
 * should not be committed.
 */
declare module '*.css';