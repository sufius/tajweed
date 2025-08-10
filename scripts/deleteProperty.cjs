const fs = require('fs');
const path = require('path');

const directoryPath = path.join(__dirname, '../public/surat/transcription'); // Adjust this path as necessary

fs.readdir(directoryPath, (err, files) => {
  if (err) {
    console.error('Error reading directory:', err);
    return;
  }

  files.forEach((file) => {
    const filePath = path.join(directoryPath, file);

    // Process only JSON files
    if (path.extname(file) === '.json') {
      // if (path.extname(file) === '.json') {
      fs.readFile(filePath, 'utf8', (readErr, data) => {
        if (readErr) {
          console.error(`Error reading file ${file}:`, readErr);
          return;
        }

        try {
          const jsonData = JSON.parse(data);

          // List of properties to delete
          const toDelete = [
            "tafsirs",
          ];

          
          // jsonData.forEach((item) => {
          //   debugger
          //   toDelete.forEach((prop) => {
          //     if (item.hasOwnProperty(prop)) {
          //       console.log(item[prop])
          //       delete item[prop];
          //     }
          //   });
          // });

            toDelete.forEach((prop) => {
              if (jsonData.hasOwnProperty(prop)) {
                debugger
                delete jsonData[prop];
              }
            });


          // Write the updated JSON back to the file
          fs.writeFile(filePath, JSON.stringify(jsonData, null, 2), 'utf8', (writeErr) => {
            if (writeErr) {
               console.error(`Error writing file ${file}:`, writeErr);
             } else {
               console.log(`Updated file: ${filePath}`);
             }
          });


        } catch (parseErr) {
          console.error(`Error parsing JSON in file ${file}:`, parseErr);
        }
      });
    }
  });
});
