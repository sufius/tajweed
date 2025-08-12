const fs = require('fs');
const path = require('path');

const directoryPath = path.join(__dirname, '../public/surat/segmented/de/27'); // Adjust path

// Apply at most ONE rename per property name (first matching rule)
const renameRules = [
  { from: 'splitted', to: 'segmented' },
  // { from: 'foo', to: 'bar' }
];

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
          const arr = JSON.parse(data);
          if (!Array.isArray(arr)) {
            console.warn(`Skipping ${file} — not an array`);
            return;
          }

          const updated = arr.map(item => {
            if (item === null || typeof item !== 'object') return item;

            const out = {};
            Object.keys(item).forEach(key => {
              const rule = renameRules.find(r => r.from === key);
              const newKey = rule ? rule.to : key; // rename exactly one matching key
              out[newKey] = item[key];
            });
            return out;
          });

          fs.writeFile(filePath, JSON.stringify(updated, null, 2), 'utf8', (writeErr) => {
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
