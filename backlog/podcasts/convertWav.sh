#!/bin/bash

for file in *.m4a; do
    # Pega o nome do arquivo sem extensão
    filename=$(basename "$file" .m4a)
    
    # Converte para WAV mantendo o nome
    ffmpeg -i "$file" -ar 16000 -ac 1 "${filename}.wav"
done