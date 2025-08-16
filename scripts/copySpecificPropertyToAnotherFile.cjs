const fs = require('fs');
const path = require('path');

// Pfade ggf. anpassen
const densedDir    = path.join(__dirname, '../public/surat/densed');
const segmentedDir = path.join(__dirname, '../public/surat/segmented/de/27');

// JSON lesen
function readJson(fp) {
  return JSON.parse(fs.readFileSync(fp, 'utf8'));
}

// Densed kann Array oder { verses: [...] } sein -> Array-Referenz zurückgeben
function getDensedArray(json) {
  if (Array.isArray(json)) return json;
  if (json && Array.isArray(json.verses)) return json.verses;
  return null;
}

// Hilfsfunktion: arabic_full + arabic direkt nacheinander einsortieren
function placeArabicFieldsNextToEachOther(item) {
  // Wir entfernen arabic_full & arabic aus der aktuellen Reihenfolge
  const keys = Object.keys(item).filter(k => k !== 'arabic_full' && k !== 'arabic');

  // Position bestimmen: nach 'translation', sonst nach 'verse_number', sonst an Anfang
  let insertAfterKey = null;
  if (keys.includes('translation')) insertAfterKey = 'translation';
  else if (keys.includes('verse_number')) insertAfterKey = 'verse_number';

  const out = {};
  let inserted = false;

  if (insertAfterKey === null) {
    // An den Anfang setzen
    out.arabic_full = item.arabic_full ?? '';
    out.arabic = item.arabic ?? '';
    inserted = true;
  }

  for (const k of keys) {
    out[k] = item[k];
    if (!inserted && k === insertAfterKey) {
      out.arabic_full = item.arabic_full ?? '';
      out.arabic = item.arabic ?? '';
      inserted = true;
    }
  }

  // Falls aus irgendwelchen Gründen noch nicht eingefügt (sollte nicht passieren)
  if (!inserted) {
    out.arabic_full = item.arabic_full ?? '';
    out.arabic = item.arabic ?? '';
  }

  return out;
}

fs.readdir(segmentedDir, (err, files) => {
  if (err) {
    console.error('Fehler beim Lesen des segmented-Verzeichnisses:', err);
    process.exit(1);
  }

  files.filter(f => f.endsWith('.json')).forEach(file => {
    const segPath = path.join(segmentedDir, file);
    const denPath = path.join(densedDir, file); // gleicher Dateiname erwartet

    // Densed laden
    let densedArr;
    try {
      const densedJson = readJson(denPath);
      densedArr = getDensedArray(densedJson);
      if (!densedArr) {
        console.warn(`Übersprungen (densed ist weder Array noch {verses:[]}): ${file}`);
        return;
      }
    } catch (e) {
      console.error(`Fehler beim Lesen/Parsen densed ${file}:`, e.message);
      return;
    }

    // Map: verse_number -> arabic (aus densed)
    const arabicByVerse = new Map();
    for (const v of densedArr) {
      if (v && typeof v === 'object' && Number.isFinite(v.verse_number)) {
        arabicByVerse.set(v.verse_number, v.arabic ?? '');
      }
    }

    // Segmented laden
    let segmented;
    try {
      segmented = readJson(segPath);
      if (!Array.isArray(segmented)) {
        console.warn(`Übersprungen (segmented ist kein Array): ${file}`);
        return;
      }
    } catch (e) {
      console.error(`Fehler beim Lesen/Parsen segmented ${file}:`, e.message);
      return;
    }

    // Pro Eintrag: arabic_full aus densed setzen, arabic = '' und Reihenfolge anpassen
    let changed = false;
    const updated = segmented.map(item => {
      if (!item || typeof item !== 'object') return item;
      const vn = item.verse_number;
      if (!Number.isFinite(vn)) return item;

      const fullArabic = arabicByVerse.get(vn);
      if (typeof fullArabic === 'undefined') return item; // kein Matching gefunden

      // Felder setzen
      const next = { ...item, arabic_full: fullArabic, arabic: '' };

      // arabic_full und arabic übereinander anordnen
      const reordered = placeArabicFieldsNextToEachOther(next);

      // Prüfen, ob es Änderungen gab (einfacher Vergleich)
      if (
        item.arabic_full !== reordered.arabic_full ||
        item.arabic !== reordered.arabic ||
        JSON.stringify(Object.keys(item)) !== JSON.stringify(Object.keys(reordered))
      ) {
        changed = true;
      }

      return reordered;
    });

    // Zurückschreiben, nur wenn geändert
    try {
      if (changed) {
        fs.writeFileSync(segPath, JSON.stringify(updated, null, 2), 'utf8');
        console.log(`Aktualisiert: ${file}`);
      } else {
        console.log(`OK (keine Änderungen): ${file}`);
      }
    } catch (e) {
      console.error(`Fehler beim Schreiben ${file}:`, e.message);
    }
  });
});
