import json
import re

def srt_to_whisper_json(srt_file_path, output_json_path):
    segments = []

    with open(srt_file_path, 'r', encoding='utf-8') as f:
        content = f.read()

    # Divide os blocos pelo padrão de SRT
    blocks = re.split(r'\n\n+', content.strip())

    for block in blocks:
        lines = block.strip().splitlines()
        if len(lines) >= 3:
            # Normalmente: 0 -> número, 1 -> tempo, 2+ -> texto
            time_line = lines[1]
            text_lines = lines[2:]
            text = ' '.join(text_lines).replace('\u200b', '').strip()

            # Extrai start e end
            match = re.match(r'(\d{2}:\d{2}:\d{2},\d{3}) --> (\d{2}:\d{2}:\d{2},\d{3})', time_line)
            if match:
                start_time = match.group(1)
                end_time = match.group(2)

                # Converte para segundos
                def time_to_seconds(t):
                    h, m, s_ms = t.split(':')
                    s, ms = s_ms.split(',')
                    return int(h)*3600 + int(m)*60 + int(s) + int(ms)/1000

                segment = {
                    "start": time_to_seconds(start_time),
                    "end": time_to_seconds(end_time),
                    "text": text
                }
                segments.append(segment)

    # Salva como JSON
    with open(output_json_path, 'w', encoding='utf-8') as out_file:
        json.dump(segments, out_file, ensure_ascii=False, indent=2)

    print(f"Arquivo convertido com sucesso! {len(segments)} segmentos encontrados.")

# Exemplo de uso
srt_to_whisper_json("file.srt", "meu_video_whisper.json")