const fs = require("fs");
const path = require("path");

const dir = path.join(__dirname, "../public/surat/segmented/de/27");

// Hilfsfunktion: extrahiert "Kerntext" und Sonderzeichen
function extractParts(text) {
  const leading = text.match(/^[\sۚۖ۞ﹾًٌٍَُِّّْ]* /u) || [""];
  const trailing = text.match(/[\sۚۖ۞ﹾًٌٍَُِّّْ]*$/u) || [""];
  const core = text.slice(leading[0].length, text.length - trailing[0].length);
  return { leading: leading[0], core, trailing: trailing[0] };
}

fs.readdirSync(dir)
  .filter(f => f.endsWith(".json"))
  .forEach(file => {
    const filePath = path.join(dir, file);
    let data;

    try {
      data = JSON.parse(fs.readFileSync(filePath, "utf8"));
    } catch (e) {
      console.error("Fehler beim Lesen:", file, e.message);
      return;
    }

    // Alle Verse in der Datei
    data.forEach((entry, i, arr) => {
      if (!entry.verse_arabic_full || !entry.transcription) return;

      // Sonderzeichen am Anfang/Ende herausziehen
      const { leading, core, trailing } = extractParts(entry.verse_arabic_full);

      // Heuristik: erster Teil -> alles bis zum nächsten Segment
      // Wir nehmen alle Einträge mit gleichem verse_arabic_full,
      // teilen sie auf anhand ihrer Position im Array
      const sameFull = arr.filter(e => e.verse_arabic_full === entry.verse_arabic_full);

      if (sameFull.length > 1) {
        // Gesamtlänge
        const coreLen = core.length;
        const partLen = Math.floor(coreLen / sameFull.length);
        const idx = sameFull.indexOf(entry);

        let seg = core.slice(idx * partLen, (idx + 1) * partLen);

        // Bei erstem Teil: führende Sonderzeichen anhängen
        if (idx === 0) seg = leading + seg;
        // Bei letztem Teil: trailing anhängen
        if (idx === sameFull.length - 1) seg = seg + trailing;

        entry.verse_arabic_segmented = seg.trim();
      } else {
        // Falls nur ein Segment, einfach full übernehmen
        entry.verse_arabic_segmented = entry.verse_arabic_full;
      }
    });

    // Datei überschreiben
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2), "utf8");
    console.log("Aktualisiert:", file);
  });
