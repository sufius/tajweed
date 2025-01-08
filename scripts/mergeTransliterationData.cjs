const fs = require('fs');
const path = require('path');

// Source directories
const sourceDir = path.join(__dirname, '../public/source');
const targetDir = path.join(__dirname, '../public/surat');

// Function to process files
function processFiles() {
  fs.readdir(sourceDir, (err, files) => {
    if (err) {
      console.error('Error reading source directory:', err);
      return;
    }

    files.forEach((file) => {
      const surahNumber = path.basename(file, '.json'); // Extract surah number
      const sourceFilePath = path.join(sourceDir, file);
      const targetFilePath = path.join(targetDir, `wbw-surah-${surahNumber}.json`);

      // Read source file
      fs.readFile(sourceFilePath, 'utf8', (err, sourceData) => {
        if (err) {
          console.error(`Error reading source file (${sourceFilePath}):`, err);
          return;
        }

        // Read target file
        fs.readFile(targetFilePath, 'utf8', (err, targetData) => {
          if (err) {
            console.error(`Error reading target file (${targetFilePath}):`, err);
            return;
          }

          try {
            const sourceJson = JSON.parse(sourceData);
            const targetJson = JSON.parse(targetData);

            // Ensure "latins" and "verses" properties exist
            if (Array.isArray(sourceJson.latins) && Array.isArray(targetJson.verses)) {
              targetJson.verses.forEach((verse, index) => {
                // Add text_uthmani_transcribed from latins at the same index
                if (sourceJson.latins[index]) {
                  verse.text_uthmani_transcribed = sourceJson.latins[index];
                }
              });
            } else {
              console.warn(`Missing or invalid "latins" or "verses" in Surah ${surahNumber}`);
            }

            // Write updated target JSON back to file
            fs.writeFile(targetFilePath, JSON.stringify(targetJson, null, 2), (err) => {
              if (err) {
                console.error(`Error writing target file (${targetFilePath}):`, err);
              } else {
                console.log(`Processed: Surah ${surahNumber}`);
              }
            });
          } catch (parseErr) {
            console.error(`Error parsing JSON for Surah ${surahNumber}:`, parseErr);
          }
        });
      });
    });
  });
}

// Run the script
processFiles();
