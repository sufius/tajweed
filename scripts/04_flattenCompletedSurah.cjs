const fs = require('fs');
const path = require('path');

const directoryPath = path.join(__dirname, '../public/surat/segmented/de/27'); // <-- adjust folder

fs.readdir(directoryPath, (err, files) => {
  if (err) {
    console.error('Error reading directory:', err);
    return;
  }

  files
    .filter(file => path.extname(file) === '.json')
    .forEach(file => {
      const filePath = path.join(directoryPath, file);

      fs.readFile(filePath, 'utf8', (readErr, data) => {
        if (readErr) {
          console.error(`Error reading file ${file}:`, readErr);
          return;
        }

        try {
          const input = JSON.parse(data);
          if (!Array.isArray(input)) {
            console.warn(`Skipping ${file} — expected an array.`);
            return;
          }

          // 1) Flatten
          const flat = [];
          for (const verse of input) {
            const baseVerseNumber =
              verse?.verse_number ??
              verse?.verseNumber ??
              undefined;

            if (Array.isArray(verse?.segmented) && verse.segmented.length > 0) {
              for (const seg of verse.segmented) {
                const verseNum = seg?.belongs_to_verse_number ?? baseVerseNumber;
                flat.push({
                  __verse_number: verseNum,
                  __translation: seg?.translation,
                  __uthmani: seg?.text_uthmani,
                  __transcribed: seg?.text_uthmani_transcribed,
                });
              }
            } else {
              flat.push({
                __verse_number: baseVerseNumber,
                __translation: verse?.translation,
                __uthmani: verse?.text_uthmani,
                __transcribed: verse?.text_uthmani_transcribed,
              });
            }
          }

          // 2) Add index and emit with desired key order
          const output = flat.map((row, i) => {
            const out = {};
            out.index = i + 1;
            out.verse_number = row.__verse_number;

            // Keep the same field order as requested
            if (row.__translation !== undefined) out.translation = row.__translation;
            if (row.__uthmani !== undefined) out.text_uthmani = row.__uthmani;
            if (row.__transcribed !== undefined) out.text_uthmani_transcribed = row.__transcribed;
            return out;
          });

          fs.writeFile(filePath, JSON.stringify(output, null, 2), 'utf8', (writeErr) => {
            if (writeErr) {
              console.error(`Error writing file ${file}:`, writeErr);
            } else {
              console.log(`Updated: ${file} (${output.length} items)`);
            }
          });
        } catch (parseErr) {
          console.error(`Error parsing JSON in file ${file}:`, parseErr);
        }
      });
    });
});
