
const { OpenAI } = require('openai');
require('dotenv').config({ path: '.env.local' });

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });


async function alignSingleSegment(splitted, verse) {
  const prompt = `
Segmentiere die folgende Transkription 'text_uthmani_transcribed_full' so, dass es zu dem markierten Teil einer deutschen Gesamtübersetzung passt und speichere es als 'text_uthmani_transcribed'.
Danach segmentiere den folgenden arabischen Originaltext 'text_uthmani_full' so, dass er zu 'text_uthmani_transcribed' passt.

Du bekommst:
- 'text_uthmani_transcribed_full': die vollständige Transkription des arabischen Textes
- 'text_uthmani_full': der vollständige arabische Text
- 'translation_full': die vollständige deutsche Übersetzung
- 'translation': ein markiertes Segment aus 'translation_full'

Deine Aufgabe:
- Finde den exakt passenden Transkriptionstextausschnitt, der sinngemäß zur Übersetzung 'translation' gehört.
- Gib exakt den Ausschnitt aus 'text_uthmani_transcribed_full' zurück, der den Übersetzungsteil 'translation' abbildet.
- Finde den exakt passenden arabischen Textausschnitt 'text_uthmani', der sinngemäß zu 'text_uthmani_transcribed' gehört.
- Gib exakt den Ausschnitt aus 'text_uthmani_full' zurück, der den Transkriptionteil (text_uthmani_transcribed) abbildet.
- Gib ein gültiges JSON-Objekt mit "text_uthmani", "text_uthmani_transcribed" und "translation" zurück.
- ❗ Zeichen wie ۩,۞, ۖ, ۚ, ۗ, ۙ, ۛ, ۜ usw. sind integraler Bestandteil des arabischen Originaltextes. Du darfst keines davon weglassen oder verändern. Sie müssen exakt im passenden Segment stehen bleiben. Wenn an einer Stelle geschnitten wird, muss das Symbol im Segment bleiben, zu dem es inhaltlich gehört.

### 🔹 Eingabe:
- 'text_uthmani_transcribed_full': "${verse.text_uthmani_transcribed}"
- 'text_uthmani_full': "${verse.text_uthmani}"
- 'translation_full': "${verse.translation}"
- 'translation': "${splitted.translation}"

Gib deine Antwort im folgenden JSON-Format zurück:
{
  "translation": "...",
  "text_uthmani": "..."
  "text_uthmani_transcribed": "..."
}
`;

  const res = await openai.chat.completions.create({
    model: 'gpt-4o',
    temperature: 0,
    messages: [{ role: 'user', content: prompt }],
    response_format: { type: "json_object" }
  });

  const parsed = JSON.parse(res.choices[0].message.content);
  // console.log('parsed', parsed);
  // console.log('parsed');
  // console.log('parsed');
  // console.log('parsed');
  // process.exit(1);
  
  return {
    belongs_to_verse_number: splitted.belongs_to_verse_number,
    translation: splitted.translation,
    text_uthmani: parsed.text_uthmani,
    text_uthmani_transcribed: parsed.text_uthmani_transcribed
  };
}

async function alignVerse(verse) {
  if (!verse.splitted || !Array.isArray(verse.splitted)) return verse;
  if (!verse.text_uthmani || !verse.text_uthmani_transcribed) return verse;

  const enriched = [];

  for (const splitted of verse.splitted) {
    // console.log('splitted', splitted,verse.text_uthmani, verse.text_uthmani_transcribed);
    // process.exit(1);
    const result = await alignSingleSegment(splitted, verse); 
    enriched.push(result);
  }

  verse.splitted = enriched;
  return verse;
}

module.exports = { alignVerse };
