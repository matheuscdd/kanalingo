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

  while [ "$TEMP" -ge "$TEMP_LIMIT" ]; do
    echo "🔥 GPU quente: ${TEMP}°C — esperando esfriar..."
    sleep $SLEEP_TIME
    TEMP=$(get_temp)
  done

  echo "✅ Temperatura ok: ${TEMP}°C"
}

for file in files/*.wav; do
    wait_for_cooldown
    # Pega o nome do arquivo sem extensão
    filename=$(basename "$file" .wav)
    
    # Converte para WAV mantendo o nome
    echo "[x] Transcribing $filename"
    python whysper.py "files/$filename"
    mv "$file" "files/done"
done