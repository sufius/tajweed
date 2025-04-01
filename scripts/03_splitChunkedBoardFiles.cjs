
require('dotenv').config({ path: '.env.local' });

const fs = require('fs');
const path = require('path');
const { OpenAI } = require('openai');


// File paths – adjust if needed
const sourceFile = path.join(__dirname, '../public/boards-splitted/surah-18_part2.json');
const destFile = path.join(__dirname, '../public/boards-splitted/surah-18_part2-splitted.json');

// Base string (max allowed length for text_uthmani)
const baseString = "﴿٥٦﴾ وَمَا نُرْسِلُ ٱلْمُرْسَلِينَ إِلَّا مُبَشِّرِينَ وَمُنذِرِينَ‌ۚ وَيُجَـٰدِلُ ٱلَّذِينَ كَفَرُواْ بِٱلْبَـٰطِلِ لِيُدْحِضُواْ بِهِ ٱلْحَقَّ‌ۖ وَٱتَّخَذُوٓاْ ءَايَـٰتِى وَمَآ أُنذِرُواْ هُزُوًا";
const maxLength = baseString.length;

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
  // Construct a prompt instructing the model to find semantically ideal breakpoints.
  const prompt = `
You are a text segmentation expert specializing in natural sentence structure.

text to split: 
${translation}

${arabic}

${transcribed}

Task:
Segment the given translation text into multiple parts while ensuring:
✅ Each segment does not exceed 200 characters.
✅ Each segment preserves full sentences and readability.



Segmentation Rules:
Always prioritize complete sentences.

If a sentence fits within 200 characters, keep it whole.

Do not split in the middle of a sentence unless absolutely unavoidable.

Break at natural punctuation points:

Periods (.), Semicolons (;) → Best break points

Commas ( ,) → Only if they separate independent clauses

Ensure that if an opening bracket (e.g., "(") appears in a segment, the corresponding closing bracket (e.g., ")") must also appear in the same segment.

Do not split a paired punctuation mark across different segments.

Avoid breaking at conjunctions (and, but, or), prepositions, or pronouns.

🚨 Never split proper nouns, names, or meaningful short words.

🚨 Never split words or proper nouns; always ensure that each segment ends at a natural break without cutting through a word.

If a break would result in cutting a name (e.g., 'Allah'), adjust it to the next safe point.

Proper nouns must always stay together.

If a sentence must be split:

The first segment must be a full clause.

The next segment should start with a natural transition (not an isolated word).

Do not create unnecessary breaks.

If the remaining text is ≤200 characters, return only the final index.

Output Format:
Return a JSON object with:

"translationBreaks": an array of character indices where each segment should end.
"arabicBreaks": an array of character indices where each segment should end.
"transcribedBreaks": an array of character indices where each segment should end.

Strictly return only valid JSON without any explanations.

Example Output:
If a text has 500 characters, an ideal segmentation might be:
{"translationBreaks": [195, 390], "arabicBreaks": [120, 284], "transcribedBreaks": [125, 290]}
`;

  // Call OpenAI ChatCompletion API
  try {
    const completion = await openai.chat.completions.create({
        model: "gpt-4",
    //   model: "gpt-4o",
    //   model: "gpt-3.5-turbo",
    //   model: "gpt-4o-mini",
    //   model: "gpt-4o-mini-2024-07-18",
      messages: [{
        role: "system",
        "content": `You are a text segmentation expert specializing in preserving sentence structure and meaning. 
  Your goal is to split text into multiple segments without exceeding 200 characters per segment.
  
  **Rules:**
  - Never split words across segments.
  - Always keep proper nouns (e.g., 'Аллах') and meaningful short words intact.
  - Prioritize splitting at punctuation (e.g., periods, semicolons).
  - If a sentence must be split, ensure the first segment forms a complete thought.
  - Avoid creating unnecessary splits if the remaining text fits within the limit.
  - Ensure that if an opening bracket (e.g., "(") appears in a segment, the corresponding closing bracket (e.g., ")") must also appear in the same segment.
  - Do not split a paired punctuation mark across different segments.

  Return a JSON object with:
  'translationBreaks': an array of split indices
  'arabicBreaks': an array of split indices
  'transcribedBreaks': an array of split indices
  `
      }, {
        role: "user",
        content: prompt
      }],
      temperature: 0.0, // for deterministic responses
      //   max_tokens: 300,
    //   response_format: { type: "json_object" }  // ✅ Correct value
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
//   if (text_uthmani.length <= maxLen) return null;
  if (translation.length <= maxLen) return null;

  // Get break indices from OpenAI API.
  const {
    arabicBreaks, 
    transcribedBreaks,
    translationBreaks
    } = await getSegmentBreakIndices(
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
//   for (let i = 0; i < arabicBreaks.length; i++) {
  for (let i = 0; i < translationBreaks.length; i++) {
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
//   if (prevArabic < text_uthmani.length) {
  if (prevTranslation < translation.length) {
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

    // Ensure destination directory exists.
    const destDir = path.dirname(destFile);
    if (!fs.existsSync(destDir)) {
      fs.mkdirSync(destDir, { recursive: true });
    }
    fs.writeFileSync(destFile, JSON.stringify(newVerses, null, 2), 'utf8');
    console.log(`Created file: ${destFile}`);
  } catch (error) {
    console.error("Error processing file:", error);
  }
}

// Run the process.
processFile();
