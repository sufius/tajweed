/**
 * Segmentiert arabic_full zu arabic passend zur transcription.
 * - arbeitet objektweise und speichert nach jedem Objekt
 * - OpenAI nur, wenn Nachbar (prev/next) gleiche verse_number hat
 * - sonst arabic_full -> arabic kopieren
 *
 * Nutzung:
 *   node segment_arabic_cli.js
 *   node segment_arabic_cli.js --file surah-18.json
 *   node segment_arabic_cli.js --start-index 120
 *   node segment_arabic_cli.js --file surah-18.json --start-index 200
 */

const fs = require('fs');
const path = require('path');
const OpenAI = require('openai');
require('dotenv').config({ path: '../.env.local' });

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// ----- Pfade anpassen -----
const SOURCE_DIR = path.join(__dirname, '../public/surat/segmented/de/27');

// ----- Optional CLI -----
const argFile = process.argv.includes('--file')
  ? process.argv[process.argv.indexOf('--file') + 1]
  : null;

const argStartIndex = process.argv.includes('--start-index')
  ? Number(process.argv[process.argv.indexOf('--start-index') + 1])
  : null;

// ----- Utils -----
function readJson(fp) {
  return JSON.parse(fs.readFileSync(fp, 'utf8'));
}
function writeJson(fp, obj) {
  fs.writeFileSync(fp, JSON.stringify(obj, null, 2), 'utf8');
}
function isEmptyArabic(v) {
  return v && typeof v === 'object' && (v.arabic === '' || v.arabic === undefined);
}
function findFirstEmptyArabicIndex(arr, from = 0) {
  for (let i = Math.max(0, from); i < arr.length; i++) {
    if (isEmptyArabic(arr[i])) return i;
  }
  return -1;
}
function hasSiblingSameVerse(arr, i) {
  const vn = arr[i]?.verse_number;
  if (!Number.isFinite(vn)) return false;
  const prevSame = i > 0 && arr[i - 1]?.verse_number === vn;
  const nextSame = i < arr.length - 1 && arr[i + 1]?.verse_number === vn;
  return prevSame || nextSame;
}
function collectContext(arr, i) {
  const cur = arr[i];
  const vn = cur?.verse_number;

  const prev = i > 0 ? arr[i - 1] : null;
  const next = i < arr.length - 1 ? arr[i + 1] : null;

  const prevSame = prev && prev.verse_number === vn ? prev : null;
  const nextSame = next && next.verse_number === vn ? next : null;

  const earlierSame = [];
  for (let k = 0; k < i; k++) {
    const it = arr[k];
    if (it?.verse_number === vn && it?.arabic) {
      earlierSame.push({ transcription: it.transcription || '', arabic: it.arabic });
    }
  }

  return { prevSame, nextSame, earlierSame };
}

function buildPrompt({ arabic_full, transcription, prevSame, nextSame, earlierSame }) {
  return `
Du segmentierst arabischen Quran-Text.

AUFGABE:
- Du erhältst:
  - "arabic_full": der komplette arabische Vers (String)
  - "transcription": das Zielsegment in Transkription (lateinisch, String)
- Finde in "arabic_full" einen **zusammenhängenden** Substring, der diesem Transkriptions-Segment entspricht.
- Gib **exakt** diesen Substring zurück – keine Zeichenänderungen.
- **Bewahre** alle am Anfang/Ende des Segments vorhandenen Sonderzeichen/Leerzeichen (z. B. ۚ, ۖ, ۞, diakritische Zeichen, Spaces).
- Der Substring muss so gewählt sein, dass die Summe aller Segmente (in Dateireihenfolge) später wieder exakt "arabic_full" ergeben kann.

KONTEXT (gleiche verse_number):
- Bereits segmentierte frühere Teile:
${earlierSame.length ? JSON.stringify(earlierSame, null, 2) : '[]'}

- Unmittelbares vorheriges Segment:
${prevSame ? JSON.stringify({ transcription: prevSame.transcription, arabic: prevSame.arabic || '' }, null, 2) : 'null'}

- Unmittelbares nächstes Segment:
${nextSame ? JSON.stringify({ transcription: nextSame.transcription, arabic: nextSame.arabic || '' }, null, 2) : 'null'}

DATEN:
{
  "arabic_full": ${JSON.stringify(arabic_full)},
  "transcription": ${JSON.stringify(transcription)}
}

AUSGABE (nur JSON-Objekt):
{
  "arabic": "<EXAKTER zusammenhängender Substring aus arabic_full>"
}
`.trim();
}

