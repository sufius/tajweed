import fs from 'fs';
import path from 'path';
import axios from 'axios';
import { fileURLToPath } from 'url';

// Resolve __dirname in ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Path to the folder containing the files
const directoryPath = path.join(__dirname, '../public/surat/');
const languages = [
    "ru", "de", "tr", "ce", "he", "pl", "tt", "ug", 
    "uk", "es", "fr", "bs", "id", "nl", "it", "zh", 
    "bg", "pt", "ro", "cs", "fi", "no", "sr", "sv", "sq"
  ];

// Function to fetch data from the API
async function fetchChapterData(surahNumber, language = "en") {
    const url = `https://api.quran.com/api/v4/chapters/${surahNumber}?language=${language}`;
    try {
        const response = await axios.get(url);
        return response.data.chapter; // Assuming "chapter" contains the relevant data
    } catch (error) {
        console.error(`Error fetching data for Surah ${surahNumber}:`, error.message);
        return null;
    }
}

// Process files
fs.readdir(directoryPath, async (err, files) => {
    if (err) {
        console.error('Unable to scan directory:', err);
        return;
    }

    // Filter out only `wbw-surah-*.json` files
    const wbwSurahFiles = files.filter(file => file.startsWith('wbw-surah-') && file.endsWith('.json'));

    for (const wbwSurahFile of wbwSurahFiles) {
        const surahNumber = wbwSurahFile.match(/wbw-surah-(\d+).json/)[1]; // Extract Surah number

        // Fetch data from the API
        const chapterData = await fetchChapterData(surahNumber);

        if (chapterData) {
            const filePath = path.join(directoryPath, wbwSurahFile);

            // Read the existing wbw-surah file
            const wbwData = JSON.parse(fs.readFileSync(filePath, 'utf-8'));

            // Merge the data at the first level
            let mergedData = {
                ...wbwData,
                chapterNameArabic: chapterData.name_arabic,
                chapterNameTranscribed: chapterData.name_complex,
                chapterNameRomanized: chapterData.name_simple,
                chapterNameTranslated: {
                    "en": chapterData.translated_name
                },
                chapterNumber: chapterData.id,
                revelationOrder: chapterData.revelation_order,
                revelationPlace: chapterData.revelation_place,
                pages: chapterData.pages,
            };

            for (const language of languages) {
            // Fetch data from the API
                let chapterData = await fetchChapterData(surahNumber, language);
                mergedData.chapterNameTranslated[language] = chapterData.translated_name;
            }

            delete mergedData.englishName;
            delete mergedData.name;
            delete mergedData.revelationType;
            delete mergedData.number;
            delete mergedData.pagination;
            delete mergedData.englishNameTranslation;
            delete mergedData.chapterNameTranslated.language;

            // Write the merged data back to the file
            fs.writeFileSync(filePath, JSON.stringify(mergedData, null, 2), 'utf-8');
            console.log(`Merged data for Surah ${surahNumber} into ${wbwSurahFile}`);
        } else {
            console.log(`Skipped merging for Surah ${surahNumber} due to API error.`);
        }
    }
});
