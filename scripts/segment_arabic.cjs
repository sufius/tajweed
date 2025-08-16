/**
 * segment_arabic.js  (aktualisiert)
 * - Läuft durch ../public/surat/segmented/de/27 (oder --file)
 * - Startet beim ersten leeren arabic ODER bei --start-index
 * - Ein OpenAI-Call pro leerem Objekt
 * - Akzeptiert Segment, wenn es Präfix von remaining ist
 *   oder wenn remaining mit [ein Randzeichen] + Segment beginnt
 *   (Randzeichen aus arabic_full genommen: Space, Waqf, Tatweel)
 */

const fs = require('fs');
const path = require('path');
const OpenAI = require('openai');
require('dotenv').config({ path: '../.env.local' });

const SOURCE_DIR = path.join(__dirname, '../public/surat/segmented/de/27');
const MODEL = 'gpt-4o';
const TEMPERATURE = 0;
const SLEEP_MS_BETWEEN_CALLS = 200;

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// Optional CLI
const argFile = process.argv.includes('--file')
  ? process.argv[process.argv.indexOf('--file') + 1]
  : null;

const argStartIndex = process.argv.includes('--start-index')
  ? Number(process.argv[process.argv.indexOf('--start-index') + 1])
  : null;

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

function safeWriteJSON(filePath, data) {
  const tmp = filePath + '.tmp';
  fs.writeFileSync(tmp, JSON.stringify(data, null, 2), 'utf8');
  fs.renameSync(tmp, filePath);
}

// Baue Prompt: Wir zwingen das Modell, ein JSON mit { "arabic_segment": "<...>" } zu liefern,
// wobei arabic_segment ein EXAKTES Präfix von `remaining_arabic` sein muss, das zur gegebenen
// transcription passt. Keine Normalisierung, keine Zeichen-Entfernung, nichts erfinden.
function buildPrompt({ remaining_arabic, transcription }) {
  return [
    `Du segmentierst ausschließlich aus dem gegebenen arabischen Original.`,
    `REGELN:`,
    `1) Gib eine EXAKTE Teilzeichenkette zurück, die am ANFANG (Präfix) von "remaining_arabic" steht.`,
    `2) Entferne/ändere/füge keinerlei Zeichen hinzu (inkl. Leerzeichen und Sonderzeichen).`,
    `3) Antworte nur als JSON: { "arabic_segment": "<EXAKTES_PRAEFIX>" }`,
    ``,
    `remaining_arabic:`,
    remaining_arabic,
    ``,
    `transcription:`,
    transcription
  ].join('\n');
}

// Finde den ersten Index eines Objekts mit leerem arabic
function findFirstEmptyArabicIndex(arr) {
  return arr.findIndex(x => x && typeof x === 'object' && typeof x.arabic === 'string' && x.arabic.trim() === '');
}

// Zähle die bereits verbrauchte Länge (Cursor) je arabic_full in diesem Array (bis zu idx-1)
function computeUsedLengthForArabicFull(arr, idx) {
  const usedByFull = new Map();
  for (let i = 0; i < idx; i++) {
    const it = arr[i];
    if (!it || typeof it !== 'object') continue;
    const af = it.arabic_full;
    if (typeof af !== 'string') continue;
    const seg = typeof it.arabic === 'string' ? it.arabic : '';
    if (!usedByFull.has(af)) usedByFull.set(af, 0);
    usedByFull.set(af, usedByFull.get(af) + seg.length);
  }
  return usedByFull;
}

// Erzeuge remaining_arabic basierend auf bisheriger Segmentlänge
function remainingArabicForItem(item, usedByFull) {
  const af = item.arabic_full || '';
  const used = usedByFull.get(af) || 0;
  return af.slice(used);
}

// EINZIGE NEUE LOGIK: tolerantes Präfix mit optional GENAU 1 führendem Randzeichen
const OPTIONAL_LEADING_CHARS = /[\u0020\u0640\u06DD\u06DE\u06E6\u06DA\u06DB\u06DC\u06D6-\u06ED\u061F\u060C\u061B]/u;
//  \u0020 space, \u0640 Tatweel ـ, \u06DD ۝, \u06DE ۞, \u06E6 ۦ (selten), \u06D6–\u06ED Diverse Small High/Quranic marks,
//  \u060C، comma, \u061B؛ semicolon, \u061F؟ question

function acceptSegment(remaining, segment) {
  if (remaining.startsWith(segment)) {
    return segment; // exakt
  }
  // genau EIN führendes Randzeichen erlaubt (falls Modell es „vergessen“ hat)
  const firstChar = remaining.charAt(0);
  if (OPTIONAL_LEADING_CHARS.test(firstChar) && remaining.startsWith(firstChar + segment)) {
    return firstChar + segment;
  }
  return null;
}

