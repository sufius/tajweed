const fs = require('fs');
const path = require('path');

const directoryPath = path.join(__dirname, '../public/surat/complete'); // Adjust path

// Rename rules using dot-notation
const renameRules = [
  { from: 'verses.translations.text', to: 'verses.translations.translation' },
  // { from: 'verses.text_uthmani_transcribed', to: 'verses.transcription' }
];

// Helper to rename a property inside an object by dot path
function renameByPath(obj, fromPath, toPath) {
  const fromParts = fromPath.split('.');
  const toParts = toPath.split('.');

  function walk(current, fromArr, toArr) {
    if (!current) return;
    if (Array.isArray(current)) {
      current.forEach(el => walk(el, fromArr, toArr));
      return;
    }
    if (typeof current !== 'object') return;

    if (fromArr.length === 1 && toArr.length === 1) {
      if (Object.prototype.hasOwnProperty.call(current, fromArr[0])) {
        current[toArr[0]] = current[fromArr[0]];
        delete current[fromArr[0]];
      }
      return;
    }

    const nextFrom = current[fromArr[0]];
    const nextTo = toArr[0];

    if (fromArr.length > 1 && toArr.length > 1) {
      if (Object.prototype.hasOwnProperty.call(current, fromArr[0])) {
        walk(nextFrom, fromArr.slice(1), toArr.slice(1));
      }
    }
  }

  walk(obj, fromParts, toParts);
}

fs.readdir(directoryPath, (err, files) => {
  if (err) {
    console.error('Error reading directory:', err);
    return;
  }

  files
    .filter(file => path.extname(file) === '.json')
    .forEach(file => {
      const filePath = path.join(directoryPath, file);

      fs.readFile(filePath, 'utf8', (readErr, data) => {
        if (readErr) {
          console.error(`Error reading file ${file}:`, readErr);
          return;
        }

        try {
          const jsonData = JSON.parse(data);

          renameRules.forEach(rule => {
            renameByPath(jsonData, rule.from, rule.to);
          });

          fs.writeFile(filePath, JSON.stringify(jsonData, null, 2), 'utf8', (writeErr) => {
            if (writeErr) {
              console.error(`Error writing file ${file}:`, writeErr);
            } else {
              console.log(`Updated file: ${file}`);
            }
          });
        } catch (parseErr) {
          console.error(`Error parsing JSON in file ${file}:`, parseErr);
        }
      });
    });
});
