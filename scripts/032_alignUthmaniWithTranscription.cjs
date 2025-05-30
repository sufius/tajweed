require('dotenv').config({ path: '.env.local' });
const fs = require('fs');
const path = require('path');
const { alignVerse } = require('./alignVerse_segment_based.cjs');

async function processFile(inputPath) {
  if (!fs.existsSync(inputPath)) {
    console.error(`❌ Datei nicht gefunden: ${inputPath}`);
    process.exit(1);
  }

  const input = JSON.parse(fs.readFileSync(inputPath, 'utf-8'));
  const processed = [];

  for (const verse of input) {
    const result = await alignVerse(verse);
    processed.push(result);
  }

  const outputPath = path.join(
    path.dirname(inputPath),
    path.basename(inputPath, '.json') + '_all_segmented.json'
  );

  fs.writeFileSync(outputPath, JSON.stringify(processed, null, 2), 'utf-8');
  console.log(`✔️ Fertig! Datei gespeichert unter:\n${outputPath}`);
}

// 🔧 Aufruf: node 032_alignUthmaniWithTranscription.cjs ./public/surat-aligned/surah-1.json
const inputPath = process.argv[2];
if (!inputPath) {
  console.error("❗ Bitte Pfad zur Eingabedatei angeben:\nnode 032_alignUthmaniWithTranscription.cjs ./public/surat-aligned/surah-1.json");
  process.exit(1);
}

processFile(inputPath);
