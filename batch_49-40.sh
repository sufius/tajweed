#!/bin/bash

# Argument prüfen
if [ -z "$1" ]; then
  echo "❗ Fehler: Du musst einen Übersetzungsschlüssel angeben (z. B. de-27)"
  echo "➡️  Verwendung: $0 de-27"
  exit 1
fi

TRANSLATION_KEY="$1"

# Liste der Suren-Dateien
FILES=(
  "surah-49.json"
  "surah-48.json"
  "surah-47.json"
  "surah-46.json"
  "surah-45.json"
  "surah-44.json"
  "surah-43.json"
  "surah-42.json"
  "surah-41.json"
  "surah-40.json"
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
    sleep 1
  done
  echo "⏳ Warte 10 Sekunden, um Rate Limits zu vermeiden..."
  sleep 10
done
