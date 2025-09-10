#!/usr/bin/env node
/**
 * Füllt leere `transcription` Felder mithilfe der OpenAI API.
 * - Liest EINE Zieldatei (Array von Segment-Objekten).
 * - Gruppiert nach `verse_number`.
 * - Pro Vers ruft OpenAI auf, um `transcription_full` in N zusammenhängende Teilstrings
 *   (genau aus dem Originaltext) passend zu den N `translation`-Segmenten aufzuteilen.
 * - Schreibt das Ergebnis in alle Items mit leerer `transcription`.
 * - Speichert die Datei NACH JEDEM geänderten Item (resumierbar).
 *
 * Nutzung:
 *   node 05_01_segment_transcription.cjs \
 *     --file ../public/surat/segmented/de/27/surah-22.json \
 *     --model gpt-4o
 *
 * Hinweise:
 * - Setze OPENAI_API_KEY in deiner Umgebung.
 * - `--model` optional (Default: gpt-4o).
 */

const fs = require('fs');
const path = require('path');
const OpenAI = require('openai');
require('dotenv').config({ path: '../.env.local' });

/* ------------------------------ CLI-Argumente ------------------------------ */

function getArg(name, def) {
  const i = process.argv.indexOf(`--${name}`);
  if (i !== -1 && i + 1 < process.argv.length) return process.argv[i + 1];
  return def;
}

const targetFile = path.resolve(getArg('file', path.join(__dirname, '../public/surat/segmented/de/27/surah-22.json')));
const MODEL = getArg('model', process.env.OPENAI_MODEL || 'gpt-4o'); // frei anpassbar
const DRY_RUN = getArg('dry-run', 'false') === 'true';

if (!process.env.OPENAI_API_KEY) {
  console.error('❌ Bitte OPENAI_API_KEY als Umgebungsvariable setzen.');
  process.exit(1);
}

const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
  // Node-SDK macht automatische Retries (2x) bei 408/409/429/5xx; anpassbar mit maxRetries. :contentReference[oaicite:0]{index=0}
  // maxRetries: 2,
});

/* --------------------------------- Utils ---------------------------------- */

function readJson(fp) {
  return JSON.parse(fs.readFileSync(fp, 'utf8'));
}
function writeJson(fp, obj) {
  if (DRY_RUN) return;
  fs.writeFileSync(fp, JSON.stringify(obj, null, 2), 'utf8');
}
function isEmptyTranscription(v) {
  return typeof v !== 'string' || v.trim() === '';
}
function norm(s) {
  return String(s || '').replace(/\s+/g, ' ').trim();
}

/* ------------------- Heuristik-Fallback (nur wenn nötig) ------------------- */
/** Fallback: proportionale Aufteilung + Schnapp an Whitespaces (Notanker). */
function fallbackSplit(full, translations) {
  const text = norm(full);
  if (!text) return translations.map(() => '');
  const weights = translations.map(t => {
    const cleaned = String(t || '').replace(/[^\p{Letter}\p{Mark}\s]/gu, '').replace(/\s+/g, ' ').trim();
    return cleaned.length || String(t || '').length || 1;
  });
  const total = weights.reduce((a, b) => a + b, 0) || translations.length;
  const desired = weights.map(w => Math.max(1, Math.round((w / total) * text.length)));
  const drift = text.length - desired.reduce((a, b) => a + b, 0);
  if (drift) {
    const i = desired.indexOf(Math.max(...desired));
    desired[i] += drift;
  }
  const out = [];
  let start = 0;
  for (let i = 0; i < desired.length; i++) {
    let end = i === desired.length - 1 ? text.length : start + desired[i];
    // an Wortgrenze schnappen
    const left = text.lastIndexOf(' ', end);
    const right = text.indexOf(' ', end);
    if (i !== desired.length - 1) {
      if (right !== -1 && right - end <= 12) end = right;
      else if (left !== -1 && end - left <= 12) end = left;
    }
    out.push(text.slice(start, end).trim());
    start = end;
  }
  return out;
}

