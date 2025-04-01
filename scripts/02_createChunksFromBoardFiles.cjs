const fs = require('fs');
const path = require('path');

// Define paths
const sourceDir = path.join(__dirname, '../public/boards');
const destDir = path.join(__dirname, '../public/boards-splitted');
const MAX_VERSES_PER_FILE = 11;

// Ensure destination directory exists
if (!fs.existsSync(destDir)) {
    fs.mkdirSync(destDir, { recursive: true });
}

// Read all JSON files from source directory
fs.readdir(sourceDir, (err, files) => {
    if (err) {
        console.error('Error reading source directory:', err);
        return;
    }

    files.forEach(file => {
        if (path.extname(file) === '.json') {
            processFile(path.join(sourceDir, file), file);
        }
    });
});

/**
 * Processes a JSON file: splits its verses into multiple files if necessary.
 * @param {string} filePath - The path to the source file.
 * @param {string} originalFileName - The original file name.
 */
function processFile(filePath, originalFileName) {
    try {
        const data = fs.readFileSync(filePath, 'utf8');
        const jsonData = JSON.parse(data);
        const { chapter_number, verses } = jsonData;

        // Split verses into chunks of MAX_VERSES_PER_FILE
        let chunkIndex = 1;
        for (let i = 0; i < verses.length; i += MAX_VERSES_PER_FILE) {
            const chunk = verses.slice(i, i + MAX_VERSES_PER_FILE);
            const chunkData = {
                chapter_number,
                verses: chunk
            };

            // Construct new file name
            const baseName = path.basename(originalFileName, '.json');
            const newFileName = `${baseName}_part${chunkIndex}.json`;
            const newFilePath = path.join(destDir, newFileName);

            // Write chunk to new file
            fs.writeFileSync(newFilePath, JSON.stringify(chunkData, null, 2), 'utf8');
            console.log(`Created file: ${newFilePath}`);

            chunkIndex++;
        }
    } catch (error) {
        console.error(`Error processing file ${filePath}:`, error);
    }
}
