const fs = require('fs');
const axios = require('axios');
const path = require('path');

// Base URL for the API
const API_URL = 'https://api.alquran.cloud/v1/surah';

// Directory to save the surah files
const OUTPUT_DIR = path.join(__dirname, '..', 'public', 'surat');

// Ensure the directory exists
if (!fs.existsSync(OUTPUT_DIR)) {
    fs.mkdirSync(OUTPUT_DIR, { recursive: true });
}

// Function to fetch and save surah data
const fetchAndSaveSurahs = async () => {
    console.log('Fetching surah data...');
    for (let i = 1; i <= 114; i++) {
        try {
            // Fetch surah data
            const response = await axios.get(`${API_URL}/${i}/quran-tajweed`);
            const surahData = response.data;

            // Save the data to a file
            const filePath = path.join(OUTPUT_DIR, `surah-${i}.json`);
            fs.writeFileSync(filePath, JSON.stringify(surahData, null, 2));

            console.log(`Saved surah ${i} to ${filePath}`);
        } catch (error) {
            console.error(`Failed to fetch surah ${i}:`, error.message);
        }
    }
    console.log('All surahs have been fetched and saved.');
};

// Run the script
fetchAndSaveSurahs();
