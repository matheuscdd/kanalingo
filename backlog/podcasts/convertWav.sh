#!/bin/bash

set -euo pipefail
source .venv-denoise/bin/activate

for file in files/*.m4a; do
    # Pega o nome do arquivo sem extensão
    filename=$(basename "$file" .m4a)
    
    # Converte para WAV mantendo o nome
    # ffmpeg -i "$file" -ar 16000 -ac 1 "files/${filename}.wav"
    python denoise.py "files/${filename}"
    break
done