async function segmentWithOpenAI(item, ctx) {
  const prompt = buildPrompt({
    arabic_full: item.arabic_full,
    transcription: item.transcription,
    prevSame: ctx.prevSame,
    nextSame: ctx.nextSame,
    earlierSame: ctx.earlierSame,
  });

  const res = await openai.chat.completions.create({
    model: 'gpt-4o',
    temperature: 0,
    messages: [{ role: 'user', content: prompt }],
    response_format: { type: "json_object" }
  });

  const content = res.choices?.[0]?.message?.content || '{}';
  let parsed = {};
  try { parsed = JSON.parse(content); } catch {}
  return typeof parsed.arabic === 'string' ? parsed.arabic : '';
}

async function processFile(fp) {
  let data;
  try {
    data = readJson(fp);
    if (!Array.isArray(data)) {
      console.warn(`Übersprungen (keine Array-Struktur): ${path.basename(fp)}`);
      return { done: true };
    }
  } catch (e) {
    console.error(`Fehler beim Lesen/Parsen ${fp}:`, e.message);
    return { done: true };
  }

  // Startindex: CLI > erster leerer arabic
  const startAt = Number.isFinite(argStartIndex) ? argStartIndex : findFirstEmptyArabicIndex(data);
  if (startAt === -1) {
    console.log(`STOP: Alle arabic-Felder sind gefüllt in ${path.basename(fp)}.`);
    return { done: true };
  }

  console.log(`Verarbeite ${path.basename(fp)} ab Index ${startAt} …`);

  for (let i = startAt; i < data.length; i++) {
    const item = data[i];
    if (!item || typeof item !== 'object') continue;

    // Nur leere arabic bearbeiten
    if (!isEmptyArabic(item)) continue;

    if (!item.arabic_full || typeof item.arabic_full !== 'string') {
      console.warn(`Index ${i}: fehlt "arabic_full" – übersprungen`);
      continue;
    }

    // Wenn weder Vorgänger noch Nachfolger zur selben verse_number gehören:
    // -> einfach arabic_full übernehmen (kein OpenAI)
    let useOpenAI = hasSiblingSameVerse(data, i);

    if (!useOpenAI) {
      item.arabic = item.arabic_full;
    } else {
      // Mit OpenAI segmentieren; falls Fehler, Fallback = arabic_full
      try {
        const ctx = collectContext(data, i);
        const seg = await segmentWithOpenAI(item, ctx);
        item.arabic = seg && typeof seg === 'string' ? seg : item.arabic_full;
      } catch (e) {
        console.error(`OpenAI-Fehler in ${path.basename(fp)} [index ${i}]:`, e.message);
        item.arabic = item.arabic_full;
      }
    }

    // Sofort speichern (Fortschritt sichern)
    try {
      writeJson(fp, data);
      console.log(`→ Gespeichert: ${path.basename(fp)} [index ${i}]`);
    } catch (e) {
      console.error(`Fehler beim Schreiben ${path.basename(fp)} [index ${i}]:`, e.message);
      // Beim Schreibfehler abbrechen, um Inkonsistenzen zu vermeiden
      return { done: false };
    }
  }

  // Prüfen, ob noch leere arabic übrig sind
  const remaining = findFirstEmptyArabicIndex(data);
  return { done: remaining === -1 };
}

// ----- Main: alle Dateien oder eine spezifische Datei -----
(async () => {
  let files;
  if (argFile) {
    files = [path.isAbsolute(argFile) ? argFile : path.join(SOURCE_DIR, argFile)];
  } else {
    files = fs.readdirSync(SOURCE_DIR)
      .filter(f => f.endsWith('.json'))
      .map(f => path.join(SOURCE_DIR, f));
  }

  if (files.length === 0) {
    console.log('Keine JSON-Dateien gefunden.');
    process.exit(0);
  }

  let allDone = true;
  for (const fp of files) {
    const res = await processFile(fp);
    if (!res.done) allDone = false;
  }

  if (allDone) {
    console.log('Alle arabic-Felder sind bereits gefüllt – stoppe das Script.');
  } else {
    console.log('Durchlauf beendet (für nächste Runs bleibt der Fortschritt erhalten).');
  }
})();
