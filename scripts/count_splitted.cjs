const fs = require('fs');
const path = require('path');

const fileArgs = process.argv.slice(2);

if (fileArgs.length === 0) {
  console.error('Usage: node count-splitted.js <file1.json> <file2.json> ...');
  process.exit(1);
}

let totalCount = 0;

for (const fileArg of fileArgs) {
  try {
    const filePath = path.resolve(fileArg);
    const raw = fs.readFileSync(filePath, 'utf-8');
    const data = JSON.parse(raw);

    if (!Array.isArray(data)) {
      throw new Error(`Expected top-level array in file: ${fileArg}`);
    }

    let count = 0;
    for (const item of data) {
      if (Array.isArray(item.splitted)) {
        count += item.splitted.length;
      }
    }

    console.log(`${fileArg}: ${count} splitted elements`);
    totalCount += count;
  } catch (err) {
    console.error(`Error in file "${fileArg}":`, err.message);
  }
}

console.log(`Total splitted elements across all files: ${totalCount}`);
