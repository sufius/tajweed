#!/bin/bash

# Liste der Suren-Dateien
FILES=(
  "surah-100.json"
  "surah-101.json"
  "surah-102.json"
  "surah-103.json"
  "surah-104.json"
  "surah-105.json"
  "surah-106.json"
  "surah-107.json"
  "surah-108.json"
  "surah-109.json"
  "surah-110.json"
  "surah-111.json"
  "surah-112.json"
  "surah-114.json"
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
