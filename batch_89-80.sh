#!/bin/bash

# Liste der Suren-Dateien
FILES=(
  "surah-89.json"
  "surah-88.json"
  "surah-87.json"
  "surah-86.json"
  "surah-85.json"
  "surah-84.json"
  "surah-83.json"
  "surah-82.json"
  "surah-81.json"
  "surah-80.json"
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
