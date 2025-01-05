const axios = require("axios");
const fs = require("fs");
const path = require("path");

// Base URL and output directory
const baseUrl = "https://api.quran.com/api/v4/verses/by_chapter";
const outputDir = path.join(__dirname,"..", "public", "surat");

// Create the output directory if it doesn't exist
if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
}

(async () => {
    for (let surahNumber = 1; surahNumber <= 114; surahNumber++) {
        try {
            // Fetch the data for the current Surah
            const url = `${baseUrl}/${surahNumber}?words=true&translations=27,19,45,79&fields=text_uthmani`;
            const response = await axios.get(url);

            // Save the data to a file
            const filePath = path.join(outputDir, `wbw-surah-${surahNumber}.json`);
            fs.writeFileSync(filePath, JSON.stringify(response.data, null, 2));

            console.log(`Saved: ${filePath}`);
        } catch (error) {
            console.error(`Failed to fetch or save Surah ${surahNumber}:`, error.message);
        }
    }
})();
