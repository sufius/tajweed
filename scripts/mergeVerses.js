import fs from 'fs';
import path from 'path';
import axios from 'axios';
import { fileURLToPath } from 'url';

// Resolve __dirname in ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Path to the folder containing the files
const directoryPath = path.join(__dirname, '../public/surat/');

// Function to fetch verses for a specific Surah and page
async function fetchVerses(surahNumber, page) {
    const url = `https://api.quran.com/api/v4/verses/by_chapter/${surahNumber}?words=true&translations=27,19,45,79&fields=text_uthmani&page=${page}&per_page=10`;
    try {
        const response = await axios.get(url);
        return response.data.verses; // Extract verses array
    } catch (error) {
        console.error(`Error fetching verses for Surah ${surahNumber}, Page ${page}:`, error.message);
        return [];
    }
}

// Function to merge all pages of verses into the corresponding file
async function mergeVersesForSurah(surahNumber) {
    const filePath = path.join(directoryPath, `wbw-surah-${surahNumber}.json`);

    // Read the existing file
    let existingData = {};
    try {
        existingData = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
    } catch (error) {
        console.error(`Error reading file for Surah ${surahNumber}:`, error.message);
        return;
    }

    // Initialize or extend the "verses" array in the file
    if (!existingData.verses) {
        existingData.verses = [];
    }

    // Fetch and merge verses from pages 2 to 29
    for (let page = 2; page <= 29; page++) {
        console.log(`Fetching verses for Surah ${surahNumber}, Page ${page}`);
        const verses = await fetchVerses(surahNumber, page);
        if (!verses.length) { break; }
        console.log(`${surahNumber} - page ${page}`);
        
        existingData.verses.push(...verses); // Add new verses
    }

    // Write the updated data back to the file
    fs.writeFileSync(filePath, JSON.stringify(existingData, null, 2), 'utf-8');
    console.log(`Merged all verses for Surah ${surahNumber}`);
}

// Process all Surahs in the directory
fs.readdir(directoryPath, async (err, files) => {
    if (err) {
        console.error('Unable to scan directory:', err);
        return;
    }

    // Filter out only `wbw-surah-*.json` files
    const wbwSurahFiles = files.filter(file => file.startsWith('wbw-surah-') && file.endsWith('.json'));

    for (const wbwSurahFile of wbwSurahFiles) {
        const surahNumber = wbwSurahFile.match(/wbw-surah-(\d+).json/)[1]; // Extract Surah number
        await mergeVersesForSurah(surahNumber);
    }
});
