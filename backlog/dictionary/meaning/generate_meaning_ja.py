import os
from dotenv import load_dotenv
from openai import OpenAI
import time
import json

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

load_dotenv()

deployment_name = "gpt-4.1"

client = OpenAI(
    base_url=os.environ.get("ENDPOINT"),
    api_key=os.environ.get("API_KEY")
)

def build_prompt(word, sense):
    return f"""
Você é um dicionário japonês escolar.

Crie uma definição em japonês simples (JP-JP).

Regras:
- não use inglês
- 1 frase apenas
- estilo de dicionário escolar
- não invente novos significados

Palavra: {word}
Significado: {sense}
""".strip()

def call_gpt(prompt):
    res = client.chat.completions.create(
        model=deployment_name,
        messages=[
            {"role": "system", "content": "Você é um dicionário japonês."},
            {"role": "user", "content": prompt}
        ],
        temperature=0.2
    )

    time.sleep(3)

    return res.choices[0].message.content.strip()


    

def extract_senses(entry):
    senses = []

    for s in entry["sense"]:
        for g in s["gloss"]:
            if g["lang"] == "eng":
                senses.append(g)

    return senses

def process_entry(noun):
    word = noun["kanji"][0]["text"] if noun["kanji"] else noun["kana"][0]["text"]

    for sense in noun["raw_senses"]:

        path = f"output/{sense['id']}.json"
        if os.path.exists(path):
            print(f"[SKIP] {sense['id']}")
            return

        print(f"{colors['yellow']}[MAKING] {sense['id']} - {sense['text']}{colors['clean']}")
        definition = call_gpt(build_prompt(word, sense["text"]))
        obj = {
            "wordId": noun["id"],
            "wordText": word,
            "senseText": sense["text"],
            "senseId": sense["id"],
            "definition": definition
        }
        print(f"{colors['green']}[OK] {sense['id']} - {sense['text']}{colors['clean']}")  
        save_json(path, obj)
    
    

def load_sample():
    with open('jmdict-eng-3.6.2.handle.json', 'r', encoding='utf-8') as f:
        data = json.load(f)["words"]
        tot = 0
        for x in data:
            x["raw_senses"] = extract_senses(x)
            tot += len(x["raw_senses"])

        for x in data:
            process_entry(x)
            tot -= len(x['raw_senses'])
            print(f"{colors['pink']}[REMANING] {tot}{colors['clean']}")

def save_json(path, content):
    with open(path, 'w', encoding='utf-8') as f:
        json.dump(content, f, indent=2, ensure_ascii=False)

load_sample()

