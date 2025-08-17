#!/usr/bin/env node
/**
 * Fetch Uthmani lines per surah and OVERWRITE the "arabic" property
 * in each local densed file. Order of operations for every surah:
 *   1) Read + parse local densed file
 *   2) Fetch GitHub raw text (each line = one verse)
 *   3) Insert/overwrite lines into `arabic` by verse order (1-based)
 *
 * Expected local shapes supported:
 *   A) [ { verse_number: 1, arabic: "...", ... }, ... ]
 *   B) { verses: [ { verse_number: 1, arabic: "...", ... }, ... ] }
 *
 * Usage example:
 *   node scripts/update-arabic-from-github.js \
 *     --base https://raw.githubusercontent.com/jomtek/quran-translated/e587a2c1dd3a1897c345b605116b6055880a65df/ar.uthmani \
 *     --densed ./public/densed \
 *     --start 1 --end 114
 *
 * Notes:
 * - Do NOT remove comments unless they become obsolete.
 * - This script only automates fetching + merging.
 */

const fs = require('fs');
const path = require('path');
const os = require('os');

// ---------- CLI ARGS ---------------------------------------------------------
const args = process.argv.slice(2);
function getFlag(name, fallback = null) {
  const i = args.indexOf(`--${name}`);
  return i !== -1 && args[i + 1] ? args[i + 1] : fallback;
}
function hasSwitch(name) {
  return args.includes(`--${name}`);
}

// Defaults configurable here:
const DEFAULT_BASE =
  'https://raw.githubusercontent.com/jomtek/quran-translated/e587a2c1dd3a1897c345b605116b6055880a65df/ar.uthmani';
const DEFAULT_DENSED_DIR = path.join('public', 'surat', 'densed');
const DEFAULT_START = 1;
const DEFAULT_END = 114;

const BASE_URL     = getFlag('base', DEFAULT_BASE);
const DENSED_DIR   = path.resolve(process.cwd(), getFlag('densed', DEFAULT_DENSED_DIR));
const START        = Number(getFlag('start', DEFAULT_START));
const END          = Number(getFlag('end', DEFAULT_END));
const CONCURRENCY  = Number(getFlag('concurrency', 8));
const DRY_RUN      = hasSwitch('dry-run');     // only log, don’t write
const MAKE_BACKUPS = !hasSwitch('no-backup');  // write .bak by default
// -----------------------------------------------------------------------------

// Node 18+ has global fetch; if not, uncomment below:
// const fetch = global.fetch || ((...a) => import('node-fetch').then(({default: f}) => f(...a)));

function ensureDir(p) {
  fs.mkdirSync(p, { recursive: true });
}

function surahPath(n) {
  return path.join(DENSED_DIR, `surah-${n}.json`);
}

function readJson(p) {
  const raw = fs.readFileSync(p, 'utf8');
  const clean = raw.charCodeAt(0) === 0xFEFF ? raw.slice(1) : raw; // strip BOM if any
  return JSON.parse(clean);
}

function writeJson(p, obj) {
  const data = JSON.stringify(obj, null, 2);
  fs.writeFileSync(p, data + '\n', 'utf8');
}

function backupFileIfNeeded(p) {
  if (!MAKE_BACKUPS || !fs.existsSync(p)) return;
  fs.copyFileSync(p, p + '.bak');
}

function getVersesArrayRef(json) {
  // Return a unified interface for array or { verses: [...] }
  if (Array.isArray(json)) {
    return { kind: 'array', ref: json, set(newArr) { return newArr; } };
  }
  if (json && Array.isArray(json.verses)) {
    return {
      kind: 'object',
      ref: json.verses,
      set(newArr) { json.verses = newArr; return json; }
    };
  }
  return { kind: 'none', ref: null, set(){} };
}

function normalizeLines(rawText) {
  // Normalize line endings and trim trailing spaces per line.
  const lines = rawText.replace(/\r\n?/g, '\n').split('\n');
  if (lines.length && lines[0].charCodeAt(0) === 0xFEFF) {
    lines[0] = lines[0].slice(1); // strip BOM if present
  }
  return lines.map(l => l.replace(/\s+$/, ''));
}

async function fetchWithRetry(url, attempts = 3) {
  let lastErr;
  for (let i = 1; i <= attempts; i++) {
    try {
      const res = await fetch(url, { cache: 'no-store' });
      if (!res.ok) throw new Error(`HTTP ${res.status} ${res.statusText}`);
      return await res.text();
    } catch (e) {
      lastErr = e;
      const backoff = 300 * i;
      console.warn(`⚠️  (${i}/${attempts}) ${url} -> ${e.message}; retrying in ${backoff}ms`);
      await new Promise(r => setTimeout(r, backoff));
    }
  }
  throw lastErr;
}

