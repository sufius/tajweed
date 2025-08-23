/**
 * Merge eines bestimmten Index mit dem vorherigen und Anpassen der nachfolgenden Indizes.
 *
 * Nutzung:
 *   node merge_with_previous.js --file ../public/surat/segmented/de/27/surah-18.json --index 91
 *   node merge_with_previous.js --file ./surah-18.json --index 91 --force --backup
 */

const fs = require('fs');
const path = require('path');

// --- CLI: --file ist Pflicht ---
const argFile = (() => {
  const i = process.argv.indexOf('--file');
  if (i === -1 || !process.argv[i + 1]) {
    console.error('Fehler: Bitte --file <Pfad/zur/Datei.json> angeben.');
    process.exit(1);
  }
  const p = process.argv[i + 1];
  return path.isAbsolute(p) ? p : path.join(__dirname, p);
})();

const argIndex = (() => {
  const i = process.argv.indexOf('--index');
  if (i === -1 || !process.argv[i + 1]) {
    console.error('Fehler: Bitte --index <Zahl> angeben (der Eintrag, der in den vorherigen gemerged werden soll).');
    process.exit(1);
  }
  const n = Number(process.argv[i + 1]);
  if (!Number.isFinite(n) || n <= 0) {
    console.error('Fehler: --index muss eine positive Zahl sein.');
    process.exit(1);
  }
  return n;
})();

const FORCE = process.argv.includes('--force');
const DO_BACKUP = process.argv.includes('--backup');

// --- Helpers ---
function readJson(fp) {
  try {
    return JSON.parse(fs.readFileSync(fp, 'utf8'));
  } catch (e) {
    console.error(`Lesefehler bei ${fp}:`, e.message);
    process.exit(1);
  }
}

function writeJson(fp, obj) {
  fs.writeFileSync(fp, JSON.stringify(obj, null, 2), 'utf8');
}

function makeBackup(fp) {
  const bak = fp + '.bak';
  fs.copyFileSync(fp, bak);
  console.log(`Backup erstellt: ${bak}`);
}

// Trim nur Mehrfach-Leerzeichen zu einem Space (keine Zeichen am Rand entfernen)
function collapseSpaces(s) {
  return String(s ?? '').replace(/\s{2,}/g, ' ');
}

(function main() {
  if (!fs.existsSync(argFile)) {
    console.error(`Datei nicht gefunden: ${argFile}`);
    process.exit(1);
  }

  const data = readJson(argFile);
  if (!Array.isArray(data)) {
    console.error('Die Zieldatei enthält kein Array von Objekten.');
    process.exit(1);
  }

  // Den Eintrag mit index == argIndex finden
  const currentIdx = data.findIndex(x => x && x.index === argIndex);
  if (currentIdx === -1) {
    console.error(`Kein Objekt mit index == ${argIndex} gefunden.`);
    process.exit(1);
  }

  if (currentIdx === 0) {
    console.error(`index ${argIndex} ist der erste Eintrag – kann nicht in "vorheriges" mergen.`);
    process.exit(1);
  }

  const prev = data[currentIdx - 1];
  const curr = data[currentIdx];

  // verse_number prüfen (optional)
  if (!FORCE && prev.verse_number !== curr.verse_number) {
    console.error(
      `Abbruch: verse_number unterschiedlich (${prev.verse_number} vs. ${curr.verse_number}). ` +
      `Nutze --force, um trotzdem zu mergen.`
    );
    process.exit(1);
  }

  // --- Merge-Logik ---
  const merged = { ...prev };

  // arabic_full: NICHT ändern (aus prev beibehalten)
  // translation: concat mit Space
  merged.translation = collapseSpaces([prev.translation || '', curr.translation || ''].join(' ').trim());

  // arabic: direkt aneinander hängen (keine zusätzlichen Spaces)
  merged.arabic = (prev.arabic || '') + (curr.arabic || '');

  // transcription: concat mit Space
  const tPrev = prev.transcription || '';
  const tCurr = curr.transcription || '';
  merged.transcription = collapseSpaces([tPrev, tCurr].join(' ').trim());

  // verse_number: beibehalten (normalerweise identisch)
  merged.verse_number = prev.verse_number;

  // index des gemergten bleibt der des "vorherigen"
  merged.index = prev.index;

  // In Array ersetzen
  data[currentIdx - 1] = merged;

  // Das aktuelle Element entfernen
  data.splice(currentIdx, 1);

  // Alle NACHFOLGENDEN index-Werte um -1 verschieben, die VORHERIGEN unverändert lassen
  for (let i = currentIdx; i < data.length; i++) {
    if (typeof data[i].index === 'number') {
      data[i].index = data[i].index - 1;
    } else {
      // Falls kein index-Feld vorhanden ist, setze konsistent
      data[i].index = (data[i - 1]?.index || 0) + 1;
    }
  }

  // Schreiben
  if (DO_BACKUP) makeBackup(argFile);
  writeJson(argFile, data);

  console.log(
    `Merge abgeschlossen: index ${argIndex} wurde in index ${merged.index} gemerged, ` +
    `anschließend gelöscht und Indizes angepasst.`
  );
})();
