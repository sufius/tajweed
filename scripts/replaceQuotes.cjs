const fs = require('fs');
const path = require('path');

// Directory containing the JSON files
const directoryPath = path.join(__dirname, '../public/surat');

// Function to replace all \" with single quotes in a file
function replaceEscapedQuotes(content) {
  return content.replace(/\\"/g, "'");
}

// Process all JSON files in the directory
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

        const updatedData = replaceEscapedQuotes(data);

        // Write the updated content back to the file
        fs.writeFile(filePath, updatedData, 'utf8', (writeErr) => {
          if (writeErr) {
            console.error(`Error writing file ${file}:`, writeErr);
          } else {
            console.log(`Updated file: ${file}`);
          }
        });
      });
    }
  });
});
