const fs = require('fs');
const path = require('path');

const fileArg = process.argv[2];

if (!fileArg) {
  console.error('Usage: node count-splitted.js <file.json>');
  process.exit(1);
}

try {
  const filePath = path.resolve(fileArg);
  const raw = fs.readFileSync(filePath, 'utf-8');
  const data = JSON.parse(raw);

  if (!Array.isArray(data)) {
    throw new Error('Expected top-level array.');
  }

  let count = 0;
  for (const item of data) {
    if (Array.isArray(item.splitted)) {
      count += item.splitted.length;
    }
  }

  console.log(`Total splitted elements: ${count}`);
} catch (err) {
  console.error('Error:', err.message);
  process.exit(1);
}
