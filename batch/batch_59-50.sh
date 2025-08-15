#!/bin/bash

# Argument prüfen
if [ -z "$1" ]; then
  echo "➡️  Verwendung: $0 de-27"
fi

DEFAULT_TRANSLATION_KEY="de-27"
TRANSLATION_KEY="${1:-$DEFAULT_TRANSLATION_KEY}"

# Liste der Suren-Dateien
FILES=(
  "surah-59.json"
  "surah-58.json"
  "surah-57.json"
  "surah-56.json"
  "surah-55.json"
  "surah-54.json"
  "surah-53.json"
  "surah-52.json"
  "surah-51.json"
  "surah-50.json"
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
