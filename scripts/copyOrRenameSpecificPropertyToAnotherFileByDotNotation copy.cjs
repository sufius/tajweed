#!/usr/bin/env node
/* eslint-disable no-console */

const fs = require('fs');
const path = require('path');

/* -----------------------------------------------------------------------------
 * CONFIG
 * ---------------------------------------------------------------------------*/

// 1) Rename properties INSIDE a single target file (no source file involved)
const renameTasks = [
  // Example:
  {
    targetFile: path.join(__dirname, '../public/surat/segmented/de/27/surah-22.json'),
    // optional: matchKey to align with your data structure; defaults to 'verse_number'
    // matchKey: 'verse_number',
    rules: [
      { from: 'arabic', to: 'arabic_full' },
    ],
  },
];

// 2) Copy properties FROM a source file TO a target file (does NOT delete at source)
const copyTasks = [
  {
    fromFile: path.join(__dirname, '../public/surat/densed/surah-22.json'),
    toFile:   path.join(__dirname, '../public/surat/segmented/de/27/surah-22.json'),
    // optional: matchKey (default 'verse_number')
    // matchKey: 'verse_number',
    rules: [
      { from: 'transcription', to: 'transcription_full' },
    ],
  },
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

// Normalize a path like "a.b[0].c" → ["a","b","0","c"]
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
      // if next is a number → create array, else object
      const nextKey = parts[i + 1];
      cur[k] = /^\d+$/.test(nextKey) ? [] : {};
    }
    cur = cur[k];
  }
  cur[parts[parts.length - 1]] = value;
}

function deleteByPath(obj, dotPath) {
  const parts = splitPath(dotPath);
  if (parts.length === 0) return;
  let cur = obj;
  for (let i = 0; i < parts.length - 1; i++) {
    const k = parts[i];
    if (cur == null || typeof cur !== 'object') return;
    cur = cur[k];
  }
  if (cur && typeof cur === 'object') {
    delete cur[parts[parts.length - 1]];
  }
}

/* -----------------------------------------------------------------------------
 * Core operations
 * ---------------------------------------------------------------------------*/

// Rename properties INSIDE a single target file (array of verse objects)
function runRenameTask(task) {
  const matchKey = task.matchKey || 'verse_number';
  const fp = path.resolve(task.targetFile);

  let arr;
  try {
    arr = readJson(fp);
    if (!Array.isArray(arr)) {
      console.warn(`⚠️  Rename skipped: ${fp} is not an array.`);
      return;
    }
  } catch (e) {
    console.error(`❌ Error reading target file: ${fp}`, e.message);
    return;
  }

  let changed = false;

  for (const item of arr) {
    if (!item || typeof item !== 'object') continue;

    for (const rule of task.rules) {
      const val = getByPath(item, rule.from);
      if (typeof val !== 'undefined') {
        // write to new path
        setByPath(item, rule.to, val);
        // remove old path (true rename)
        deleteByPath(item, rule.from);
        changed = true;
      }
    }
  }

  if (changed) {
    try {
      writeJson(fp, arr);
      console.log(`✅ Renamed in: ${task.targetFile}`);
    } catch (e) {
      console.error(`❌ Error writing target file: ${fp}`, e.message);
    }
  } else {
    console.log(`OK (no changes): ${task.targetFile}`);
  }
}

// Copy properties FROM source file TO target file (match by verse_number)
function runCopyTask(task) {
  const matchKey = task.matchKey || 'verse_number';
  const srcPath = path.resolve(task.fromFile);
  const dstPath = path.resolve(task.toFile);

  let srcArr, dstArr;
  try {
    srcArr = readJson(srcPath);
    if (!Array.isArray(srcArr)) {
      console.warn(`⚠️  Copy skipped: ${srcPath} is not an array.`);
      return;
    }
  } catch (e) {
    console.error(`❌ Error reading source: ${srcPath}`, e.message);
    return;
  }

  try {
    dstArr = readJson(dstPath);
    if (!Array.isArray(dstArr)) {
      console.warn(`⚠️  Copy skipped: ${dstPath} is not an array.`);
      return;
    }
  } catch (e) {
    console.error(`❌ Error reading target: ${dstPath}`, e.message);
    return;
  }

  // Build quick lookup for target by matchKey
  const targetByKey = new Map();
  for (const item of dstArr) {
    if (item && typeof item === 'object') {
      const key = item[matchKey];
      if (key != null) targetByKey.set(key, item);
    }
  }

  let changed = false;

  // For each source item, copy each rule’s value into matching target item
  for (const srcItem of srcArr) {
    if (!srcItem || typeof srcItem !== 'object') continue;
    const key = srcItem[matchKey];
    if (key == null) continue;

    const dstItem = targetByKey.get(key);
    if (!dstItem || typeof dstItem !== 'object') continue;

    for (const rule of task.rules) {
      const val = getByPath(srcItem, rule.from);
      if (typeof val !== 'undefined') {
        const before = JSON.stringify(getByPath(dstItem, rule.to));
        setByPath(dstItem, rule.to, val);
        const after = JSON.stringify(getByPath(dstItem, rule.to));
        if (before !== after) changed = true;
      }
    }
  }

  if (changed) {
    try {
      writeJson(dstPath, dstArr);
      console.log(`✅ Copied from '${task.fromFile}' → '${task.toFile}'`);
    } catch (e) {
      console.error(`❌ Error writing target: ${dstPath}`, e.message);
    }
  } else {
    console.log(`OK (no changes): ${task.toFile}`);
  }
}

/* -----------------------------------------------------------------------------
 * Run all tasks
 * ---------------------------------------------------------------------------*/

function main() {
  // 1) Renames inside targets
  // for (const t of renameTasks) runRenameTask(t);

  // 2) Copies from sources to targets
  for (const t of copyTasks) runCopyTask(t);
}

main();
