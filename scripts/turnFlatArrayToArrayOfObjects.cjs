const fs = require('fs');
const path = require('path');

const label = 'tafsir';
const directoryPath = path.join(__dirname, `../public/surat/${label}`); // folder containing the array files

fs.readdir(directoryPath, (err, files) => {
  if (err) {
    console.error('Error reading directory:', err);
    return;
  }

  files
    .filter(f => path.extname(f) === '.json')
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
            console.warn(`Skipping ${file} — not a plain array`);
            return;
          }

          const updated = arr.map((text, idx) => ({
            verse_number: idx + 1,
            [label]: text
          }));

          fs.writeFile(filePath, JSON.stringify(updated, null, 2), 'utf8', (writeErr) => {
            if (writeErr) {
              console.error(`Error writing ${file}:`, writeErr);
            } else {
              console.log(`Updated: ${file}`);
            }
          });
        } catch (e) {
          console.error(`Error parsing JSON in ${file}:`, e);
        }
      });
    });
});
