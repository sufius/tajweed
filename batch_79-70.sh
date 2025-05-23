#!/bin/bash

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
DIR="./public/surat-aligned"

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
