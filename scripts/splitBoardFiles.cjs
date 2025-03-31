
require('dotenv').config({ path: '.env.local' });

const fs = require('fs');
const path = require('path');
const { OpenAI } = require('openai');


// File paths – adjust if needed
const sourceFile = path.join(__dirname, '../public/boards/surah-18.json');
const destFile = path.join(__dirname, '../public/boards/surah-18-splitted.json');

// Base string (max allowed length for text_uthmani)
const baseString = "﴿٥٦﴾ وَمَا نُرْسِلُ ٱلْمُرْسَلِينَ إِلَّا مُبَشِّرِينَ وَمُنذِرِينَ‌ۚ وَيُجَـٰدِلُ ٱلَّذِينَ كَفَرُواْ بِٱلْبَـٰطِلِ لِيُدْحِضُواْ بِهِ ٱلْحَقَّ‌ۖ وَٱتَّخَذُوٓاْ ءَايَـٰتِى وَمَآ أُنذِرُواْ هُزُوًا";
const maxLength = baseString.length;

console.log('process.env.OPENAI_API_KEY', process.env.OPENAI_API_KEY);

// Setup OpenAI API configuration (make sure OPENAI_API_KEY is set in your environment)
const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
});

/**
 * Calls the OpenAI API to determine the ideal break indices for a given verse.
 *
 * @param {string} arabic - The Arabic text (text_uthmani)
 * @param {string} transcribed - The transcribed text (text_uthmani_transcribed)
 * @param {string} translation - The translation text
 * @param {number} maxLen - The maximum allowed length per segment for the Arabic text
 * @returns {Promise<Object>} - A promise resolving to an object with arrays "arabicBreaks" and "translationBreaks"
 */
async function getSegmentBreakIndices(arabic, transcribed, translation, maxLen) {
  // Determine how many segments are needed
  const nParts = Math.ceil(arabic.length / maxLen);

  // Construct a prompt instructing the model to find semantically ideal breakpoints.
  const prompt = `
You are a text segmentation expert. I have the following texts that represent parallel versions of the same content:
  
Arabic (text_uthmani): 
${arabic}

Transcribed (text_uthmani_transcribed): 
${transcribed}

Translation: 
${translation}

The maximum allowed length for the Arabic text in a single segment is ${maxLen} characters.
I need to split the texts into ${nParts} segments such that:
  1. Each segment of the Arabic text does not exceed ${maxLen} characters.
  2. The splits occur at semantically coherent positions (e.g. natural breaks in meaning).
  3. The breakpoints align as much as possible across all texts.
  4. The start and the end of the transcribed text have to match exactly with start and end of the arabic segment
  
Please analyze the texts and return a JSON object with three arrays:
  - "arabicBreaks": an array of indices (non-inclusive) where each segment of the Arabic text should end.
  - "transcribedBreaks": an array of indices for the transcription text corresponding to the arabic segment breaks.
  - "translationBreaks": an array of indices for the translation text corresponding to these segment breaks.
Do not include any explanation, only return valid JSON. If a segment does not require splitting because the remainder is less than or equal to the allowed maximum, then simply return the index corresponding to the end of the text.

For example, if the Arabic text has length 200 and maxLen is 100 and you need 2 segments, you might return:
{"arabicBreaks": [95, 200], "transcribedBreaks": [88, 195], "translationBreaks": [90, 180]}
Ensure that the provided indices result in segments that are as long as possible without exceeding the maximum.
`;

  // Call OpenAI ChatCompletion API
  try {
    const completion = await openai.chat.completions.create({
        model: "gpt-4o",
    //   model: "gpt-4",
    //   model: "gpt-3.5-turbo",
    //   model: "gpt-4o-mini",
    //   model: "gpt-4o-mini-2024-07-18",
      messages: [{
        role: "system",
        content: "You are an expert in text segmentation."
      }, {
        role: "user",
        content: prompt
      }],
      temperature: 0.0, // for deterministic responses
      //   max_tokens: 300,
      response_format: { type: "json_object" }  // ✅ Correct value
    });

    const responseText = completion.choices[0].message.content.trim();
    // Expecting JSON output – try to parse it.
    const result = JSON.parse(responseText);
    return result;
  } catch (error) {
    console.error("Error in OpenAI API call:", error.response ? error.response.data : error.message);
    throw error;
  }
}

/**
 * Splits a verse into segments using OpenAI-determined break indices.
 * Returns an array of segments, where each segment is an object with the four text fields.
 */
async function splitVerseUsingAPI(verse, maxLen) {
  const { text_uthmani, text_uthmani_transcribed, translation } = verse;
  // If no splitting needed, return null.
  if (text_uthmani.length <= maxLen) return null;

  // Get break indices from OpenAI API.
  const { arabicBreaks, transcribedBreaks, translationBreaks } = await getSegmentBreakIndices(
    text_uthmani,
    text_uthmani_transcribed,
    translation,
    maxLen
  );
  
  // Build segments based on the break indices.
  const segments = [];
  let prevArabic = 0;
  let prevTranscribed = 0;
  let prevTranslation = 0;
  for (let i = 0; i < arabicBreaks.length; i++) {
    const endArabic = arabicBreaks[i];
    const endTranscribed = transcribedBreaks[i];
    const endTranslation = translationBreaks[i];
    segments.push({
      text_uthmani: text_uthmani.substring(prevArabic, endArabic).trim(),
      text_uthmani_transcribed: text_uthmani_transcribed.substring(prevTranscribed, endTranscribed).trim(),
      translation: translation.substring(prevTranslation, endTranslation).trim()
    });
    prevArabic = endArabic;
    prevTranscribed = endTranscribed;
    prevTranslation = endTranslation;
  }
  // If there's any remainder, add it as the final segment.
  if (prevArabic < text_uthmani.length) {
    segments.push({
      text_uthmani: text_uthmani.substring(prevArabic).trim(),
      text_uthmani_transcribed: text_uthmani_transcribed.substring(prevTranscribed).trim(),
      translation: translation.substring(prevTranslation).trim()
    });
  }
  return segments;
}

async function processFile() {
  try {
    const data = fs.readFileSync(sourceFile, 'utf8');
    const jsonData = JSON.parse(data);

    // Process each verse – if it needs splitting, call the API for segmentation.
    // Using Promise.all to process verses in parallel.
    const newVerses = await Promise.all(jsonData.verses.map(async (verse) => {
      const newVerse = {
        verse_number: verse.verse_number,
        text_uthmani: verse.text_uthmani,
        text_uthmani_transcribed: verse.text_uthmani_transcribed,
        translation: verse.translation
      };

      if (verse.text_uthmani.length > maxLength) {
        try {
          const segments = await splitVerseUsingAPI(verse, maxLength);
          if (segments) {
            newVerse.splitted = segments;
          }
        } catch (err) {
          console.error(`Error splitting verse ${verse.verse_number}:`, err);
          // Optionally, you can fallback to not splitting or use a default splitting method.
        }
      }
      return newVerse;
    }));

    // Prepare new data structure.
    const newData = {
      chapter_number: jsonData.chapter_number,
      verses: newVerses
    };

    // Ensure destination directory exists.
    const destDir = path.dirname(destFile);
    if (!fs.existsSync(destDir)) {
      fs.mkdirSync(destDir, { recursive: true });
    }
    fs.writeFileSync(destFile, JSON.stringify(newData, null, 2), 'utf8');
    console.log(`Created file: ${destFile}`);
  } catch (error) {
    console.error("Error processing file:", error);
  }
}

// Run the process.
processFile();
