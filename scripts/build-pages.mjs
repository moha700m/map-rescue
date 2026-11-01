#!/usr/bin/env node
/**
 * Builds a fully static export suitable for GitHub Pages.
 *
 * Next.js static export cannot contain Route Handlers, so the `app/api`
 * directory is temporarily moved aside during the build and restored after.
 * The static build runs in "direct" AI mode: the browser talks to OpenRouter
 * with a locally stored key (fine for a personal preview; use the server build
 * on Vercel for production where the key stays server-side).
 */
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const apiDir = path.join(root, 'app', 'api');
const stash = path.join(root, '.api-stash');
const basePath = process.env.PAGES_BASE_PATH ?? '/map-rescue';

function move(from, to) {
  if (fs.existsSync(from)) fs.renameSync(from, to);
}

let movedApi = false;
if (fs.existsSync(apiDir)) {
  fs.rmSync(stash, { recursive: true, force: true });
  move(apiDir, stash);
  movedApi = true;
}

const result = spawnSync('npx', ['next', 'build'], {
  stdio: 'inherit',
  env: {
    ...process.env,
    NEXT_EXPORT: '1',
    PAGES_BASE_PATH: basePath,
    NEXT_PUBLIC_BASE_PATH: basePath,
    NEXT_PUBLIC_DEMO_DATA: '1',
    NEXT_PUBLIC_STATIC_EXPORT: '1',
    NEXT_PUBLIC_APP_URL: `https://moha700m.github.io${basePath}`,
  },
});

if (movedApi) move(stash, apiDir);

if (result.status !== 0) {
  console.error('\n✗ Static build failed.');
  process.exit(result.status ?? 1);
}

const out = path.join(root, 'out');
if (fs.existsSync(out)) {
  fs.writeFileSync(path.join(out, '.nojekyll'), '');
  const notFound = path.join(out, '404.html');
  if (!fs.existsSync(notFound) && fs.existsSync(path.join(out, '404', 'index.html'))) {
    fs.copyFileSync(path.join(out, '404', 'index.html'), notFound);
  }
  console.log(`\n✓ Static export ready in ./out (basePath: ${basePath})`);
}
