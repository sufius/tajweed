#!/usr/bin/env node
/* eslint-disable no-console */
const fs = require('fs');
const path = require('path');

/* -----------------------------------------------------------------------------
 * CONFIG
 * ---------------------------------------------------------------------------*/
const copyTasks = [
  {
    fromFile: path.join(__dirname, '../public/surat/densed/surah-22.json'),
    toFile:   path.join(__dirname, '../public/surat/segmented/de/27/surah-22.json'),
    // matchKey defaults to 'verse_number'; change if needed
    // matchKey: 'verse_number',
    rules: [
      // copy source.transcription -> target.transcription_full
      { from: 'transcription', to: 'transcription_full' },
      // examples:
      // { from: 'arabic', to: 'arabic_full' },
    ]
  }
];

/* -----------------------------------------------------------------------------
 * Helpers
 * ---------------------------------------------------------------------------*/
function readJson(fp) {
  return JSON.parse(fs.readFileSync(fp, 'utf8'));
}
function writeJson(fp, obj) {
  fs.writeFileSync(fp, JSON.stringify(obj, null, 2), 'utf8');
}
function splitPath(dotPath) {
  return String(dotPath)
    .trim()
    .replace(/\[(\d+)\]/g, '.$1')
    .split('.')
    .filter(Boolean);
}
function getByPath(obj, dotPath) {
  const parts = splitPath(dotPath);
  let cur = obj;
  for (const p of parts) {
    if (cur == null) return undefined;
    cur = cur[p];
  }
  return cur;
}
function setByPath(obj, dotPath, value) {
  const parts = splitPath(dotPath);
  if (parts.length === 0) return;
  let cur = obj;
  for (let i = 0; i < parts.length - 1; i++) {
    const k = parts[i];
    if (cur[k] == null || typeof cur[k] !== 'object') {
      const nextKey = parts[i + 1];
      cur[k] = /^\d+$/.test(nextKey) ? [] : {};
    }
    cur = cur[k];
  }
  cur[parts[parts.length - 1]] = value;
}

/* -----------------------------------------------------------------------------
 * Copy for EVERY matching verse_number
 * ---------------------------------------------------------------------------*/
function runCopyTask(task) {
  const matchKey = task.matchKey || 'verse_number';
  const srcPath = path.resolve(task.fromFile);
  const dstPath = path.resolve(task.toFile);

  let srcArr, dstArr;
  try {
    srcArr = readJson(srcPath);
    if (!Array.isArray(srcArr)) return console.warn(`⚠️ Skip: ${srcPath} is not an array.`);
  } catch (e) {
    console.error(`❌ Error reading source ${srcPath}:`, e.message);
    return;
  }
  try {
    dstArr = readJson(dstPath);
    if (!Array.isArray(dstArr)) return console.warn(`⚠️ Skip: ${dstPath} is not an array.`);
  } catch (e) {
    console.error(`❌ Error reading target ${dstPath}:`, e.message);
    return;
  }

  // Build map: verse_number -> source item
  const sourceByKey = new Map();
  for (const item of srcArr) {
    if (item && typeof item === 'object') {
      const key = item[matchKey];
      if (key != null) sourceByKey.set(key, item);
    }
  }

  let changes = 0;

  // Iterate ALL target rows; copy for every row whose key matches
  for (const dstItem of dstArr) {
    if (!dstItem || typeof dstItem !== 'object') continue;
    const key = dstItem[matchKey];
    if (key == null) continue;

    const srcItem = sourceByKey.get(key);
    if (!srcItem) continue;

    for (const rule of task.rules) {
      const val = getByPath(srcItem, rule.from);
      if (typeof val === 'undefined') continue;

      const before = JSON.stringify(getByPath(dstItem, rule.to));
      setByPath(dstItem, rule.to, val);
      const after = JSON.stringify(getByPath(dstItem, rule.to));
      if (before !== after) changes++;
    }
  }

  if (changes > 0) {
    try {
      writeJson(dstPath, dstArr);
      console.log(`✅ Copied ${changes} value(s) from '${task.fromFile}' → '${task.toFile}' (matched by ${matchKey}).`);
    } catch (e) {
      console.error(`❌ Error writing ${dstPath}:`, e.message);
    }
  } else {
    console.log(`OK (no changes): ${task.toFile}`);
  }
}

/* -----------------------------------------------------------------------------
 * Run
 * ---------------------------------------------------------------------------*/
(function main() {
  for (const t of copyTasks) runCopyTask(t);
})();
