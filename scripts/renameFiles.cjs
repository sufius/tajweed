const fs = require('fs');
const path = require('path');

const directoryPath = path.join(__dirname, '../public/surat/segmented/de/27'); // Adjust path
const prefix = '';       // String to prepend
const removeStr = '_all_segmented';         // String to remove (set to '' if you don't want to remove anything)

fs.readdir(directoryPath, (err, files) => {
  if (err) {
    console.error('Error reading directory:', err);
    return;
  }

  files.forEach((file) => {
    let newFileName = file;

    // Remove specific string from filename
    if (removeStr && newFileName.includes(removeStr)) {
      newFileName = newFileName.replace(removeStr, '');
    }

    // Prepend prefix (only if not already present)
    if (prefix && !newFileName.startsWith(prefix)) {
      newFileName = prefix + newFileName;
    }

    // Rename if different
    if (newFileName !== file) {
      const oldFilePath = path.join(directoryPath, file);
      const newFilePath = path.join(directoryPath, newFileName);

      fs.rename(oldFilePath, newFilePath, (renameErr) => {
        if (renameErr) {
          console.error(`Error renaming file ${file}:`, renameErr);
        } else {
          console.log(`Renamed: ${file} -> ${newFileName}`);
        }
      });
    }
  });
});
