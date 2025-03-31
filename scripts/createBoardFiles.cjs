const fs = require('fs');
const path = require('path');
const glob = require('glob');

const sourceDir = path.join(__dirname, '../public/surat');
const destDir = path.join(__dirname, '../public/boards');

// Ensure the destination directory exists
if (!fs.existsSync(destDir)) {
  fs.mkdirSync(destDir, { recursive: true });
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
          // Find the translation with resource_id === 445
          const translationObj = (verse.translations || []).find(t => t.resource_id === 445);
          return {
            verse_number: verse.verse_number,
            text_uthmani: verse.text_uthmani,
            text_uthmani_transcribed: verse.text_uthmani_transcribed,
            translation: translationObj ? translationObj.text : null
          };
        });
        
        // Determine the chapter number either from the JSON data or fallback to the filename
        const chapterNumber = jsonData.chapter_number ||
          path.basename(file).replace('surah-', '').replace('.json', '');
          
        const newData = {
          chapter_number: chapterNumber,
          verses: newVerses
        };

        const destFile = path.join(destDir, `surah-${chapterNumber}.json`);
        fs.writeFile(destFile, JSON.stringify(newData, null, 2), 'utf8', err => {
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
