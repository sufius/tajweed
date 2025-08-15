#!/bin/bash

# Argument prüfen
if [ -z "$1" ]; then
  echo "➡️  Verwendung: $0 de-27"
fi

DEFAULT_TRANSLATION_KEY="de-27"
TRANSLATION_KEY="${1:-$DEFAULT_TRANSLATION_KEY}"

# Liste der Suren-Dateien
FILES=(
  "surah-69.json"
  "surah-68.json"
  "surah-67.json"
  "surah-66.json"
  "surah-65.json"
  "surah-64.json"
  "surah-63.json"
  "surah-62.json"
  "surah-61.json"
  "surah-60.json"
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
