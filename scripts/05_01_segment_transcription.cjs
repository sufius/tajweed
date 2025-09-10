#!/usr/bin/env node
/**
 * Segmentiert "transcription_full" → "transcription" passend zur "translation".
 * - Speichert nach jedem Objekt (Fortschritt sicher)
 * - OpenAI nur, wenn Nachbar (prev/next) gleiche verse_number hat
 * - Token-Budget pro Tag mit Abbruch bei Limit
 *
 * Nutzung:
 *   node segment_transcription_with_budget.cjs
 *   node segment_transcription_with_budget.cjs --file surah-18.json
 *   node segment_transcription_with_budget.cjs --start-index 120
 *   node segment_transcription_with_budget.cjs --limit 248000
 *   node segment_transcription_with_budget.cjs --budget-file ./my_usage.json
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

const argLimit = process.argv.includes('--limit')
  ? Number(process.argv[process.argv.indexOf('--limit') + 1])
  : 248000;

const argBudgetFile = process.argv.includes('--budget-file')
  ? process.argv[process.argv.indexOf('--budget-file') + 1]
  : path.join(__dirname, '.openai_usage.json');

// ----- Token-Budget Verwaltung -----
class DailyTokenBudget {
  constructor(filePath, dailyLimit) {
    this.filePath = filePath;
    this.dailyLimit = Number.isFinite(dailyLimit) ? dailyLimit : 248000;
    const today = new Date();
    this.todayKey = today.toISOString().slice(0, 10); // YYYY-MM-DD
    this._load();
  }
  _load() {
    try {
      const raw = fs.existsSync(this.filePath) ? fs.readFileSync(this.filePath, 'utf8') : '{}';
      const data = JSON.parse(raw || '{}');
      if (data.date !== this.todayKey) {
        this.usage = 0;
        this._save();
      } else {
        this.usage = Number(data.usage) || 0;
      }
    } catch {
      this.usage = 0;
      this._save();
    }
  }
  _save() {
    fs.writeFileSync(this.filePath, JSON.stringify({ date: this.todayKey, usage: this.usage }, null, 2), 'utf8');
  }
  canSpend() {
    return this.usage < this.dailyLimit;
  }
  add(usedTokens) {
    if (!Number.isFinite(usedTokens) || usedTokens <= 0) return;
    this.usage += usedTokens;
    this._save();
  }
  getUsage() {
    return this.usage;
  }
  getRemaining() {
    return Math.max(0, this.dailyLimit - this.usage);
  }
}

const budget = new DailyTokenBudget(argBudgetFile, argLimit);

// ----- Utils -----
function readJson(fp) {
  return JSON.parse(fs.readFileSync(fp, 'utf8'));
}
function writeJson(fp, obj) {
  fs.writeFileSync(fp, JSON.stringify(obj, null, 2), 'utf8');
}
function isEmptyTranscription(item) {
  return item && typeof item === 'object' && (item.transcription === '' || item.transcription === undefined);
}
function findFirstEmptyTranscriptionIndex(arr, from = 0) {
  for (let i = Math.max(0, from); i < arr.length; i++) {
    if (isEmptyTranscription(arr[i])) return i;
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
    if (it?.verse_number === vn && it?.transcription) {
      earlierSame.push({ translation: it.translation || '', transcription: it.transcription });
    }
  }
  return { prevSame, nextSame, earlierSame };
}

// ---- Randzeichen-Erkennung für lateinische Transkription ----
const RIGHT_BOUNDARY_RE = /[\s,;:.\-–—]+/u;
const LEFT_BOUNDARY_RE  = /[\s,;:.\-–—]+/u;
function expandRight(full, end) {
  if (end >= full.length) return end;
  const m = full.slice(end).match(RIGHT_BOUNDARY_RE);
  if (m && m.index === 0) return end + m[0].length;
  return end;
}
function expandLeft(full, start) {
  if (start <= 0) return start;
  let i = start - 1;
  while (i >= 0 && LEFT_BOUNDARY_RE.test(full[i])) i--;
  return i + 1;
}
function indexOfFrom(full, needle, fromIdx) {
  if (!needle) return -1;
  return full.indexOf(needle, fromIdx);
}
function sliceWithBoundaries(full, core, cursor, isFirstInVerse, isLastInVerse) {
  if (!core) return { slice: '', newCursor: cursor };
  const startCore = indexOfFrom(full, core, cursor);
  if (startCore === -1) {
    const anywhere = full.indexOf(core);
    if (anywhere === -1) {
      return { slice: full.slice(cursor), newCursor: full.length };
    }
    const endCoreA = anywhere + core.length;
    const endA = expandRight(full, endCoreA);
    const startA = isFirstInVerse ? expandLeft(full, anywhere) : anywhere;
    return { slice: full.slice(startA, endA), newCursor: endA };
  }
  const endCore = startCore + core.length;
  const start = isFirstInVerse ? expandLeft(full, startCore) : startCore;
  const end = isLastInVerse ? full.length : expandRight(full, endCore);
  return { slice: full.slice(start, end), newCursor: end };
}

// ----- OpenAI-Aufruf (mit Budgetprüfung) -----
// (WICHTIG: jetzt translation → transcription aus transcription_full)
function buildPrompt({ transcription_full, translation, prevSame, nextSame, earlierSame }) {
  return `
Du segmentierst **lateinische Quran-Transkription**.

AUFGABE:
- Du erhältst:
  - "transcription_full": komplette Transkription eines Verses (lateinisch)
  - "translation": das Zielsegment (deutsche Übersetzung) für dieses Teilstück
- Finde in "transcription_full" den **zusammenhängenden Kern-Substring**, der semantisch zu dieser "translation" passt.
- Gib **exakt** diesen Kern-Substring zurück (ohne zusätzliche Zeichen, keine Normalisierung, keine Paraphrase).
- (Randzeichen/Leerzeichen an den Grenzen ergänzt das Programm selbst.)

KONTEXT (gleiche verse_number):
- Bereits segmentierte frühere Teile:
${earlierSame.length ? JSON.stringify(earlierSame, null, 2) : '[]'}

- Unmittelbares vorheriges Segment:
${prevSame ? JSON.stringify({ translation: prevSame.translation, transcription: prevSame.transcription || '' }, null, 2) : 'null'}

- Unmittelbares nächstes Segment:
${nextSame ? JSON.stringify({ translation: nextSame.translation, transcription: nextSame.transcription || '' }, null, 2) : 'null'}

DATEN:
{
  "transcription_full": ${JSON.stringify(transcription_full)},
  "translation": ${JSON.stringify(translation)}
}

AUSGABE (nur JSON-Objekt):
{
  "transcription": "<EXAKTER KERN-Substring aus transcription_full>"
}
`.trim();
}

async function segmentWithOpenAI(item, ctx) {
  if (!budget.canSpend()) {
    throw new Error(`Tageslimit erreicht (${budget.getUsage()}/${argLimit} Tokens).`);
  }

  const prompt = buildPrompt({
    transcription_full: item.transcription_full,
    translation: item.translation,
    prevSame: ctx.prevSame,
    nextSame: ctx.nextSame,
    earlierSame: ctx.earlierSame,
  });

  const res = await openai.chat.completions.create({
    model: 'gpt-4o',          // <- wie gewünscht: immer gpt-4o
    temperature: 0,
    messages: [{ role: 'user', content: prompt }],
    response_format: { type: "json_object" }
  });

  // Tokens verbuchen
  const used =
    (res.usage?.prompt_tokens || 0) +
    (res.usage?.completion_tokens || 0);
  budget.add(used);

  const content = res.choices?.[0]?.message?.content || '{}';
  let parsed = {};
  try { parsed = JSON.parse(content); } catch {}
  return typeof parsed.transcription === 'string' ? parsed.transcription : '';
}

// ----- Datei verarbeiten -----
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

  const startAt = Number.isFinite(argStartIndex) ? argStartIndex : findFirstEmptyTranscriptionIndex(data);
  if (startAt === -1) {
    console.log(`STOP: Alle transcription-Felder sind gefüllt in ${path.basename(fp)}.`);
    return { done: true };
  }

  console.log(`Verarbeite ${path.basename(fp)} ab Index ${startAt} … (Heute: ${budget.getUsage()}/${argLimit} Tokens)`);

  const verseCursors = new Map(); // vn -> cursor in transcription_full

  for (let i = startAt; i < data.length; i++) {
    const item = data[i];
    if (!item || typeof item !== 'object') continue;
    if (!isEmptyTranscription(item)) continue;

    const vn = item.verse_number;
    const full = item.transcription_full;
    if (!Number.isFinite(vn) || typeof full !== 'string') {
      console.warn(`Index ${i}: verse_number/transcription_full fehlt – übersprungen`);
      continue;
    }

    const siblings = data
      .map((obj, idx) => ({ obj, idx }))
      .filter(x => x.obj?.verse_number === vn);

    const myPos = siblings.findIndex(x => x.idx === i);
    const isFirst = myPos === 0;
    const isLast  = myPos === siblings.length - 1;

    if (!verseCursors.has(vn)) verseCursors.set(vn, 0);
    let cursor = verseCursors.get(vn);

    const useOpenAI = hasSiblingSameVerse(data, i);

    if (!useOpenAI) {
      // nur ein Segment für diesen Vers → kompletter Vers ist das Segment
      item.transcription = full;
      verseCursors.set(vn, full.length);
    } else {
      // Vor jedem Call prüfen, ob noch Budget da ist
      if (!budget.canSpend()) {
        console.error(`Abbruch: Tageslimit erreicht (${budget.getUsage()}/${argLimit} Tokens).`);
        return { done: false };
      }

      let core = '';
      try {
        const ctx = collectContext(data, i);
        core = await segmentWithOpenAI(item, ctx);
      } catch (e) {
        console.error(`OpenAI-Fehler in ${path.basename(fp)} [index ${i}]:`, e.message);
        core = '';
      }

      const { slice, newCursor } = sliceWithBoundaries(full, core, cursor, isFirst, isLast);
      item.transcription = slice;
      verseCursors.set(vn, newCursor);
    }

    // Sofort speichern (Fortschritt sichern)
    try {
      writeJson(fp, data);
      console.log(`→ Gespeichert: ${path.basename(fp)} [index ${i}]  | Budget: ${budget.getUsage()}/${argLimit}`);
    } catch (e) {
      console.error(`Fehler beim Schreiben ${path.basename(fp)} [index ${i}]:`, e.message);
      return { done: false };
    }
  }

  const remaining = findFirstEmptyTranscriptionIndex(data);
  return { done: remaining === -1 };
}

// ----- Main -----
(async () => {
  if (!process.env.OPENAI_API_KEY) {
    console.error('❌ Bitte OPENAI_API_KEY in ../.env.local setzen.');
    process.exit(1);
  }

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

    if (!budget.canSpend()) {
      console.error(`Abbruch: Tageslimit erreicht (${budget.getUsage()}/${argLimit} Tokens).`);
      process.exit(1);
    }
  }

  if (allDone) {
    console.log('Alle transcription-Felder sind bereits gefüllt – stoppe das Script.');
  } else {
    console.log('Durchlauf beendet (für nächste Runs bleibt der Fortschritt erhalten).');
  }
})();
