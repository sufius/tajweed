// usage examples:
//   node scripts/merge-arabis.js
//   node scripts/merge-arabis.js --file 027.json
//   node scripts/merge-arabis.js 027.json
//   node scripts/merge-arabis.js --densedDir public/surat/densed --segmentedDir public/surat/segmented/de/27 --file 027.json

const fs = require('fs');
const path = require('path');

// --- small arg parser (no deps) ---
function parseArgs(argv) {
  const out = { _: [] };
  for (let i = 2; i < argv.length; i++) {
    const a = argv[i];
    if (a.startsWith('--')) {
      const [k, v] = a.slice(2).split('=');
      if (v !== undefined) out[k] = v;
      else if (i + 1 < argv.length && !argv[i + 1].startsWith('-')) out[k] = argv[++i];
      else out[k] = true;
    } else {
      out._.push(a);
    }
  }
  return out;
}

const args = parseArgs(process.argv);

// Resolve a path relative to CWD first (project root), then fallback to script dir.
function resolveFromCwdOrScript(...parts) {
  const p1 = path.resolve(process.cwd(), ...parts);
  if (fs.existsSync(p1)) return p1;
  const p2 = path.resolve(__dirname, ...parts);
  return p2;
}

// Defaults (work from root or script dir)
const defaultDensedDir    = resolveFromCwdOrScript('public', 'surat', 'densed');
const defaultSegmentedDir = resolveFromCwdOrScript('public', 'surat', 'segmented', 'de', '27');

// Allow overrides
const densedDir    = args.densedDir    ? resolveFromCwdOrScript(args.densedDir)    : defaultDensedDir;
const segmentedDir = args.segmentedDir ? resolveFromCwdOrScript(args.segmentedDir) : defaultSegmentedDir;

// Single file support: --file foo.json OR positional foo.json
const singleFile = args.file || (args._[0] || '').trim();

// --- helpers ---
function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

function getDensedArrayRef(json) {
  if (Array.isArray(json)) return { kind: 'array', ref: json };
  if (json && Array.isArray(json.verses)) return { kind: 'object', ref: json.verses };
  return { kind: 'none', ref: null };
}

// Keep insertion order: verse_number, arabic, arabis (if present), then rest
function insertArabisAfterArabic(verseObj, arabisValue) {
  const { verse_number, arabic, ...rest } = verseObj || {};
  const out = {};
  if (verse_number !== undefined) out.verse_number = verse_number;
  if (arabic !== undefined) out.arabic = arabic;
  out.arabis = arabisValue; // insert only when different (checked earlier)
  for (const k of Object.keys(rest)) out[k] = rest[k];
  return out;
}

function processOneFile(file) {
  const densedPath    = path.join(densedDir, file);
  const segmentedPath = path.join(segmentedDir, file);

  if (!fs.existsSync(densedPath)) {
    console.warn(`Densed fehlt: ${file} – übersprungen.`);
    return;
  }
  if (!fs.existsSync(segmentedPath)) {
    console.warn(`Kein segmented für ${file} gefunden – übersprungen.`);
    return;
  }

  // Read segmented; group arabic per verse_number
  let segmented;
  try {
    segmented = readJson(segmentedPath);
    if (!Array.isArray(segmented)) {
      console.warn(`Übersprungen (segmented ist kein Array): ${file}`);
      return;
    }
  } catch (e) {
    console.error(`Fehler beim Lesen/Parsen segmented ${file}:`, e.message);
    return;
  }

  const groupedArabic = new Map();
  for (const seg of segmented) {
    const vn = seg?.verse_number;
    if (!Number.isFinite(vn)) continue;
    if (!groupedArabic.has(vn)) groupedArabic.set(vn, []);
    groupedArabic.get(vn).push(seg.arabic || '');
  }

  const joinedByVerse = new Map();
  groupedArabic.forEach((arr, vn) => {
    joinedByVerse.set(vn, arr.join('')); // join with space
  });

  // Read densed
  let densedJson;
  try {
    densedJson = readJson(densedPath);
  } catch (e) {
    console.error(`Fehler beim Lesen/Parsen densed ${file}:`, e.message);
    return;
  }

  const { kind, ref: densedArr } = getDensedArrayRef(densedJson);
  if (kind === 'none' || !densedArr) {
    console.warn(`Übersprungen (densed ist weder Array noch {verses:[]}): ${file}`);
    return;
  }

  let changed = false;

  // Compare and set arabis when different
  for (let i = 0; i < densedArr.length; i++) {
    const v = densedArr[i];
    const vn = v?.verse_number;
    if (!Number.isFinite(vn)) continue;

    const joined = joinedByVerse.get(vn);
    if (!joined) continue;

    const arabicOriginal = v?.arabic ?? '';
    if (joined !== arabicOriginal) {
      densedArr[i] = insertArabisAfterArabic(v, joined);
      changed = true;
    }
  }

//   console.log('densedJson', densedJson);
  if (changed) {
    try {
      fs.writeFileSync(densedPath, JSON.stringify(densedJson, null, 2), 'utf8');
      console.log(`Aktualisiert (mit arabis): ${file}`);
    } catch (e) {
      console.error(`Fehler beim Schreiben ${file}:`, e.message);
    }
  } else {
    console.log(`OK (keine Abweichung): ${file}`);
  }
}

// --- entry point ---
(function main() {
  // Validate dirs
  if (!fs.existsSync(densedDir) || !fs.statSync(densedDir).isDirectory()) {
    console.error('Ungültiges densed-Verzeichnis:', densedDir);
    process.exit(1);
  }
  if (!fs.existsSync(segmentedDir) || !fs.statSync(segmentedDir).isDirectory()) {
    console.error('Ungültiges segmented-Verzeichnis:', segmentedDir);
    process.exit(1);
  }

  if (singleFile) {
    // allow either bare name (e.g. 027.json) or a path; normalize to filename
    const fileName = path.basename(singleFile);
    processOneFile(fileName);
    return;
  }

  // No file given: process every .json in densedDir
  fs.readdir(densedDir, (err, files) => {
    if (err) {
      console.error('Fehler beim Lesen des densed-Verzeichnisses:', err);
      process.exit(1);
    }
    files
      .filter(f => path.extname(f) === '.json')
      .forEach(processOneFile);
  });
})();
