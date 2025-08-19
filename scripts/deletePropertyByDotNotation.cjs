const fs = require('fs');
const path = require('path');

const directoryPath = path.join(__dirname, '../public/surat/segmented/de/27'); // Adjust as needed

// Define properties (dot-notation) to remove:
const toDelete = [
  'color',
];

/**
 * Deletes a property from an object using a dot path.
 * - Traverses arrays automatically and applies deletion to each element.
 * - Silently skips if any segment is missing or not an object/array.
 */
function deleteByDotPath(target, pathStr) {
  const parts = pathStr.split('.');

  function walk(node, i) {
    if (!node) return;

    const key = parts[i];
    const isLast = i === parts.length - 1;

    if (Array.isArray(node)) {
      // Apply to each element in the array
      node.forEach(el => walk(el, i));
      return;
    }

    if (typeof node !== 'object') return;

    if (isLast) {
      // Delete the final key if present
      if (Object.prototype.hasOwnProperty.call(node, key)) {
        delete node[key];
      }
      return;
    }

    // Recurse into the next level
    const next = node[key];
    if (Array.isArray(next)) {
      next.forEach(el => walk(el, i + 1));
    } else if (next && typeof next === 'object') {
      walk(next, i + 1);
    }
    // If next is missing/non-object, nothing to do
  }

  walk(target, 0);
}

fs.readdir(directoryPath, (err, files) => {
  if (err) {
    console.error('Error reading directory:', err);
    return;
  }

  files
    .filter(file => path.extname(file) === '.json')
    .forEach(file => {
      const filePath = path.join(directoryPath, file);

      fs.readFile(filePath, 'utf8', (readErr, data) => {
        if (readErr) {
          console.error(`Error reading file ${file}:`, readErr);
          return;
        }

        try {
          const jsonData = JSON.parse(data);

          toDelete.forEach(dotPath => deleteByDotPath(jsonData, dotPath));

          fs.writeFile(filePath, JSON.stringify(jsonData, null, 2), 'utf8', (writeErr) => {
            if (writeErr) {
              console.error(`Error writing file ${file}:`, writeErr);
            } else {
              console.log(`Updated file: ${filePath}`);
            }
          });
        } catch (parseErr) {
          console.error(`Error parsing JSON in file ${file}:`, parseErr);
        }
      });
    });
});
