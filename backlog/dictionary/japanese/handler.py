import json
from uuid import uuid4

res = {}
data = {}
ket = 'chat_gpt.json'

with open('keymap.json', 'r', encoding='utf-8') as f:
    res = json.load(f)

with open(ket, 'r', encoding='utf-8') as f:
    data = json.load(f)
    for x in data:
        x["wordId"] = res[x["wordId"]]


with open(ket, 'w', encoding='utf-8') as f:
    json.dump(data, f, ensure_ascii=False, indent=2)
    