#!/bin/bash

# Argument prüfen
if [ -z "$1" ]; then
  echo "➡️  Verwendung: $0 de-27"
fi

DEFAULT_TRANSLATION_KEY="de-27"
TRANSLATION_KEY="${1:-$DEFAULT_TRANSLATION_KEY}"

# Liste der Suren-Dateien
FILES=(
  "surah-99.json"
  "surah-98.json"
  "surah-97.json"
  "surah-96.json"
  "surah-95.json"
  "surah-94.json"
  "surah-93.json"
  "surah-92.json"
  "surah-91.json"
  "surah-90.json"
)

# Verzeichnis definieren
DIR="./public/surat-aligned-$TRANSLATION_KEY"

# Starte jeweils 10 aufeinanderfolgend
for ((i=0; i<${#FILES[@]}; i+=10)); do
  echo "🔄 Bearbeite Suren $((i+1)) bis $((i+10))"
  for ((j=0; j<10 && (i+j)<${#FILES[@]}; j++)); do
    FILE="${FILES[$((i+j))]}"
    echo "⚙️  → $FILE"
    node scripts/032_alignUthmaniWithTranscription.cjs "$DIR/$FILE"
    sleep 1 # optional: Vermeide Rate Limits
  done
  echo "⏳ Warte 10 Sekunden, um Rate Limits zu vermeiden..."
  sleep 10
done