async function processFile(filePath) {
  let data;
  try {
    data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
    if (!Array.isArray(data)) {
      console.warn(`Übersprungen (keine Array-Struktur): ${path.basename(filePath)}`);
      return { changed: false, done: true };
    }
  } catch (e) {
    console.error(`Fehler beim Lesen/Parsen: ${path.basename(filePath)} -> ${e.message}`);
    return { changed: false, done: false };
  }

  let startIdx = argStartIndex ?? findFirstEmptyArabicIndex(data);
  if (startIdx === -1) {
    console.log(`Alles befüllt: ${path.basename(filePath)}`);
    return { changed: false, done: true };
  }

  console.log(`Starte bei Index ${startIdx} in ${path.basename(filePath)} ...`);

  // Wir laufen ab startIdx bis zum Ende; nach jedem Eintrag sofort schreiben.
  for (let i = startIdx; i < data.length; i++) {
    const item = data[i];
    if (!item || typeof item !== 'object') continue;

    const arabicCurrent = typeof item.arabic === 'string' ? item.arabic : '';
    if (arabicCurrent.trim() !== '') continue; // bereits gefüllt

    const arabicFull = item.arabic_full;
    const transcription = item.transcription;

    if (typeof arabicFull !== 'string' || typeof transcription !== 'string') {
      console.warn(`Eintrag ${i}: fehlendes arabic_full oder transcription – übersprungen.`);
      continue;
    }

    // Cursor bestimmen: wie viel wurde für GENAU dieses arabic_full bereits verbraucht?
    const usedByFull = computeUsedLengthForArabicFull(data, i);
    const remaining = remainingArabicForItem(item, usedByFull);

    if (!remaining) {
      console.warn(`Eintrag ${i}: remaining_arabic ist leer – übersprungen.`);
      continue;
    }

    // Prompt bauen
    const prompt = buildPrompt({ remaining_arabic: remaining, transcription });

    // OpenAI-Aufruf (ein Request pro Objekt)
    let modelSeg = null;
    try {
      const res = await openai.chat.completions.create({
        model: MODEL,
        temperature: TEMPERATURE,
        messages: [{ role: 'user', content: prompt }],
        response_format: { type: 'json_object' }
      });

      const raw = res.choices?.[0]?.message?.content || '{}';
      const parsed = JSON.parse(raw);
      modelSeg = parsed.arabic_segment;

      if (typeof modelSeg !== 'string') {
        console.warn(`Eintrag ${i}: ungültige Antwort (kein arabic_segment String) – übersprungen.`);
        continue;
      }
    } catch (e) {
      console.error(`OpenAI-Fehler bei ${path.basename(filePath)} [idx ${i}]:`, e?.message || e);
      // Sofortiges Schreiben entfällt hier (da keine Änderung), aber wir fahren fort.
      // Kurze Pause, um eventuelle Rate Limits zu entspannen.
      await sleep(SLEEP_MS_BETWEEN_CALLS);
      continue;
    }

    // Präfix-Validierung (exakt oder mit GENAU 1 führendem Randzeichen)
    const accepted = acceptSegment(remaining, modelSeg);
    if (!accepted) {
      console.warn(`Eintrag ${i}: Segment ist kein akzeptiertes Präfix (len rem=${remaining.length}, seg=${JSON.stringify(modelSeg).slice(0,80)}...). Übersprungen.`);
      continue;
    }

    // Eintragen & sofort speichern
    item.arabic = accepted;
    try {
      safeWriteJSON(filePath, data);
      console.log(`Gespeichert: ${path.basename(filePath)} [idx ${i}] (len=${accepted.length})`);
    } catch (e) {
      console.error(`Fehler beim Schreiben: ${path.basename(filePath)} -> ${e.message}`);
      // Wenn Schreiben fehlschlägt, nicht weiter riskieren:
      return { changed: true, done: false };
    }

    // kleine Pause zwischen Requests
    await sleep(SLEEP_MS_BETWEEN_CALLS);
  }

  return { changed: true, done: false };
}

// Main: alle Dateien oder eine spezifische Datei
(async () => {
  let files;
  if (argFile) {
    files = [path.isAbsolute(argFile) ? argFile : path.join(SOURCE_DIR, argFile)];
  } else {
    files = fs.readdirSync(SOURCE_DIR).filter(f => f.endsWith('.json')).map(f => path.join(SOURCE_DIR, f));
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
