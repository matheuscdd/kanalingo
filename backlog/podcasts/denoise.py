import subprocess
import os
import soundfile as sf
from df.enhance import enhance, init_df
import sys
import platform
import shutil

if len(sys.argv) < 2:
    raise Exception("Use: python denoise.py <file>")

if platform.system() != "Linux":
    raise EnvironmentError("❌ Este script só pode ser executado no Linux.")

print("Iniciando denoise...")

filename = sys.argv[1]
audio_path = f"{filename}.wav"
base = os.path.splitext(os.path.basename(audio_path))[0]

tmp_dir = "__demucs_tmp__"

# subprocess.run([
#     "python", "-m", "demucs",
#     "--two-stems=vocals",
#     audio_path,
#     "-o", tmp_dir
# ], check=True)

subprocess.run([
    "python", "-m", "demucs",
    "-n", "htdemucs",
    "--device=cuda",
    "--two-stems=vocals",
      "--shifts=4" ,
  "--overlap=0.5" ,
  "--float32", 
    audio_path,
    "-o", tmp_dir
], check=True)

vocals_path = os.path.join(
    tmp_dir,
    "htdemucs",
    base,
    "vocals.wav"
)
print(vocals_path)
exit()

# 2️⃣ DeepFilterNet
model, df_state, _ = init_df()

audio, sr = sf.read(vocals_path)

enhanced = enhance(model, df_state, audio)

# normalizar
enhanced = enhanced / max(abs(enhanced))

# 3️⃣ sobrescrever original
sf.write(audio_path, enhanced, sr)

# 4️⃣ apagar pasta temporária
shutil.rmtree(tmp_dir)

print("✅ áudio original limpo:", audio_path)