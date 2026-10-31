import os
import sys
import json
import time
import string
import platform
from tqdm import tqdm
from faster_whisper import WhisperModel
import whisperx

if len(sys.argv) < 4:
    raise Exception("Use: python whysper.py <language> <briefing> <file>")

if platform.system() != "Linux":
    raise EnvironmentError("❌ Este script só pode ser executado no Linux.")

print("Starting whysper...")

device = "cuda"
language = sys.argv[1].strip()
briefing = sys.argv[2].strip()
source = sys.argv[3].strip()

if source.lower().endswith(".wav"):
    base_name = source[:-4]
elif source.lower().endswith(".webm"):
    base_name = source[:-5]
else:
    base_name = source

webm_path = f"{base_name}.webm"
wav_path = f"{base_name}.wav"

if not os.path.exists(wav_path):
    raise FileNotFoundError(f"Arquivo WAV não encontrado: {wav_path}")

# -----------------------------
# 1️⃣ Carrega modelo Whisper
# -----------------------------
model = WhisperModel(
    "large-v3",
    device=device,
    compute_type="float16"
)

# -----------------------------
# 2️⃣ Transcrição inicial
# -----------------------------
segments, info = model.transcribe(
    wav_path,
    beam_size=15,
    temperature=[0.0, 0.2, 0.4],
    best_of=15,
    patience=2,
    length_penalty=1.0,
    repetition_penalty=1.02,
    vad_filter=True,
    condition_on_previous_text=False,
    word_timestamps=True,
    language=language,
    initial_prompt=briefing
)

total_duration = info.duration
start_time = time.time()

low_confidence_segments = []
fw_segments = []

pbar = tqdm(total=total_duration, unit="s", desc="Transcribing")
processed_audio = 0

# -----------------------------
# 3️⃣ Processa saída original
# -----------------------------
for segment in segments:
    if segment.avg_logprob < -1.0:
        low_confidence_segments.append(
            f"[{segment.start:.2f}s - {segment.end:.2f}s] "
            f"logprob={segment.avg_logprob:.2f} | "
            f"{segment.text.strip()}"
        )

    fw_segments.append({
        "start": segment.start,
        "end": segment.end,
        "text": segment.text
    })

    segment_duration = segment.end - segment.start
    processed_audio += segment_duration
    pbar.update(segment_duration)

    elapsed = time.time() - start_time
    speed = processed_audio / elapsed
    remaining = (total_duration - processed_audio) / speed if speed > 0 else 0

    pbar.set_postfix({
        "Processado": f"{processed_audio:.1f}s",
        "Restante": f"{remaining/60:.1f} min"
    })

pbar.close()

# -----------------------------
# 4️⃣ Alinhamento com WhisperX
# -----------------------------
print("Alinhando com WhisperX...")

audio = whisperx.load_audio(wav_path)

result = {
    "segments": fw_segments,
    "language": info.language
}

model_a, metadata = whisperx.load_align_model(
    language_code=result["language"],
    device=device
)

result_aligned = whisperx.align(
    result["segments"],
    model_a,
    metadata,
    audio,
    device
)

# -----------------------------
# 5️⃣ Gera JSON final usando alinhamento
# -----------------------------
final_result_json = []

for segment in result_aligned["segments"]:
    item = {
        "start": segment["start"],
        "end": segment["end"],
        "text": segment["text"].strip(),
        "words": []
    }

    if "words" in segment:
        for word in segment["words"]:
            cleaned_word = word["word"].translate(
                str.maketrans('', '', string.punctuation)
            ).strip()

            item["words"].append({
                "word": cleaned_word,
                "start": word["start"],
                "end": word["end"]
            })

    final_result_json.append(item)

# -----------------------------
# 6️⃣ Salva arquivos
# -----------------------------
with open(f"{base_name}.transcription.json", "w", encoding="utf-8") as f:
    json.dump(final_result_json, f, ensure_ascii=False, indent=2)

with open(f"{base_name}.txt", "w", encoding="utf-8") as f:
    for item in final_result_json:
        f.write(item["text"] + "\n")

if low_confidence_segments:
    with open(f"{base_name}_low_confidence.txt", "w", encoding="utf-8") as f:
        f.write("\n".join(low_confidence_segments))

    print(f"⚠ {len(low_confidence_segments)} segmentos com baixa confiança salvos.")
else:
    print("✅ Nenhum segmento com baixa confiança detectado.")

if os.path.exists(wav_path):
    os.remove(wav_path)
    print(f"Arquivo temporário removido: {wav_path}")

print()