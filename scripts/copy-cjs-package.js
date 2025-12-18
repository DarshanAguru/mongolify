/**
 * Script: scripts/copy-cjs-package.js
 *
 * Purpose:
 * In an ESM project (root package.json has `"type": "module"`), Node will treat
 * all files as ES Modules by default. However, your `dist/cjs` output must be
 * treated as **CommonJS** for consumers using `require(...)`. This script
 * writes a small `package.json` file inside `dist/cjs` with:
 *
 *   { "type": "commonjs" }
 *
 * That forces Node to interpret files in `dist/cjs` as CJS—even though the root
 * package is ESM. You typically run this as part of your build pipeline:
 *
 *   "build:cjs": "tsc -p tsconfig.cjs.json && node scripts/copy-cjs-package.js"
 *
 * Notes:
 * - Uses `node:fs/promises` for async/await file operations.
 * - Uses ESM-friendly `import.meta.url` and `fileURLToPath` to get __dirname.
 * - Emits informative logs and exits with code 1 on failure.
 */

import { writeFile } from 'node:fs/promises';
import { dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

// __dirname equivalent for ESM modules:
// `import.meta.url` is the URL of this file; convert it to a filesystem path.
const __dirname = dirname(fileURLToPath(import.meta.url));

// The JSON content to be written into dist/cjs/package.json.
// Setting `"type": "commonjs"` ensures Node treats this directory as CJS.
const pkg = {
  type: 'commonjs',
};

// Resolve the output path relative to this script:
// scripts/copy-cjs-package.js → ../dist/cjs/package.json
const outPath = `${__dirname}/../dist/cjs/package.json`;

// Write the file; log success, otherwise print error and exit(1)
/* eslint-disable no-console */
await writeFile(outPath, JSON.stringify(pkg, null, 2), 'utf-8')
  .then(() => console.log('Wrote dist/cjs/package.json -> {"type":"commonjs"}'))
  .catch((e) => {
    console.error('Failed to write dist/cjs/package.json', e);
    process.exit(1);
  });
