import sys
import json
import time
import string
import platform
from tqdm import tqdm
from faster_whisper import WhisperModel

if len(sys.argv) < 2:
    raise Exception("Use: python script.py <file>")

if platform.system() != "Linux":
    raise EnvironmentError("❌ Este script só pode ser executado no Linux.")

print("Iniciando...")
model = WhisperModel(
    "large-v3",
    device="cuda",
    compute_type="float16"
    # compute_type="int8_float16"
)

filename = sys.argv[1]
segments, info = model.transcribe(
    f"{filename}.wav",
    beam_size=10,
    best_of=10,
    patience=2,
    length_penalty=1.0,
    repetition_penalty=1.02,
    temperature=0,
    vad_filter=True,
    condition_on_previous_text=True,
    word_timestamps=True,
    language="en"
)

total_duration = info.duration  # duração total do áudio em segundos
start_time = time.time()

resultado_json = []


pbar = tqdm(total=total_duration, unit="s", desc="Transcrevendo")

processed_audio = 0

for segment in segments:
    item = {
        "start": segment.start,
        "end": segment.end,
        "text": segment.text,
        "words": []
    }

    for word in segment.words:
        item["words"].append({
            "word": word.word,
            "start": word.start,
            "end": word.end
        })

    resultado_json.append(item)

    # Atualiza progresso baseado no tempo do áudio processado
    segment_duration = segment.end - segment.start
    processed_audio += segment_duration
    pbar.update(segment_duration)

    # Calcula ETA
    elapsed = time.time() - start_time
    speed = processed_audio / elapsed
    remaining = (total_duration - processed_audio) / speed if speed > 0 else 0

    pbar.set_postfix({
        "Processado": f"{processed_audio:.1f}s",
        "Restante": f"{remaining/60:.1f} min"
    })

pbar.close()

with open(f"{filename}.json", "w", encoding="utf-8") as f:
    for x in resultado_json:
         x["text"] = x["text"].strip()
         for w in x["words"]:
              w["word"] = w["word"].translate(str.maketrans('', '', string.punctuation)).strip()
              
    json.dump(resultado_json, f, ensure_ascii=False, indent=2)

with open(f"{filename}.txt", "w", encoding="utf-8") as f:
    for item in resultado_json:
        f.write(item["text"] + "\n") 
