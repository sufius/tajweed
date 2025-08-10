const fs = require('fs');
const path = require('path');

const sourceDir = path.join(__dirname, '../public/surat/transcription');   // input files
const outDir    = path.join(__dirname, '../public/surat/tafsir');  // output folder

// Ensure output directory exists
fs.mkdirSync(outDir, { recursive: true });

fs.readdir(sourceDir, (err, files) => {
  if (err) {
    console.error('Error reading source directory:', err);
    process.exit(1);
  }

  files
    .filter(f => path.extname(f) === '.json')
    .forEach(file => {
      const filePath = path.join(sourceDir, file);

      fs.readFile(filePath, 'utf8', (readErr, data) => {
        if (readErr) {
          console.error(`Error reading file ${file}:`, readErr);
          return;
        }

        try {
          const json = JSON.parse(data);

          // Locate the tafsir object
          const kemenag =
            json?.tafsirs?.id?.kemenag ||
            json?.tafsir?.id?.kemenag || // tolerate slight schema variants
            null;

          if (!kemenag || typeof kemenag !== 'object') {
            console.warn(`No tafsirs.id.kemenag found in ${file} — skipping.`);
            return;
          }

          // Convert {"1": "...", "2": "..."} -> ["...", "..."] in numeric order
          const tafsirArray = Object.keys(kemenag)
            .map(k => Number(k))
            .filter(n => Number.isFinite(n))
            .sort((a, b) => a - b)
            .map(n => kemenag[String(n)]);

          // Determine surah number
          const surahNumber =
            json.chapter_number ??
            json.chapterNumber ??
            // fallback: try to extract trailing number from filename (e.g., "surah-102.json")
            (() => {
              const m = file.match(/(\d+)(?=\.json$)/);
              return m ? Number(m[1]) : undefined;
            })();

          if (!surahNumber || !Number.isFinite(surahNumber)) {
            console.warn(`Could not determine surah number for ${file} — skipping write.`);
            return;
          }

          const outFile = path.join(outDir, `surah-${surahNumber}.json`);
          fs.writeFile(outFile, JSON.stringify(tafsirArray, null, 2), 'utf8', (writeErr) => {
            if (writeErr) {
              console.error(`Error writing ${path.basename(outFile)}:`, writeErr);
            } else {
              console.log(`Wrote: ${path.basename(outFile)} (${tafsirArray.length} items)`);
            }
          });
        } catch (e) {
          console.error(`Error parsing JSON in ${file}:`, e);
        }
      });
    });
});