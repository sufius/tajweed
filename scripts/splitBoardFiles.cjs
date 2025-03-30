const fs = require('fs');
const path = require('path');

// File paths – adjust if needed
const sourceFile = path.join(__dirname, '../public/boards/surah-2.json');
const destFile = path.join(__dirname, '../public/boards/surah-2-splitted.json');

// Base string (max allowed length for text_uthmani)
const baseString = "﴿٥٦﴾ وَمَا نُرْسِلُ ٱلْمُرْسَلِينَ إِلَّا مُبَشِّرِينَ وَمُنذِرِينَ‌ۚ وَيُجَـٰدِلُ ٱلَّذِينَ كَفَرُواْ بِٱلْبَـٰطِلِ لِيُدْحِضُواْ بِهِ ٱلْحَقَّ‌ۖ وَٱتَّخَذُوٓاْ ءَايَـٰتِى وَمَآ أُنذِرُواْ هُزُوًا";
const maxLength = baseString.length;

// Helper: find last occurrence of any punctuation in a given string
function findLastPunctuation(str) {
  const punctuations = [',', '،', ';', '؛', ':', '.', '؟', '?', '!'];
  let lastIndex = -1;
  for (let punc of punctuations) {
    const idx = str.lastIndexOf(punc);
    if (idx > lastIndex) {
      lastIndex = idx;
    }
  }
  return lastIndex;
}

// Function to split a verse into segments if needed.
// It uses the translation text as a guide to find natural breakpoints.
function splitVerse(verse, maxLength) {
  const { text_uthmani, text_uthmani_tajweed_parsed, text_uthmani_transcribed, translation } = verse;
  if (text_uthmani.length <= maxLength) return null; // no splitting needed

  const segments = [];
  const totalArabicLength = text_uthmani.length;
  const totalTranslationLength = translation.length;
  // Determine minimum number of segments needed.
  const nParts = Math.ceil(totalArabicLength / maxLength);

  let prevArabicIndex = 0;
  let prevTranslationIndex = 0;

  // For each segment except the last
  for (let i = 0; i < nParts - 1; i++) {
    // Ideal break in the translation for an evenly split segment
    let idealTranslationBreak = Math.floor((i + 1) * (totalTranslationLength / nParts));
    // Compute corresponding ideal break in Arabic text by proportion.
    let idealArabicBreak = Math.floor((idealTranslationBreak / totalTranslationLength) * totalArabicLength);

    // Ensure we do not exceed the allowed maximum for this segment.
    const segmentMaxArabic = prevArabicIndex + maxLength;
    if (idealArabicBreak > segmentMaxArabic) {
      idealArabicBreak = segmentMaxArabic;
    }
    // Now try to refine the break by checking for a punctuation marker in the translation.
    // Look at the translation substring corresponding to the current segment.
    let translationSegment = translation.substring(prevTranslationIndex, idealTranslationBreak);
    const puncIndex = findLastPunctuation(translationSegment);
    if (puncIndex !== -1) {
      // Adjust the translation break to this punctuation position (plus one to include it).
      idealTranslationBreak = prevTranslationIndex + puncIndex + 1;
      // Recalculate the corresponding Arabic break using proportion.
      let newArabicBreak = Math.floor((idealTranslationBreak / totalTranslationLength) * totalArabicLength);
      // Ensure we do not exceed the segment max.
      if (newArabicBreak > segmentMaxArabic) {
        newArabicBreak = segmentMaxArabic;
      }
      // Use the adjusted break if it is further than our current previous index.
      if (newArabicBreak > prevArabicIndex) {
        idealArabicBreak = newArabicBreak;
      }
    }
    // Fallback: if no punctuation was found or if the computed break is not valid, use segmentMaxArabic.
    if (idealArabicBreak <= prevArabicIndex) {
      idealArabicBreak = segmentMaxArabic;
    }

    // Now determine the corresponding break in the translation.
    // We use the ratio of the current segment length in Arabic to approximate the translation break.
    const segmentArabicLength = idealArabicBreak - prevArabicIndex;
    const ratio = segmentArabicLength / (totalArabicLength - prevArabicIndex);
    let idealTranslationBreak2 = prevTranslationIndex + Math.floor(ratio * (totalTranslationLength - prevTranslationIndex));
    if (idealTranslationBreak2 <= prevTranslationIndex) {
      idealTranslationBreak2 = prevTranslationIndex + Math.floor(totalTranslationLength / nParts);
    }

    // Slice the segments for each field.
    const segArabic = text_uthmani.substring(prevArabicIndex, idealArabicBreak).trim();
    const segTajweed = text_uthmani_tajweed_parsed.substring(prevArabicIndex, idealArabicBreak).trim();
    const segTranscribed = text_uthmani_transcribed.substring(prevArabicIndex, idealArabicBreak).trim();
    const segTranslation = translation.substring(prevTranslationIndex, idealTranslationBreak2).trim();

    segments.push({
      text_uthmani: segArabic,
      text_uthmani_tajweed_parsed: segTajweed,
      text_uthmani_transcribed: segTranscribed,
      translation: segTranslation
    });

    // Update indices for the next segment.
    prevArabicIndex = idealArabicBreak;
    prevTranslationIndex = idealTranslationBreak2;
  }
  // Last segment takes the remainder.
  const segArabic = text_uthmani.substring(prevArabicIndex).trim();
  const segTajweed = text_uthmani_tajweed_parsed.substring(prevArabicIndex).trim();
  const segTranscribed = text_uthmani_transcribed.substring(prevArabicIndex).trim();
  const segTranslation = translation.substring(prevTranslationIndex).trim();

  segments.push({
    text_uthmani: segArabic,
    text_uthmani_tajweed_parsed: segTajweed,
    text_uthmani_transcribed: segTranscribed,
    translation: segTranslation
  });

  return segments;
}

// Read the source file
fs.readFile(sourceFile, 'utf8', (err, data) => {
  if (err) {
    console.error(`Error reading ${sourceFile}:`, err);
    return;
  }
  try {
    const jsonData = JSON.parse(data);
    const newVerses = jsonData.verses.map(verse => {
      // Create a new verse object with required fields.
      const newVerse = {
        verse_number: verse.verse_number,
        text_uthmani: verse.text_uthmani,
        text_uthmani_tajweed_parsed: verse.text_uthmani_tajweed_parsed,
        text_uthmani_transcribed: verse.text_uthmani_transcribed,
        translation: verse.translation
      };

      // Check if the Arabic text exceeds the allowed maximum.
      if (verse.text_uthmani.length > maxLength) {
        const splittedSegments = splitVerse(verse, maxLength);
        if (splittedSegments) {
          newVerse.splitted = splittedSegments;
        }
      }
      return newVerse;
    });

    // Prepare the new data structure.
    const newData = {
      chapter_number: jsonData.chapter_number,
      verses: newVerses
    };

    // Ensure destination directory exists.
    const destDir = path.dirname(destFile);
    if (!fs.existsSync(destDir)) {
      fs.mkdirSync(destDir, { recursive: true });
    }
    // Write new data to destination file.
    fs.writeFile(destFile, JSON.stringify(newData, null, 2), 'utf8', err => {
      if (err) {
        console.error(`Error writing ${destFile}:`, err);
      } else {
        console.log(`Created file: ${destFile}`);
      }
    });
  } catch (parseErr) {
    console.error("Error parsing JSON:", parseErr);
  }
});
