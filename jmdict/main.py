import os
import json
from concurrent.futures import ThreadPoolExecutor, as_completed
from dotenv import load_dotenv
import time
import requests, uuid, json

# Add your key and endpoint

endpoint = "https://api.cognitive.microsofttranslator.com"

# location, also known as region.
# required if you're using a multi-service or regional (not global) resource. It can be found in the Azure portal on the Keys and Endpoint page.
location = "brazilsouth"

path = '/translate'
constructed_url = endpoint + path

params = {
    'api-version': '3.0',
    'from': 'en',
    'to': 'pt'
}
# Carregar variáveis de ambiente
load_dotenv()
key = os.environ.get("OPENAI_API_KEY")

# Exemplo de lista de palavras para traduzir

words_to_translate = []
with open('jmdict-eng-3.6.2.handle.json', "r", encoding="utf-8") as ff:
    res = json.load(ff)
    for word in res["words"]:
        for sense in word["sense"]:
            words_to_translate.append({
                    "kana": word["kana"][0]["text"],
                    "en": [x["text"] for x in sense["gloss"]],
                    "senseUid": sense["uid"],
                    "wordId": word["id"]
                })
                                
# # Armazenar resultados
translated_entries = []
MAX_TRANSLATIONS = 10  # parar depois de 1000
BATCH_SIZE = 100         # salvar a cada 100
THREADS = 10

def traduzir_word(entry):
    kana = entry["kana"]
    gloss = entry["en"]
    prompt = f"""Traduza do inglês para o português considerando o sentido japonês. Kana: {kana}, Gloss: {gloss}""".replace('"', "")
    try:
        headers = {
            'Ocp-Apim-Subscription-Key': key,
            # location required if you're using a multi-service or regional (not global) resource.
            'Ocp-Apim-Subscription-Region': location,
            'Content-type': 'application/json',
            'X-ClientTraceId': str(uuid.uuid4())
        }

        # You can pass more than one object in body.
        body = [{
            'text': prompt
        }]

        request = requests.post(constructed_url, params=params, headers=headers, json=body)
        response = request.json()
        raw_text = response[0]["translations"][0]["text"]
        entry["pt"] = json.loads(raw_text[raw_text.index("["):].replace("'", '"'))
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
            filename = f"translations_batch_{batch_count}.json"
            with open(filename, "w", encoding="utf-8") as f:
                json.dump(translated_entries, f, ensure_ascii=False, indent=2)
            print(f"Lote {batch_count} salvo ({total_processed} traduções processadas).")
            translated_entries = []  # reset para próximo lote
        
        # Parar quando chegar em MAX_TRANSLATIONS
        if total_processed >= MAX_TRANSLATIONS:
            break

print("Tradução finalizada! Total processado:", total_processed)

