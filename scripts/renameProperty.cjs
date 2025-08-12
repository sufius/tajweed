const fs = require('fs');
const path = require('path');

const directoryPath = path.join(__dirname, '../public/surat/transcription'); // Adjust path

// Rename rules
const renameRules = [
  { from: 'text', to: 'transcription' },
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
            renameRules.forEach(rule => {
              if (item.hasOwnProperty(rule.from)) {
                item[rule.to] = item[rule.from];
                delete item[rule.from];
              }
            });
            return item;
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
