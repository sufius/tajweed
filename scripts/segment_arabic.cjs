/**
 * segment_arabic.js
 *
 * Verwendet OpenAI (gpt-4o), um in Dateien unter ../public/surat/segmented/de/27
 * aus "arabic_full" passende Teilsegmente für "transcription" zu extrahieren und
 * ins Feld "arabic" zu schreiben – exakt als Präfix des verbleibenden arabic_full
 * (Cursor-Ansatz), sodass das spätere Konkatenieren aller Segmente wieder exakt
 * arabic_full ergibt (inkl. Leerzeichen und Sonderzeichen).
 */

const fs = require('fs');
const path = require('path');
const OpenAI = require('openai');
require('dotenv').config({ path: '../.env.local' });

// ---------- KONFIG ----------
const SOURCE_DIR = path.join(__dirname, '../public/surat/segmented/de/27');
const MODEL = 'gpt-4o';
const TEMPERATURE = 0;
const SLEEP_MS_BETWEEN_CALLS = 200; // kleine Pause zwischen Requests
// ----------------------------

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

function sleep(ms) {
  return new Promise((res) => setTimeout(res, ms));
}

// Hilfs-Write: sicher schreiben (mit Temp-Datei + rename)
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
    `Du segmentierst arabische Verse ausschließlich aus dem gegebenen Originaltext.`,
    `REGELN:`,
    `1) Nimm als Ergebnis eine EXAKTE Teilzeichenkette (substring) am ANFANG (Präfix) von "remaining_arabic".`,
    `2) Entferne KEINE Zeichen, verändere KEINE Zeichen, füge KEINE Zeichen hinzu.`,
    `3) Lasse alle Leerzeichen und Sonderzeichen (z. B. ۚ, ۖ, ۞, etc.) genauso stehen, wie sie im Präfix vorkommen.`,
    `4) Wähle genau jenes Präfix, das am besten zur gegebenen "transcription" passt.`,
    `5) Antworte NUR als JSON-Objekt: { "arabic_segment": "<EXAKTES_PRAEFIX>" }`,
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
  return arr.findIndex(
    (x) => x && typeof x === 'object' && typeof x.arabic === 'string' && x.arabic.trim() === ''
  );
}

// Zähle die bereits verbrauchte Länge (Cursor) je arabic_full in diesem Array (bis zu idx-1)
function computeUsedLengthForArabicFull(arr, idx) {
  const usedByFull = new Map(); // arabic_full -> used_length
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

// Verarbeite eine Datei: starte beim ersten leeren arabic, iteriere ab dort
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

  let startIdx = findFirstEmptyArabicIndex(data);
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
    let segment = null;
    try {
      const res = await openai.chat.completions.create({
        model: MODEL,
        temperature: TEMPERATURE,
        messages: [{ role: 'user', content: prompt }],
        response_format: { type: 'json_object' }
      });

      const raw = res.choices?.[0]?.message?.content || '{}';
      const parsed = JSON.parse(raw);
      segment = parsed.arabic_segment;

      if (typeof segment !== 'string') {
        console.warn(`Eintrag ${i}: ungültige Antwort (kein arabic_segment String) – übersprungen.`);
        continue;
      }

      // Validierung: segment MUSS Präfix von remaining sein
      if (!remaining.startsWith(segment)) {
        console.warn(`Eintrag ${i}: segment ist kein Präfix des remaining – übersprungen.`);
        continue;
      }

      // Optional: Minimale Nicht-Leer-Validierung
      if (segment.length === 0) {
        console.warn(`Eintrag ${i}: leeres Segment – übersprungen.`);
        continue;
      }
    } catch (e) {
      console.error(`OpenAI-Fehler bei ${path.basename(filePath)} [idx ${i}]:`, e?.message || e);
      // Sofortiges Schreiben entfällt hier (da keine Änderung), aber wir fahren fort.
      // Kurze Pause, um eventuelle Rate Limits zu entspannen.
      await sleep(SLEEP_MS_BETWEEN_CALLS);
      continue;
    }

    // Segment eintragen & Datei sofort speichern
    item.arabic = segment;

    try {
      safeWriteJSON(filePath, data);
      console.log(`Gespeichert: ${path.basename(filePath)} [idx ${i}] (len=${segment.length})`);
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
  const argFile = process.argv.includes('--file')
    ? process.argv[process.argv.indexOf('--file') + 1]
    : null;

  let files;
  if (argFile) {
    files = [argFile];
  } else {
    files = fs.readdirSync(SOURCE_DIR).filter((f) => f.endsWith('.json'));
  }

  if (!files || files.length === 0) {
    console.log('Keine JSON-Dateien gefunden.');
    process.exit(0);
  }

  let anyPending = false;

  for (const f of files) {
    const filePath = path.isAbsolute(f) ? f : path.join(SOURCE_DIR, f);
    const res = await processFile(filePath);
    if (res.done === false) anyPending = true;
  }

  if (!anyPending) {
    console.log('Alle arabic-Felder sind bereits gefüllt – stoppe das Script.');
  } else {
    console.log('Durchlauf beendet (es gibt ggf. noch weitere leere Felder für nächste Runs).');
  }
})();