function mergeArabic(versesArr, newLines, surahNumber) {
  // Build quick index by verse_number for safety (1..N)
  const byVerseNumber = new Map();
  for (const v of versesArr) {
    if (v && typeof v.verse_number === 'number') {
      byVerseNumber.set(v.verse_number, v);
    }
  }

  let updated = 0;
  for (let i = 0; i < newLines.length; i++) {
    const vNum = i + 1;         // lines are 1-based verses
    const line = newLines[i];
    const rec = byVerseNumber.get(vNum);
    if (!rec) {
      console.warn(`  ⚠️  surah ${surahNumber}: verse_number ${vNum} not found in local file.`);
      continue;
    }
    rec.arabic = line;          // OVERWRITE arabic only
    updated++;
  }

  const verseCount = versesArr.filter(x => typeof x?.verse_number === 'number').length;
  if (newLines.length !== verseCount) {
    console.warn(`  ⚠️  surah ${surahNumber}: ${newLines.length} fetched lines vs ${verseCount} verse objects locally.`);
  }

  return updated;
}

async function processOneSurah(n) {
  const file = surahPath(n);
  if (!fs.existsSync(file)) {
    console.warn(`❗ surah-${n}.json missing at ${file}; skipping.`);
    return { n, skipped: true };
  }

  // 1) Read + parse local first
  let json;
  try {
    json = readJson(file);
  } catch (e) {
    console.error(`❌ Failed to read/parse ${file}: ${e.message}`);
    return { n, error: `read-parse: ${e.message}` };
  }

  const { kind, ref, set } = getVersesArrayRef(json);
  if (kind === 'none' || !Array.isArray(ref)) {
    console.error(`❌ ${file} must be an array or { verses: [...] }`);
    return { n, error: 'bad-shape' };
  }

  // 2) Fetch GitHub raw content
  const url = `${BASE_URL}/${n}`;
  let raw;
  try {
    raw = await fetchWithRetry(url);
  } catch (e) {
    console.error(`❌ Fetch failed for surah ${n}: ${e.message}`);
    return { n, error: `fetch: ${e.message}` };
  }

  // 3) Insert/overwrite lines -> arabic
  const lines = normalizeLines(raw);
  const updated = mergeArabic(ref, lines, n);

  if (DRY_RUN) {
    console.log(`🧪 [dry-run] surah-${n}: would update ${updated} verses -> ${file}`);
    return { n, updated, dryRun: true };
  }

  // Backup + write
  try {
    // backupFileIfNeeded(file);
    const outObj = set(ref);
    writeJson(file, outObj);
    console.log(`✅ surah-${n}: updated ${updated} verses -> ${file}`);
    return { n, updated };
  } catch (e) {
    console.error(`❌ Failed to write ${file}: ${e.message}`);
    return { n, error: `write: ${e.message}` };
  }
}

// Simple promise pool for concurrency
async function runPool(start, end, concurrency) {
  const todo = [];
  for (let n = start; n <= end; n++) todo.push(n);

  const results = [];
  let i = 0;

  async function worker() {
    while (i < todo.length) {
      const n = todo[i++];
      const r = await processOneSurah(n);
      results.push(r);
    }
  }

  const workers = Array.from({ length: Math.max(1, concurrency) }, worker);
  await Promise.all(workers);
  return results;
}

(async function main() {
  console.log('➡️  Base URL :', BASE_URL);
  console.log('➡️  Densed   :', DENSED_DIR);
  console.log(`➡️  Range    : ${START}..${END}`);
  console.log(`➡️  Options  : concurrency=${CONCURRENCY}, dry-run=${DRY_RUN}, backups=${MAKE_BACKUPS}`);

  ensureDir(DENSED_DIR);

  const res = await runPool(START, END, CONCURRENCY);
  const ok = res.filter(x => x && !x.error && !x.skipped);
  const skipped = res.filter(x => x && x.skipped);
  const failed = res.filter(x => x && x.error);

  console.log('—'.repeat(60));
  console.log(`✅ Updated : ${ok.length}`);
  console.log(`⚠️ Skipped: ${skipped.length}`);
  console.log(`❌ Failed : ${failed.length}`);
  if (failed.length) {
    console.log('Details:');
    for (const f of failed) console.log(`  • surah ${f.n}: ${f.error}`);
  }
})();
