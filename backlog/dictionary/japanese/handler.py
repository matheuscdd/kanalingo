import json
from pykakasi import kakasi
from uuid import uuid4

ket = 'jmdict-eng-3.6.2.handle.json'
kks = kakasi()

# res = {}
with open(ket, 'r', encoding='utf-8') as f:
    res = json.load(f)
    for x in res["words"]:
        for k in x["kana"]:
            print(k)
            break
        break
# with open(ket, 'r', encoding='utf-8') as f:
#     res = json.load(f)
#     for x in res["words"]:
#         for k in x["kana"]:
#             k["id"] = str(uuid4())
#             kks_result = kks.convert(k["text"])
#             romaji = "".join(item["hepburn"] for item in kks_result)
#             k["romaji"] = romaji if romaji else None

# with open(ket, 'w', encoding='utf-8') as f:
#     json.dump(res, f, ensure_ascii=False)