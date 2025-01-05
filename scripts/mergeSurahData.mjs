import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';


// const Tajweed = require('tajweed');
import {Tajweed}  from 'tajweed';

const __filename = fileURLToPath(import.meta.url);
// Get the current directory
const __dirname = dirname(__filename);

const directoryPath = path.join(__dirname, '../public/surat/');
const parseTajweed = new Tajweed();

fs.readdir(directoryPath, (err, files) => {
    if (err) {
        console.error('Unable to scan directory:', err);
        return;
    }

    // Filter out only the `surah-*.json` and `wbw-surah-*.json` files
    const surahFiles = files.filter(file => file.startsWith('surah-') && file.endsWith('.json'));
    const wbwSurahFiles = files.filter(file => file.startsWith('wbw-surah-') && file.endsWith('.json'));

    // Process each surah file
    surahFiles.forEach(surahFile => {
        const surahNumber = surahFile.match(/surah-(\d+).json/)[1]; // Extract surah number
        const wbwSurahFile = `wbw-surah-${surahNumber}.json`;

        // Find the corresponding wbw-surah file
        if (wbwSurahFiles.includes(wbwSurahFile)) {
            const surahFilePath = path.join(directoryPath, surahFile);
            const wbwSurahFilePath = path.join(directoryPath, wbwSurahFile);

            // Read the content of both files
            const surahData = JSON.parse(fs.readFileSync(surahFilePath, 'utf-8'));
            const wbwSurahData = JSON.parse(fs.readFileSync(wbwSurahFilePath, 'utf-8'));

            // // Merge the data
            let mergedData = {
                ...wbwSurahData,
                englishName: surahData.data.englishName,
                name: surahData.data.name,
                englishNameTranslation: surahData.data.englishNameTranslation,
                revelationType: surahData.data.revelationType,
                numberOfAyahs: surahData.data.numberOfAyahs,
                number: surahData.data.number,
                verses: wbwSurahData.verses.map((ayah, index) =>  { return {
                    ...ayah,
                    text_uthmani_tajweed: surahData.data.ayahs[index].text,
                    text_uthmani_tajweed_parsed: parseTajweed.parse(surahData.data.ayahs[index].text,true),
                } })
            };

            // // Write the merged data back into the wbw-surah file
            fs.writeFileSync(wbwSurahFilePath, JSON.stringify(mergedData, null, 2), 'utf-8');
            console.log(`Merged data for surah ${surahNumber} into ${wbwSurahFile}`);
        } else {
            console.log(`No corresponding wbw-surah file found for ${surahFile}`);
        }
    });
});
