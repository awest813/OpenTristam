import { readdir, readFile, stat } from 'node:fs/promises';
import path from 'node:path';
import zlib from 'node:zlib';

const rootDir = process.cwd();
const assetsDir = path.join(rootDir, 'build', 'assets');

function readBudget(name, fallbackBytes) {
  const raw = process.env[name];
  if (!raw) {
    return fallbackBytes;
  }
  const parsed = Number(raw);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallbackBytes;
}

const budgets = {
  mainJsGzip: readBudget('BUNDLE_BUDGET_MAIN_JS_GZIP_BYTES', 190 * 1024),
  totalJsGzip: readBudget('BUNDLE_BUDGET_TOTAL_JS_GZIP_BYTES', 220 * 1024),
  totalCssGzip: readBudget('BUNDLE_BUDGET_TOTAL_CSS_GZIP_BYTES', 12 * 1024),
  totalWasmGzip: readBudget('BUNDLE_BUDGET_TOTAL_WASM_GZIP_BYTES', 980 * 1024),
};

function formatBytes(bytes) {
  return `${(bytes / 1024).toFixed(2)} KiB`;
}

async function collectAssets() {
  const entries = await readdir(assetsDir, {withFileTypes: true});
  const files = [];
  for (const entry of entries) {
    if (!entry.isFile()) continue;
    const absolutePath = path.join(assetsDir, entry.name);
    const content = await readFile(absolutePath);
    files.push({
      name: entry.name,
      absolutePath,
      rawBytes: content.byteLength,
      gzipBytes: zlib.gzipSync(content, {level: 9}).byteLength,
    });
  }
  return files;
}

function sumBytes(files) {
  return files.reduce((sum, file) => sum + file.gzipBytes, 0);
}

function logMetric(title, value, limit, status) {
  const badge = status ? 'PASS' : 'FAIL';
  console.log(`${badge.padEnd(5)} ${title.padEnd(24)} ${formatBytes(value).padStart(12)} / ${formatBytes(limit)}`);
}

async function main() {
  let assetsStats;
  try {
    await stat(assetsDir);
    assetsStats = await collectAssets();
  } catch (error) {
    console.error(`[bundle-budget] Could not read assets directory: ${assetsDir}`);
    console.error('[bundle-budget] Run "npm run build" before this check.');
    process.exit(1);
  }

  const jsFiles = assetsStats.filter(file => file.name.endsWith('.js'));
  const cssFiles = assetsStats.filter(file => file.name.endsWith('.css'));
  const wasmFiles = assetsStats.filter(file => file.name.endsWith('.wasm'));
  const mainJs = jsFiles.find(file => /^main-.*\.js$/.test(file.name));

  if (!mainJs) {
    console.error('[bundle-budget] Could not locate the main JS chunk (expected name pattern: main-*.js).');
    process.exit(1);
  }

  const checks = [
    {
      title: 'Main JS chunk (gzip)',
      value: mainJs.gzipBytes,
      limit: budgets.mainJsGzip,
    },
    {
      title: 'Total JS (gzip)',
      value: sumBytes(jsFiles),
      limit: budgets.totalJsGzip,
    },
    {
      title: 'Total CSS (gzip)',
      value: sumBytes(cssFiles),
      limit: budgets.totalCssGzip,
    },
    {
      title: 'Total WASM (gzip)',
      value: sumBytes(wasmFiles),
      limit: budgets.totalWasmGzip,
    },
  ];

  console.log('[bundle-budget] Evaluating compressed bundle sizes:\n');
  let hasFailure = false;
  for (const check of checks) {
    const pass = check.value <= check.limit;
    hasFailure = hasFailure || !pass;
    logMetric(check.title, check.value, check.limit, pass);
  }

  console.log('\n[bundle-budget] Main chunk:', `${mainJs.name} (${formatBytes(mainJs.gzipBytes)} gzip)`);
  if (hasFailure) {
    console.error('\n[bundle-budget] One or more budgets were exceeded.');
    process.exit(1);
  }

  console.log('\n[bundle-budget] All budgets are within limits.');
}

main();