/* ----------------------------- OpenAI-Aufruf ------------------------------ */
/**
 * Holt Segment-Indizes oder -Texte von OpenAI.
 * Wir nutzen die Responses API + JSON-Output-Modus. :contentReference[oaicite:1]{index=1}
 * Rückgabe: Array von Strings (eine Teil-Transkription pro Segment).
 */
async function segmentWithOpenAI(fullText, translations) {
  // Kurzer Guard
  const verse = norm(fullText);
  const trans = translations.map(norm);
  if (!verse || trans.length === 0) return trans.map(() => '');

  // Wir bitten das Modell, nur JSON zu liefern:
  // { "segments": [ {"index":0,"start":int,"end":int}, ... ] }
  // Start/Ende sind Zeichenindizes (end exklusiv) im EXACT selben String `verse`.
  // Danach schneiden wir serverseitig selbst zu (Garant für "echter Substring").
  const system = [
    `Du bist ein präziser Segmentierer für lateinische Umschrift (Quran-Transkription).`,
    `Aufgabe: Teile die gegebene Gesamt-Umschrift ('transcription_full') in N zusammenhängende Teilstücke, eines pro deutschem Übersetzungssegment.`,
    `WICHTIG:`,
    `- Jedes Teilstück MUSS ein KONTIGUER EXAKTER SUBSTRING von 'transcription_full' sein (keine Paraphrasen).`,
    `- Reihenfolge beibehalten, nicht überlappen.`,
    `- Gib Start/End-Indizes (end exklusiv) in Zeichenpositionen des GENAU übergebenen Strings.`,
    `- Nicht neu umschreiben; nutze ausschließlich Originaltext.`,
  ].join('\n');

  const user = {
    verse,
    segments: trans.map((t, i) => ({ index: i, translation: t })),
  };

  // JSON-Output erzwingen (einfach & robust)
  const response = await client.responses.create({
    model: MODEL,
    // Responses API akzeptiert "input" mit Rollen. :contentReference[oaicite:2]{index=2}
    input: [
      { role: 'system', content: system },
      {
        role: 'user',
        content: [
          { type: 'text', text: `transcription_full:\n${verse}` },
          { type: 'text', text: `Segments (in Reihenfolge):\n${JSON.stringify(user.segments, null, 2)}` },
          { type: 'text', text: `Antworte ausschließlich als JSON-Objekt mit Schema:\n{"segments":[{"index":number,"start":number,"end":number}]}` },
        ],
      },
    ],
    response_format: { type: 'json_object' }, // strukturierter JSON-Output (vereinfachte, kompatible Variante)
    max_output_tokens: 2000,
  });

  // Responses-Objekt auslesen
  let jsonText = '';
  try {
    // bevorzugt: gesamte Ausgabe als Text greifen
    jsonText = response.output_text ?? '';
    if (!jsonText) {
      // Fallback: erstes Text-Teil suchen
      const piece = response.output?.[0]?.content?.find(c => c.type === 'output_text');
      if (piece?.text) jsonText = piece.text;
    }
  } catch (_) {
    // ignore
  }

  let parsed;
  try {
    parsed = JSON.parse(jsonText);
  } catch (e) {
    console.warn('⚠️ OpenAI-JSON konnte nicht geparst werden – Fallback-Heuristik wird verwendet.');
    return fallbackSplit(verse, trans);
  }

  const cuts = Array.isArray(parsed?.segments) ? parsed.segments : [];
  if (cuts.length !== trans.length) {
    console.warn(`⚠️ Anzahl Segmente (${cuts.length}) ≠ Übersetzungen (${trans.length}) – Fallback.`);
    return fallbackSplit(verse, trans);
  }

  // Schneiden & sanity-check
  const out = [];
  for (let i = 0; i < cuts.length; i++) {
    const { start, end } = cuts[i] || {};
    const s = Number.isInteger(start) ? start : 0;
    const e = Number.isInteger(end) ? end : verse.length;
    if (s < 0 || e > verse.length || s >= e) {
      out.push('');
      continue;
    }
    out.push(verse.slice(s, e).trim());
  }

  // Falls leer/komisch → Fallback
  if (out.filter(Boolean).length === 0) {
    return fallbackSplit(verse, trans);
  }
  return out;
}

