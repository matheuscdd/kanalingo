import os
import asyncio
from pathlib import Path
from dotenv import load_dotenv
import azure.cognitiveservices.speech as speechsdk
import json
# =========================
# CONFIG
# =========================
load_dotenv()

SPEECH_KEY = os.environ.get("SPEECH_KEY")
SPEECH_REGION = "eastus"

VOICE = "en-US-JennyNeural"

OUTPUT_DIR = "audio"
words = []
with open("merged.json", encoding="utf-8") as f:
    words = json.load(f).values()

colors = {
    'clean': '\033[m',
    'blue': '\033[34m',
    'red': '\033[31m',
    'pink': '\033[35m',
    'yellow': '\033[33m',
    'cyan': '\033[36m',
    'green': '\033[32m',
    'grey': '\033[37m'
}

# =========================
# SETUP
# =========================

os.makedirs(OUTPUT_DIR, exist_ok=True)

speech_config = speechsdk.SpeechConfig(
    subscription=SPEECH_KEY,
    region=SPEECH_REGION
)

speech_config.speech_synthesis_voice_name = VOICE

# qualidade do áudio
speech_config.set_speech_synthesis_output_format(
    speechsdk.SpeechSynthesisOutputFormat.Webm24Khz16BitMonoOpus
)

# =========================
# GERAR ÁUDIO
# =========================

async def generate_word(noun: dict):
    filename = f"{noun['id']}.webm"
    output_path = Path(OUTPUT_DIR) / filename

    # evita regenerar
    if output_path.exists():
        print(f"[SKIP] {noun['id']}")
        return

    audio_config = speechsdk.audio.AudioOutputConfig(
        filename=str(output_path)
    )

    synthesizer = speechsdk.SpeechSynthesizer(
        speech_config=speech_config,
        audio_config=audio_config
    )

    print(f"{colors['yellow']}[MAKING] {noun['id']} - {noun['word']}{colors['clean']}")

    ssml = f"""
    <speak version='1.0' xml:lang='en-US'>
        <voice name='{VOICE}'>
            <prosody rate="-25%">
                {noun['word']}
            </prosody>
        </voice>
    </speak>
    """

    result = synthesizer.speak_ssml_async(ssml).get()

    if result.reason == speechsdk.ResultReason.SynthesizingAudioCompleted:
        print(f"{colors['green']}[OK] {noun['id']} - {noun['word']}{colors['clean']}")
    else:
        print(f"{colors['red']}[ERRO] {noun['id']} - {noun['word']}{colors['clean']}")
        print(result.reason)

async def main():

    for i, word in enumerate(words):
        await generate_word(word)
        print(f"{colors['pink']}[REMANING] {len(words) - i}{colors['clean']}")

if __name__ == "__main__":
    asyncio.run(main())