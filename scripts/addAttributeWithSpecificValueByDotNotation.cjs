#!/usr/bin/env node
/* eslint-disable no-console */

const fs = require('fs');
const path = require('path');

/**
 * CONFIG
 * ---------------------------------------------------------------------------*/
// JSON file to update:
const targetFile = path.join(__dirname, '../public/surat/segmented/de/27/surah-22.json');

// Attributes to add (dot-notation supported)
const addRules = [
  { path: 'transcription', value: '' },
  // examples:
  // { path: 'transcription_full', value: '' },
  // { path: 'metadata.checked', value: false },
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
  const last = parts[parts.length - 1];
  if (!(last in cur)) {
    cur[last] = value;
  }
}

/* -----------------------------------------------------------------------------
 * Run
 * ---------------------------------------------------------------------------*/
function main() {
  const fp = path.resolve(targetFile);
  let data;
  try {
    data = readJson(fp);
  } catch (e) {
    console.error(`❌ Error reading ${fp}:`, e.message);
    return;
  }

  let changed = false;

  // If it's an array: apply to each element
  if (Array.isArray(data)) {
    for (const item of data) {
      if (item && typeof item === 'object') {
        for (const rule of addRules) {
          const before = JSON.stringify(item);
          setByPath(item, rule.path, rule.value);
          const after = JSON.stringify(item);
          if (before !== after) changed = true;
        }
      }
    }
  } else if (data && typeof data === 'object') {
    // If it's a single object
    for (const rule of addRules) {
      const before = JSON.stringify(data);
      setByPath(data, rule.path, rule.value);
      const after = JSON.stringify(data);
      if (before !== after) changed = true;
    }
  }

  if (changed) {
    try {
      writeJson(fp, data);
      console.log(`✅ Added attributes to ${targetFile}`);
    } catch (e) {
      console.error(`❌ Error writing ${fp}:`, e.message);
    }
  } else {
    console.log(`OK (no changes): ${targetFile}`);
  }
}

main();
