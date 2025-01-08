const fs = require('fs');
const path = require('path');

const directoryPath = path.join(__dirname, '../public/surat'); // Adjust this path if needed

fs.readdir(directoryPath, (err, files) => {
  if (err) {
    console.error('Error reading directory:', err);
    return;
  }

  files.forEach((file) => {
    // Check if the filename includes "wbw-surah"
    if (file.includes('wbw-surah')) {
      const oldFilePath = path.join(directoryPath, file);
      const newFileName = file.replace('wbw-surah', 'surah');
      const newFilePath = path.join(directoryPath, newFileName);

      // Rename the file
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
