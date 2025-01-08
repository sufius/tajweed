const fs = require('fs');
const path = require('path');

// Directory containing the JSON files
const directoryPath = path.join(__dirname, '../public/surat');

// Function to recursively sort object properties by name
function sortObject(obj) {
  if (Array.isArray(obj)) {
    return obj.map(sortObject); // Recursively sort array elements
  } else if (obj && typeof obj === 'object') {
    const sortedObj = {};
    Object.keys(obj)
      .sort() // Sort properties by name
      .forEach((key) => {
        sortedObj[key] = sortObject(obj[key]); // Recursively sort nested objects
      });
    return sortedObj;
  }
  return obj; // Return the value if it's not an object or array
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

        try {
          const jsonData = JSON.parse(data); // Parse JSON file
          const sortedData = sortObject(jsonData); // Sort properties

          // Write sorted JSON back to the file
          fs.writeFile(filePath, JSON.stringify(sortedData, null, 2), 'utf8', (writeErr) => {
            if (writeErr) {
              console.error(`Error writing file ${file}:`, writeErr);
            } else {
              console.log(`Sorted properties in file: ${file}`);
            }
          });
        } catch (parseErr) {
          console.error(`Error parsing JSON in file ${file}:`, parseErr);
        }
      });
    }
  });
});
