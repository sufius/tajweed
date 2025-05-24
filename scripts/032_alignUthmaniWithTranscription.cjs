require('dotenv').config({ path: '.env.local' });
const fs = require('fs');
const path = require('path');
const { OpenAI } = require('openai');

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

async function alignVerse(verse) {
  if (!verse.splitted || !verse.text_uthmani) return verse;

  const prompt = `
Segmentiere den folgenden arabischen Originaltext \`text_uthmani\` in Sinnabschnitte, die exakt zu den jeweiligen \`translation\`-Segmenten passen. 
Erzeuge für jedes Segment drei Felder:

- "translation": der deutsche Übersetzungstext (gegeben),
- "text_uthmani": der exakt passende Teil des arabischen Ursprungstexts,
- "text_uthmani_transcribed": eine lesbare lateinische Transkription (z. B. Quran-Verlesestandard wie "Wa iza ra'aitahum...").

⚠️ WICHTIG:
- Lass alle Sonderzeichen wie ۞ im arabischen Segment stehen.
- Die Reihenfolge der Segmente muss erhalten bleiben.
- Die Summe der arabischen Segmente muss exakt wieder den Ursprungstext ergeben (kein Textverlust).

Gib als Antwort ausschließlich ein JSON-Array wie dieses zurück:
[
  {
    "translation": "...",
    "text_uthmani": "...",
    "text_uthmani_transcribed": "..."
  },
  ...
]

Originaltext (arabisch):
${verse.text_uthmani}

Segmentierte Übersetzungen:
${JSON.stringify(verse.splitted.map(s => s.translation), null, 2)}
`;



console.log(`
  Originaltext (arabisch):
  ${verse.text_uthmani}
  
  Segmentierte Übersetzungen:
  ${JSON.stringify(verse.splitted.map(s => s.translation), null, 2)}`
);



  const response = await openai.chat.completions.create({
    model: "gpt-4",
    temperature: 0,
    messages: [{ role: "user", content: prompt }],
  });

  try {
    const parsed = JSON.parse(response.choices[0].message.content);
    verse.splitted = parsed;
  } catch (e) {
    console.error(`Fehler beim Parsen (Vers ${verse.verse_number}):`, e.message);
    console.log(response.choices[0].message.content);
  }

  return verse;
}

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
