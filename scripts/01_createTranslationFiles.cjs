const fs = require('fs');
const path = require('path');
const glob = require('glob');

const sourceDir = path.join(__dirname, '../public/surat');
const destDir = path.join(__dirname, '../public/translations');
// 19; // en - https://raw.githubusercontent.com/fawazahmed0/quran-api/refs/heads/1/database/originals/en.pickthall
// 27; // de - https://raw.githubusercontent.com/fawazahmed0/quran-api/refs/heads/1/database/originals/de.bubenheim
// 79; // ru - https://raw.githubusercontent.com/fawazahmed0/quran-api/refs/heads/1/database/originals/rus-abuadel.txt
// 45; // ru - https://raw.githubusercontent.com/fawazahmed0/quran-api/refs/heads/1/database/originals/rus-elmirkuliev.txt
// 445; // ru - https://raw.githubusercontent.com/fawazahmed0/quran-api/refs/heads/1/database/originals/rus-vporokhova.txt
const translationKey = 27;

// Ensure the destination directory exists
if (!fs.existsSync(`${destDir}-${translationKey}`)) {
  fs.mkdirSync(`${destDir}-${translationKey}`, { recursive: true });
}

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
        const jsonData = JSON.parse(data);
        const newVerses = (jsonData.verses || []).map(verse => {
          // Find the translation with resource_id
          const translationObj = (verse.translations || []).find(t => t.resource_id === translationKey);
          return {
            verse_number: verse.verse_number,
            translation: translationObj ? translationObj.text : null
          };
        });
        
        // Determine the chapter number either from the JSON data or fallback to the filename
        const chapterNumber = jsonData.chapter_number ||
          path.basename(file).replace('surah-', '').replace('.json', '');


        const destFile = path.join(`${destDir}-${translationKey}`, `surah-${chapterNumber}.json`);
        fs.writeFile(destFile, JSON.stringify(newVerses, null, 2), 'utf8', err => {
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
