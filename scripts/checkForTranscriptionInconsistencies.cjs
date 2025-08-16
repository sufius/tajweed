const fs = require('fs');
const path = require('path');

const segmentedDir = path.join(__dirname, '../public/surat/segmented/de/27');

// Wort-Extractor: erstes/letztes "Wort" (Unicode-Buchstaben, inkl. diakritische; erlaubt auch ' und ’)
function firstWord(s) {
  if (typeof s !== 'string') return '';
  const m = s.match(/[\p{L}’']+/u);
  return m ? m[0] : '';
}

function lastWord(s) {
  if (typeof s !== 'string') return '';
  const matches = [...s.matchAll(/[\p{L}’']+/gu)];
  return matches.length ? matches[matches.length - 1][0] : '';
}

fs.readdir(segmentedDir, (err, files) => {
  if (err) {
    console.error('Fehler beim Lesen des Verzeichnisses:', err);
    process.exit(1);
  }

  files
    .filter(f => f.endsWith('.json'))
    .forEach(file => {
      const filePath = path.join(segmentedDir, file);

      let data;
      try {
        data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
        if (!Array.isArray(data)) {
          console.warn(`Übersprungen (keine Array-Struktur): ${file}`);
          return;
        }
      } catch (e) {
        console.error(`Fehler beim Lesen/Parsen ${file}:`, e.message);
        return;
      }

      // Nach verse_number gruppieren und Reihenfolge beibehalten
      const groups = new Map(); // vn -> Array von {idx, obj}
      data.forEach((obj, i) => {
        const vn = obj?.verse_number;
        if (!Number.isFinite(vn)) return;
        if (!groups.has(vn)) groups.set(vn, []);
        groups.get(vn).push({ idx: i, obj });
      });

      let changed = false;

      // Jedes benachbarte Paar je Vers prüfen
      groups.forEach(list => {
        // Reihenfolge wie in Datei belassen (nicht sortieren)
        for (let k = 0; k < list.length - 1; k++) {
          const a = list[k].obj;
          const b = list[k + 1].obj;

          const aw = lastWord(a?.transcription ?? '');
          const bw = firstWord(b?.transcription ?? '');

          if (aw && bw && aw.toLowerCase() === bw.toLowerCase()) {
            if (a.color !== 'red') { a.color = 'red'; changed = true; }
            if (b.color !== 'red') { b.color = 'red'; changed = true; }
          }
        }
      });

      if (changed) {
        try {
          fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf8');
          console.log(`Aktualisiert: ${file}`);
        } catch (e) {
          console.error(`Fehler beim Schreiben ${file}:`, e.message);
        }
      } else {
        console.log(`OK (keine Markierungen nötig): ${file}`);
      }
    });
});
