// Build script: typecheck TS sources, then bundle src/main.ts -> dist/app.js (IIFE).
// The bundle is a plain script so index.html works from file:// with no server.
import { build, context } from 'esbuild';
import { spawnSync } from 'node:child_process';
import { mkdirSync, copyFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const watch = process.argv.includes('--watch');

const common = {
  bundle: true, format: 'iife', target: 'es2020',
  minify: false, sourcemap: false, charset: 'utf8',
  legalComments: 'none', logLevel: 'info',
};
const options = {
  ...common,
  entryPoints: [join(root, 'src', 'main.ts')],
  outfile: join(root, 'dist', 'app.js'),
};
// Core-only bundle: exposes window.WMCore for Node unit tests (no DOM needed).
const coreEntry = join(root, 'src', 'core-entry.ts');
const coreOptions = {
  ...common,
  entryPoints: [coreEntry],
  outfile: join(root, 'dist', 'core.js'),
};

function typecheck() {
  const tsc = join(root, 'node_modules', 'typescript', 'bin', 'tsc');
  const r = spawnSync(process.execPath, [tsc, '--noEmit'], { cwd: root, stdio: 'inherit' });
  if (r.status !== 0) throw new Error('TypeScript typecheck failed');
  console.log('typecheck: OK');
}
function prepare() {
  mkdirSync(join(root, 'dist'), { recursive: true });
  // CSS is copied so dist/ holds a complete static site.
  copyFileSync(join(root, 'src', 'style.css'), join(root, 'dist', 'style.css'));
}

if (watch) {
  const ctx = await context(options);
  await ctx.watch();
  console.log('watching src/**/*.ts ...');
} else {
  typecheck();
  prepare();
  await build(options);
  await build(coreOptions);
  console.log('built dist/app.js + dist/core.js');
}
