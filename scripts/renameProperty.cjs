const fs = require('fs');
const path = require('path');

const directoryPath = path.join(__dirname, '../public/surat'); // Adjust this path as necessary

fs.readdir(directoryPath, (err, files) => {
  if (err) {
    console.error('Error reading directory:', err);
    return;
  }

  files.forEach((file) => {
    const filePath = path.join(directoryPath, file);

    // Process only JSON files
    if (path.extname(file) === '.json') {
      fs.readFile(filePath, 'utf8', (readErr, data) => {
        if (readErr) {
          console.error(`Error reading file ${file}:`, readErr);
          return;
        }

        try {
          const jsonData = JSON.parse(data);

        let toRename = {
            "chapterNumber" : "chapter_number",
            "revelationOrder" : "revelation_order",
            "revelationPlace" : "revelation_place",
            "chapterTransliterated" : "chapter_transliterated",
            "numberOfAyahs" : "number_of_ayahs",
            "chapterNameArabic" : "chapter_name_arabic",
            "chapterNameTranscribed" : "chapter_name_transcribed",
            "chapterNameTranslated" : "chapter_name_translated"
        };

        for (fieldIndex in toRename) {
            // Rename the property if it exists
            if (jsonData.hasOwnProperty(fieldIndex)) {
                jsonData[toRename[fieldIndex]] = jsonData[fieldIndex];
                delete jsonData[fieldIndex];
            }
        }

        // Write the updated JSON back to the file
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
    }
  });
});
