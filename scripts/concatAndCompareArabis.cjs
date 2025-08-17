// usage examples:
//   node merge-arabis.js
//   node merge-arabis.js --file 027.json
//   node merge-arabis.js 027.json
//   node merge-arabis.js --densedDir public/surat/densed --segmentedDir public/surat/segmented/de/27 --file 027.json

const fs = require('fs');
const path = require('path');

// Projekt-Root ist immer eine Ebene über diesem Script-Ordner
const projectRoot = path.resolve(__dirname, '..');

// Defaults relativ zum Projekt-Root
const defaultDensedDir    = path.join(projectRoot, 'public', 'surat', 'densed');
const defaultSegmentedDir = path.join(projectRoot, 'public', 'surat', 'segmented', 'de', '27');

// Kleine Argument-Parser
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

// Verzeichnisse (mit Override möglich)
const densedDir    = args.densedDir    ? path.resolve(projectRoot, args.densedDir)    : defaultDensedDir;
const segmentedDir = args.segmentedDir ? path.resolve(projectRoot, args.segmentedDir) : defaultSegmentedDir;

// Einzeldatei optional (--file oder erster Parameter)
const singleFile = args.file || (args._[0] || '').trim();

// ---- Hilfsfunktionen (gleich wie vorher) ----
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
    console.error(`Fehler beim Lesen segmented ${file}:`, e.message);
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
  groupedArabic.forEach((arr, vn) => joinedByVerse.set(vn, arr.join(' ')));

  // Read densed
  let densedJson;
  try {
    densedJson = readJson(densedPath);
  } catch (e) {
    console.error(`Fehler beim Lesen densed ${file}:`, e.message);
    return;
  }

  const { ref: densedArr } = getDensedArrayRef(densedJson) || {};
  if (!densedArr) {
    console.warn(`Übersprungen (densed ist nicht gültig): ${file}`);
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
    if (joined !== (v?.arabic ?? '')) {
      densedArr[i] = insertArabisAfterArabic(v, joined);
      changed = true;
    }
  }

  if (changed) {
    fs.writeFileSync(densedPath, JSON.stringify(densedJson, null, 2), 'utf8');
    console.log(`Aktualisiert (mit arabis): ${file}`);
  } else {
    console.log(`OK (keine Abweichung): ${file}`);
  }
}

// --- entry point ---
(function main() {
  if (singleFile) {
    processOneFile(path.basename(singleFile));
  } else {
    const files = fs.readdirSync(densedDir).filter(f => f.endsWith('.json'));
    files.forEach(processOneFile);
  }
})();
