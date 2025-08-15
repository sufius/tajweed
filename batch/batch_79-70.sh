#!/bin/bash

# Argument prüfen
if [ -z "$1" ]; then
  echo "➡️  Verwendung: $0 de-27"
fi

DEFAULT_TRANSLATION_KEY="de-27"
TRANSLATION_KEY="${1:-$DEFAULT_TRANSLATION_KEY}"

# Liste der Suren-Dateien
FILES=(
  "surah-79.json"
  "surah-78.json"
  "surah-77.json"
  "surah-76.json"
  "surah-75.json"
  "surah-74.json"
  "surah-73.json"
  "surah-72.json"
  "surah-71.json"
  "surah-70.json"
)

# Verzeichnis definieren
DIR="./public/surat-aligned-$TRANSLATION_KEY"

# Starte jeweils 10 aufeinanderfolgend
for ((i=0; i<${#FILES[@]}; i+=10)); do
  for ((j=0; j<10 && (i+j)<${#FILES[@]}; j++)); do
    FILE="${FILES[$((i+j))]}"
    echo "⚙️  → $FILE"
    node scripts/032_alignUthmaniWithTranscription.cjs "$DIR/$FILE"
    sleep 1
  done
  echo "⏳ Warte 10 Sekunden, um Rate Limits zu vermeiden..."
  sleep 10
done
