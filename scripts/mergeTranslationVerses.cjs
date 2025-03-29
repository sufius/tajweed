const fs = require('fs');
const path = require('path');
const fetch = require('node-fetch');

const outputDir = path.join(__dirname, '..', 'public/surat');
if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
}

const quranUrl = 'https://cdn.jsdelivr.net/gh/fawazahmed0/quran-api@1/editions/rus-vporokhova.json';

fetch(quranUrl)
    .then(response => response.json())
    .then(quranData => {
        if (!quranData.quran) {
            throw new Error("Ungültige JSON-Struktur: 'quran' fehlt");
        }

        quranData.quran.forEach(verse => {
            const surahFile = path.join(outputDir, `surah-${verse.chapter}.json`);
            
            let surahData = { verses: [] };
            
            if (fs.existsSync(surahFile)) {
                try {
                    surahData = JSON.parse(fs.readFileSync(surahFile, 'utf8'));
                } catch (error) {
                    console.error(`Fehler beim Lesen von ${surahFile}:`, error);
                }
            }
            
            let verseEntry = surahData.verses.find(v => v.verse_number === verse.verse);
            const uniqueId = parseInt(`${verse.chapter}${verse.verse}${Math.floor(Math.random() * 9999)}`);
            const newEntry = {
                id: uniqueId,
                resource_id: 445,
                text: verse.text
            };
            
            verseEntry.translations.push(newEntry);
            
            // Datei aktualisieren
            fs.writeFileSync(surahFile, JSON.stringify(surahData, null, 2), 'utf8');
            console.log(`Updated: ${surahFile}`);
        });
    })
    .catch(error => console.error('Fehler beim Abrufen der Quran-Daten:', error));
