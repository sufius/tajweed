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

          // Rename the property if it exists
          if (jsonData.hasOwnProperty('chapterNameRomanized')) {
            jsonData.chapterTransliterated = jsonData.chapterNameRomanized;
            delete jsonData.chapterNameRomanized;
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
