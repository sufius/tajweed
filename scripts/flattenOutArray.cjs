const fs = require('fs');
const path = require('path');

const sourceDir = path.join(__dirname, '../public/surat/transcription'); // folder with JSON files

fs.readdir(sourceDir, (err, files) => {
  if (err) {
    console.error('Error reading source directory:', err);
    process.exit(1);
  }

  files
    .filter(f => path.extname(f) === '.json')
    .forEach(file => {
      const filePath = path.join(sourceDir, file);

      fs.readFile(filePath, 'utf8', (readErr, data) => {
        if (readErr) {
          console.error(`Error reading file ${file}:`, readErr);
          return;
        }

        try {
          const json = JSON.parse(data);

          if (!Array.isArray(json.latins)) {
            console.warn(`No "latins" array in ${file} — skipping.`);
            return;
          }

          // Overwrite the same file with only the latins array
          fs.writeFile(filePath, JSON.stringify(json.latins, null, 2), 'utf8', (writeErr) => {
            if (writeErr) {
              console.error(`Error writing file ${file}:`, writeErr);
            } else {
              console.log(`Updated file: ${file}`);
            }
          });
        } catch (e) {
          console.error(`Error parsing JSON in ${file}:`, e);
        }
      });
    });
});
