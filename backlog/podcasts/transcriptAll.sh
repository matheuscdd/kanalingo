#!/bin/bash

set -uo pipefail

ROOT_DIR="${1:-}"
LANGUAGE="${2:-}"
BRIEFING="${3:-}"

if [[ ! -d "${ROOT_DIR}" ]]; then
  echo "Diretório não encontrado: ${ROOT_DIR}" >&2
  exit 1
fi

if [[ -z "${LANGUAGE}" ]]; then
  echo "Língua não selecionada, ex: pt, en" >&2
  exit 1
fi

if [[ -z "${BRIEFING}" ]]; then
  echo "Briefing não informado" >&2
  exit 1
fi

if [[ -f ".venv-whysper/bin/activate" ]]; then
  source .venv-whysper/bin/activate
else
  echo "Ambiente virtual .venv-whysper não encontrado. Rode ./deps.sh primeiro." >&2
  exit 1
fi

echo "Verificando arquivos .webm em ${ROOT_DIR}..."
mapfile -d '' webm_files < <(find "${ROOT_DIR}" -type f -name "*.webm" -size +10k -print0 | sort -z)

if [[ ${#webm_files[@]} -eq 0 ]]; then
  echo "Nenhum .webm encontrado em ${ROOT_DIR}"
  exit 0
fi

total=0
for webm_file in "${webm_files[@]}"; do
  base_name="${webm_file%.webm}"
  transcript_file="${base_name}.transcription.json"

  if [[ -f "${transcript_file}" ]] && [[ $(stat -c%s "${transcript_file}") -gt 10240 ]]; then
    continue
  fi

  ((total++))
done

if [[ "${total}" -eq 0 ]]; then
  echo "✅ Nenhum áudio pendente para transcrição."
  exit 0
fi

echo "Pendentes para transcrição: $total"
current=0
for webm_file in "${webm_files[@]}"; do
  base_name="${webm_file%.webm}"
  transcript_file="${base_name}.transcription.json"

  if [[ -f "${transcript_file}" ]] && [[ $(stat -c%s "${transcript_file}") -gt 10240 ]]; then
    continue
  fi

  ((current++))
  percent=0
  if [[ "${total}" -gt 0 ]]; then
    percent=$((current * 100 / total))
  fi

  wav_file="${base_name}.wav"
  echo "[${current}/${total} - ${percent}%] Processando $(basename "${webm_file}")"

  if ! ffmpeg -y -i "$webm_file" -ar 16000 -ac 1 "$wav_file" >/dev/null 2>&1; then
    echo "Falha no ffmpeg em: $webm_file" >&2
    continue
  fi

  if ! python "$(dirname "$0")/whysper.py" "${LANGUAGE}" "${BRIEFING}" "${base_name}"; then
    echo "Falha na transcrição em: ${base_name}" >&2
  fi

  if [[ -f "${wav_file}" ]]; then
    rm -f "${wav_file}"
  fi
done

echo "✅ Processamento concluído."