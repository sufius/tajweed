/**
 * Segmentiert "arabic_full" zu "arabic" passend zur "transcription",
 * ohne Randzeichen zu verlieren (Waqf/Spaces etc.).
 *
 * Nutzung:
 *   node segment_arabic_snap.js
 *   node segment_arabic_snap.js --file surah-18.json
 *   node segment_arabic_snap.js --start-index 120
 *   node segment_arabic_snap.js --file surah-18.json --start-index 200
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

// ---- Randzeichen-Erkennung (alles, was am Segmentrand "dranhängen" darf) ----
const RIGHT_BOUNDARY_RE = /[\u200C\u200D\s\u0640\u060C\u061B\u061F\u06D6-\u06ED\u06DD\u06DE\u06DC\u06E2\u06E3\u06E5\u06E6]+/u; // ZWNJ/ZWJ, Space, Tatweel, arab. Komma/Semikolon/Fragez., Waqf-Bereich u.a.
const LEFT_BOUNDARY_RE  = /[\u200C\u200D\s\u0640\u060C\u061B\u061F\u06D6-\u06ED\u06DD\u06DE\u06DC\u06E2\u06E3\u06E5\u06E6]+/u;

// rechte Grenze ab Cursor erweitern (inkl. aller Randzeichen)
function expandRight(full, end) {
  if (end >= full.length) return end;
  const m = full.slice(end).match(RIGHT_BOUNDARY_RE);
  if (m && m.index === 0) {
    return end + m[0].length;
  }
  return end;
}
// linke Grenze vor Start erweitern (nur beim ersten Segment eines Verses)
function expandLeft(full, start) {
  if (start <= 0) return start;
  // suche rückwärts bis Zeichen nicht mehr als Randzeichen zählt
  let i = start - 1;
  while (i >= 0 && LEFT_BOUNDARY_RE.test(full[i])) {
    i--;
  }
  return i + 1;
}

// OpenAI-Prompt: liefert NUR den arabischen Kern-Substring (ohne Rand-Erweiterung)
function buildPrompt({ arabic_full, transcription, prevSame, nextSame, earlierSame }) {
  return `
Du segmentierst arabischen Quran-Text.

AUFGABE:
- Du erhältst:
  - "arabic_full": der komplette arabische Vers (String)
  - "transcription": das Zielsegment in Transkription (lateinisch, String)
- Finde in "arabic_full" den **zusammenhängenden Kern-Substring**, der diesem Transkriptions-Segment entspricht.
- Gib **exakt** diesen Kern-Substring zurück (ohne zusätzliche Zeichen, keine Normalisierung).
- (Randzeichen/Leerzeichen an den Grenzen werden NICHT hier ergänzt – das erledigt das Programm nachträglich.)

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
  "arabic": "<EXAKTER KERN-Substring aus arabic_full>"
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

function indexOfFrom(full, needle, fromIdx) {
  if (!needle) return -1;
  return full.indexOf(needle, fromIdx);
}

// Schneidet robust aus arabic_full: Kern lokalisieren, linke/rechte Randzeichen anhängen
function sliceWithBoundaries(full, core, cursor, isFirstInVerse, isLastInVerse) {
  if (!core) {
    // Fallback: falls leer, nimm nichts (oder minimalen Slice)
    return { slice: '', newCursor: cursor };
  }

  // suche core ab cursor
  const startCore = indexOfFrom(full, core, cursor);
  if (startCore === -1) {
    // Fallback: versuche ohne strikte Position (kann unerwartete Treffer geben)
    const anywhere = full.indexOf(core);
    if (anywhere === -1) {
      // Wenn gar nicht gefunden: gib den Rest (damit nichts verloren geht)
      return { slice: full.slice(cursor), newCursor: full.length };
    }
    // trotzdem an anywhere andocken
    const endCoreA = anywhere + core.length;
    const endA = expandRight(full, endCoreA);
    const startA = isFirstInVerse ? expandLeft(full, anywhere) : anywhere;
    return { slice: full.slice(startA, endA), newCursor: endA };
  }

  const endCore = startCore + core.length;

  // linke Grenze nur beim ersten Segment aufziehen (um führende Zeichen zu bewahren)
  const start = isFirstInVerse ? expandLeft(full, startCore) : startCore;

  // rechte Grenze IMMER bis inkl. aller Randzeichen erweitern
  const end = isLastInVerse ? full.length : expandRight(full, endCore);

  return { slice: full.slice(start, end), newCursor: end };
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

  // Für jede verse_number halten wir einen Cursor innerhalb des arabic_full,
  // damit Segmente nahtlos hintereinander ausgeschnitten werden
  const verseCursors = new Map(); // vn -> cursor position in full

  for (let i = startAt; i < data.length; i++) {
    const item = data[i];
    if (!item || typeof item !== 'object') continue;
    if (!isEmptyArabic(item)) continue; // schon befüllt

    const vn = item.verse_number;
    const full = item.arabic_full;
    if (!Number.isFinite(vn) || typeof full !== 'string') {
      console.warn(`Index ${i}: verse_number/arabic_full fehlt – übersprungen`);
      continue;
    }

    // Alle Items derselben verse_number (Dateireihenfolge)
    const siblings = data
      .map((obj, idx) => ({ obj, idx }))
      .filter(x => x.obj?.verse_number === vn);

    const myPos = siblings.findIndex(x => x.idx === i);
    const isFirst = myPos === 0;
    const isLast  = myPos === siblings.length - 1;

    // Cursor initialisieren
    if (!verseCursors.has(vn)) verseCursors.set(vn, 0);
    let cursor = verseCursors.get(vn);

    // Entscheide: OpenAI nötig?
    const useOpenAI = hasSiblingSameVerse(data, i);

    let core = '';
    if (!useOpenAI) {
      // Kein Split-Kontext → komplettes full übernehmen
      item.arabic = full;
      // Cursor auf Ende, damit evtl. weitere (unerwartete) Teile nicht abgeschnitten werden
      verseCursors.set(vn, full.length);
    } else {
      try {
        const ctx = collectContext(data, i);
        core = await segmentWithOpenAI(item, ctx);
      } catch (e) {
        console.error(`OpenAI-Fehler in ${path.basename(fp)} [index ${i}]:`, e.message);
        core = ''; // lässt unten in den Fallback laufen
      }

      const { slice, newCursor } = sliceWithBoundaries(full, core, cursor, isFirst, isLast);
      item.arabic = slice;
      verseCursors.set(vn, newCursor);
    }

    // Sofort speichern (Fortschritt sichern)
    try {
      writeJson(fp, data);
      console.log(`→ Gespeichert: ${path.basename(fp)} [index ${i}]`);
    } catch (e) {
      console.error(`Fehler beim Schreiben ${path.basename(fp)} [index ${i}]:`, e.message);
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
