import os
import json
from concurrent.futures import ThreadPoolExecutor, as_completed
from dotenv import load_dotenv
import time
from openai import AzureOpenAI

# Add your key and endpoint
load_dotenv()
# location, also known as region.
# required if you're using a multi-service or regional (not global) resource. It can be found in the Azure portal on the Keys and Endpoint page.
location = "brazilsouth"
endpoint = os.environ.get("ENDPOINT")
model_name = "gpt-4.1"
deployment = "gpt-4.1"

import threading
from collections import deque
import time

RATE_LIMIT = 49
WINDOW = 40  # segundos

request_times = deque()
rate_lock = threading.Lock()



# Carregar variáveis de ambiente

key = os.environ.get("OPENAI_API_KEY2")

# Exemplo de lista de palavras para traduzir

words_to_translate = []
with open('jmdict-eng-3.6.2.handle.json', "r", encoding="utf-8") as ff:
    res = json.load(ff)
    for word in res["words"]:
        if int(word["id"]) <= 1382170:
            continue
        for sense in word["sense"]:
            words_to_translate.append({
                    "kana": word["kana"][0]["text"],
                    "en": [x["text"] for x in sense["gloss"]],
                    "senseUid": sense["uid"],
                    "wordId": word["id"]
                })
print(len(words_to_translate))              
# # Armazenar resultados
translated_entries = []
MAX_TRANSLATIONS = len(words_to_translate) 

# parar depois de 1000
BATCH_SIZE = 100         # salvar a cada 100
THREADS = 10

client = AzureOpenAI(
    api_version="2024-12-01-preview",
    azure_endpoint=endpoint,
    api_key=key,
)

def traduzir_word(entry):
    kana = entry["kana"]
    gloss = entry["en"]
    prompt = f"""
    Traduza do inglês para o português considerando o sentido japonês. 
    Kana: {kana}
    Gloss: {gloss}

    Output JSON:
    {{"a": [...]}}""".replace('"', "'")
    try:
        response = client.chat.completions.create(
            messages=[{"role": "user", "content": prompt}],
            max_completion_tokens=13107,
            temperature=0,
            top_p=1.0,
            presence_penalty=0.0,
            model=deployment
        )

        raw_text = response.choices[0].message.content.strip().replace("{'a': ", "").replace("}", "")
        entry["pt"] = raw_text
        return entry
    except Exception as e:
        print(f"Erro ao traduzir {kana}: {e}")
        return None
    
# Lista de resultados temporária
translated_entries = []
total_processed = 0
batch_count = 0

# Processar em ThreadPool
with ThreadPoolExecutor(max_workers=THREADS) as executor:
    # Limitar a lista para MAX_TRANSLATIONS
    limited_words = words_to_translate[:MAX_TRANSLATIONS]
    
    futures = {executor.submit(traduzir_word, w): w for w in limited_words}
    
    for future in as_completed(futures):
        result = future.result()
        if result:
            translated_entries.append(result)
            total_processed += 1
        
        # Salvar em lotes de 100
        if total_processed % BATCH_SIZE == 0 or total_processed == MAX_TRANSLATIONS:
            batch_count += 1
            filename = f"results/{time.time()}translations_batch_d{batch_count}.json"
            with open(filename, "w", encoding="utf-8") as f:
                json.dump(translated_entries, f, ensure_ascii=False, indent=2)
            print(f"Lote {batch_count} salvo ({total_processed} traduções processadas).")
            translated_entries = []  # reset para próximo lote
        
        # Parar quando chegar em MAX_TRANSLATIONS
        if total_processed >= MAX_TRANSLATIONS:
            break

print("Tradução finalizada! Total processado:", total_processed)

