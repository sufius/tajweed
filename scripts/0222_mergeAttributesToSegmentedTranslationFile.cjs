const fs = require('fs');
const path = require('path');
const glob = require('glob');
const { exit } = require('process');

// Beispiel: de-27 = Deutsch (Bubenheim)
const translationKey = "de-27";

// CLI-Argument lesen
const surahArg = process.argv[2];
if (!surahArg || isNaN(surahArg)) {
  console.error("❗ Bitte eine Surah-Nummer angeben, z.B.: node script.js 74");
  process.exit(1);
}
const surahNumber = parseInt(surahArg).toString();

// Quell- und Zielverzeichnisse
const sourceDir = path.join(__dirname, '../public/surat-densed');
const targetDir = path.join(__dirname, '../public/surat-aligned-' + translationKey);

// Eingabedatei für die Surah
const sourceFile = path.join(sourceDir, `surah-${surahNumber}.json`);
const targetFile = path.join(targetDir, `surah-${surahNumber}.json`);

// Schrittweise Verarbeitung
if (!fs.existsSync(sourceFile)) {
  console.error(`❌ Eingabedatei nicht gefunden: ${sourceFile}`);
  process.exit(1);
}

if (!fs.existsSync(targetFile)) {
  console.error(`❌ Ziel-Datei nicht gefunden: ${targetFile}`);
  process.exit(1);
}

// Quelldaten lesen
let sourceData;
try {
  sourceData = JSON.parse(fs.readFileSync(sourceFile, 'utf8'));
} catch (error) {
  console.error(`❌ Fehler beim Lesen der Quelldatei ${sourceFile}:`, error.message);
  process.exit(1);
}

// Zieldaten lesen
let existingData;
try {
  existingData = JSON.parse(fs.readFileSync(targetFile, 'utf8'));
} catch (error) {
  console.error(`❌ Fehler beim Lesen der Zieldatei ${targetFile}:`, error.message);
  process.exit(1);
}

// Daten übertragen
sourceData.forEach((verse, index) => {
  if (existingData[index]) {
    existingData[index].text_uthmani = verse.text_uthmani;
    existingData[index].text_uthmani_transcribed = verse.text_uthmani_transcribed;
  }
});

// Neue Datei schreiben
fs.writeFile(targetFile, JSON.stringify(existingData, null, 2), 'utf8', err => {
  if (err) {
    console.error(`❌ Fehler beim Schreiben der Datei ${targetFile}:`, err);
  } else {
    console.log(`✅ Fertig! Datei aktualisiert: ${targetFile}`);
  }
});
