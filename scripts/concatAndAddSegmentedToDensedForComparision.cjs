const fs = require('fs');
const path = require('path');

// Pfade anpassen
const densedDir    = path.join(__dirname, '../public/surat/densed');
const segmentedDir = path.join(__dirname, '../public/surat/segmented/de/27');

// JSON lesen
function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

// Densed kann Array oder { verses: [...] } sein
function getDensedArrayRef(json) {
  if (Array.isArray(json)) return { kind: 'array', ref: json };
  if (json && Array.isArray(json.verses)) return { kind: 'object', ref: json.verses };
  return { kind: 'none', ref: null };
}

// Objekt mit Einfüge-Reihenfolge bauen:
// verse_number, arabic, (optional arabis), ...rest
function insertArabisAfterArabic(verseObj, arabisValue) {
  const { verse_number, arabic, ...rest } = verseObj || {};
  const out = {};
  if (verse_number !== undefined) out.verse_number = verse_number;
  if (arabic !== undefined) out.arabic = arabic;
  // Nur einfügen, wenn abweichend
  out.arabis = arabisValue;
  // restliche Felder hinten anhängen (Reihenfolge danach egal)
  for (const k of Object.keys(rest)) out[k] = rest[k];
  return out;
}

fs.readdir(densedDir, (err, files) => {
  if (err) {
    console.error('Fehler beim Lesen des densed-Verzeichnisses:', err);
    process.exit(1);
  }

  files
    .filter(f => path.extname(f) === '.json')
    .forEach(file => {
      const densedPath    = path.join(densedDir, file);
      const segmentedPath = path.join(segmentedDir, file);

      if (!fs.existsSync(segmentedPath)) {
        console.warn(`Kein segmented für ${file} gefunden – übersprungen.`);
        return;
      }

      // segmented lesen und je Vers zusammenfügen (mit Leerzeichen)
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

      const groupedArabic = new Map(); // vn -> [arabic...]
      for (const seg of segmented) {
        const vn = seg?.verse_number;
        if (!Number.isFinite(vn)) continue;
        if (!groupedArabic.has(vn)) groupedArabic.set(vn, []);
        groupedArabic.get(vn).push(seg.arabic || '');
      }

      const joinedByVerse = new Map(); // vn -> "arabic1 arabic2 ..."
      groupedArabic.forEach((arr, vn) => {
        joinedByVerse.set(vn, arr.join(' ')); // mit Leerzeichen
      });

      // densed lesen
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

      // pro Vers prüfen und ggf. arabis hinzufügen (nur wenn abweichend)
      for (let i = 0; i < densedArr.length; i++) {
        const v = densedArr[i];
        const vn = v?.verse_number;
        if (!Number.isFinite(vn)) continue;

        const joined = joinedByVerse.get(vn);
        if (!joined) continue; // keine Segmente für diesen Vers vorhanden

        // Exakter Stringvergleich (ohne Normalisierung)
        const arabicOriginal = v?.arabic ?? '';
        if (joined !== arabicOriginal) {
          // arabis nur setzen, wenn wirklich unterschiedlich
          densedArr[i] = insertArabisAfterArabic(v, joined);
          changed = true;
        }
      }

      // zurückschreiben nur wenn geändert
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
    });
});
