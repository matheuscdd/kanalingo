#!/bin/bash

set -euo pipefail
source .venv-whysper/bin/activate

TEMP_LIMIT=75
SLEEP_TIME=30

mkdir -p "files/done"

get_temp() {
  nvidia-smi --query-gpu=temperature.gpu --format=csv,noheader,nounits
}

wait_for_cooldown() {
  TEMP=$(get_temp)

  while [[ "$TEMP" =~ ^[0-9]+$ ]] && [ "$TEMP" -ge "$TEMP_LIMIT" ]; do
    echo "🔥 GPU quente: ${TEMP}°C — esperando esfriar..."
    sleep $SLEEP_TIME
    TEMP=$(get_temp)
  done

  echo "✅ Temperature ok: ${TEMP}°C"
}

total=$(find files -maxdepth 1 -name "*.wav" | wc -l)
current=0

for file in files/*.wav; do
    wait_for_cooldown

    ((++current))
    percent=$((current * 100 / total))
    # Pega o nome do arquivo sem extensão
    filename=$(basename "$file" .wav)
    
    # Converte para WAV mantendo o nome
    echo "[$current/$total - ${percent}%] Transcribing $filename"
    python whysper.py "files/$filename"
    mv "$file" "files/done"
done