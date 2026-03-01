#!/bin/bash

sudo nvidia-smi -pl 260

TEMP_LIMIT=75
SLEEP_TIME=30

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

for file in *.wav; do
    wait_for_cooldown
    # Pega o nome do arquivo sem extensão
    filename=$(basename "$file" .m4a)
    
    # Converte para WAV mantendo o nome
    python whysper.py "$filename"
done