/* --------------------------------- Main ---------------------------------- */

(async function main() {
  let data;
  try {
    data = readJson(targetFile);
    if (!Array.isArray(data)) {
      console.error('❌ Zieldatei ist kein Array:', targetFile);
      process.exit(1);
    }
  } catch (e) {
    console.error(`❌ Fehler beim Lesen ${targetFile}:`, e.message);
    process.exit(1);
  }

  // verse_number -> Liste von Indizes (Datei-Reihenfolge)
  const groups = new Map();
  for (let i = 0; i < data.length; i++) {
    const it = data[i];
    if (!it || typeof it !== 'object') continue;
    const vn = it.verse_number;
    if (vn == null) continue;
    if (!groups.has(vn)) groups.set(vn, []);
    groups.get(vn).push(i);
  }

  // Cache: verse_number -> bereits berechnete Stücke (um API-Calls zu minimieren)
  const piecesCache = new Map();

  let totalFilled = 0;

  for (let i = 0; i < data.length; i++) {
    const item = data[i];
    if (!item || typeof item !== 'object') continue;
    if (!isEmptyTranscription(item.transcription)) continue; // nur leere füllen

    const vn = item.verse_number;
    const idxList = groups.get(vn) || [];
    if (idxList.length === 0) continue;

    // Verse-full finden (aus aktuellem oder Nachbar)
    let verseFull = norm(item.transcription_full);
    if (!verseFull) {
      for (const j of idxList) {
        const g = data[j];
        if (g?.transcription_full) { verseFull = norm(g.transcription_full); break; }
      }
    }
    if (!verseFull) {
      console.warn(`⚠️ verse_number=${vn}: keine "transcription_full" gefunden – übersprungen (Indices: ${idxList.join(', ')})`);
      continue;
    }

    // Übersetzungen in Gruppen-Reihenfolge
    const translations = idxList.map(j => norm(data[j]?.translation));

    // Stücke aus Cache oder OpenAI holen (ein Call pro Vers)
    let pieces = piecesCache.get(vn);
    if (!pieces) {
      try {
        pieces = await segmentWithOpenAI(verseFull, translations);
      } catch (e) {
        console.warn(`⚠️ OpenAI-Fehler bei verse_number=${vn}: ${e.message}. Fallback-Heuristik.`);
        pieces = fallbackSplit(verseFull, translations);
      }
      piecesCache.set(vn, pieces);
    }

    // Index im Gruppenkontext bestimmen
    const idxInGroup = idxList.indexOf(i);
    const newVal = (pieces && pieces[idxInGroup]) ? pieces[idxInGroup] : '';

    if (!isEmptyTranscription(newVal)) {
      data[i].transcription = newVal;

      if (!DRY_RUN) {
        try {
          writeJson(targetFile, data); // nach JEDEM Update speichern
          console.log(`💾 gespeichert – index=${data[i].index} verse_number=${vn}`);
        } catch (e) {
          console.error(`❌ Fehler beim Schreiben ${targetFile}:`, e.message);
          process.exit(1);
        }
      } else {
        console.log(`[DRY] Würde schreiben – index=${data[i].index} verse_number=${vn}`);
      }

      totalFilled++;
    }
    // Weiter zum nächsten leeren – dank Cache nur 1 API-Call pro Vers
  }

  if (totalFilled > 0) {
    console.log(`✅ Fertig: ${totalFilled} leere "transcription"-Werte gefüllt in ${targetFile}.`);
  } else {
    console.log('OK: Keine leeren "transcription" gefunden oder keine Änderungen nötig.');
  }
})().catch(err => {
  console.error('❌ Unerwarteter Fehler:', err);
  process.exit(1);
});
