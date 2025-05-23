const fs = require('fs');
const path = require('path');
const glob = require('glob');
const { exit } = require('process');

// 19; // en - https://raw.githubusercontent.com/fawazahmed0/quran-api/refs/heads/1/database/originals/en.pickthall
// 27; // de - https://raw.githubusercontent.com/fawazahmed0/quran-api/refs/heads/1/database/originals/de.bubenheim
// 79; // ru - https://raw.githubusercontent.com/fawazahmed0/quran-api/refs/heads/1/database/originals/rus-abuadel.txt
// 45; // ru - https://raw.githubusercontent.com/fawazahmed0/quran-api/refs/heads/1/database/originals/rus-elmirkuliev.txt
// 445; // ru - https://raw.githubusercontent.com/fawazahmed0/quran-api/refs/heads/1/database/originals/rus-vporokhova.txt
const translationKey = "de-27";

// Source directories
const sourceDir = path.join(__dirname, '../public/surat-densed');
const targetDir = path.join(__dirname, '../public/translations-' + translationKey);

// Use glob to match all surah files in the source directory
glob(path.join(sourceDir, 'surah-*.json'), (err, files) => {
  if (err) {
    console.error('Error finding files:', err);
    return;
  }

  files.forEach(file => {
    fs.readFile(file, 'utf8', (err, data) => {
      if (err) {
        console.error(`Error reading file ${file}:`, err);
        return;
      }

      try {
        // Determine the chapter number either from the JSON data or fallback to the filename
        const chapterNumber = path.basename(file).replace('surah-', '').replace('.json', '');
        const destFile = path.join(targetDir, `surah-${chapterNumber}_segmented_semantic.json`);
        // Read the existing file
        let existingData = {};
        try {
          existingData = JSON.parse(fs.readFileSync(destFile, 'utf-8'));
        } catch (error) {
          console.error(`Error reading file for Surah ${surahNumber}:`, error.message);
          return;
        }

        const jsonData = JSON.parse(data) || [];
        jsonData.forEach((verse, index) => {
          existingData[index].text_uthmani = verse.text_uthmani;
          existingData[index].text_uthmani_transcribed = verse.text_uthmani_transcribed;
        });

        fs.writeFile(destFile, JSON.stringify(existingData, null, 2), 'utf8', err => {
          if (err) {
            console.error(`Error writing file ${destFile}:`, err);
          } else {
            console.log(`Created file: ${destFile}`);
          }
        });

      } catch (parseErr) {
        console.error(`Error parsing JSON from file ${file}:`, parseErr);
      }
    });
  });
});

