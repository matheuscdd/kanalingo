import os
import json
from pathlib import Path

PASTA_JSON = "results"
ARQUIVO_SAIDA = "chat_gpt.json"


def juntar_json_arrays(pasta, arquivo_saida):
    resultado = []

    for arquivo in Path(pasta).glob("*.json"):
        try:
            with open(arquivo, "r", encoding="utf-8") as f:
                dados = json.load(f)

                if isinstance(dados, list):
                    for x in dados:
                        if 'pt' in x.keys():
                            try:
                                origin = x["pt"]
                                x["pt"] = x["pt"][x["pt"].index('[')+1:x["pt"].index(']')].replace("'", "").replace('"', "").replace("/", "").split(",")
                                x["pt"] =  [y.strip() for y in x["pt"]]
                            except Exception as h:
                                x["pt"] = origin
                                print(x["senseUid"])
                    resultado.extend(dados)
                    
                else:
                    print(f"⚠️ Ignorado (não é array): {arquivo}")
           
        except Exception as e:
            print(f"❌ Erro ao ler {arquivo}: {e}")

    with open(arquivo_saida, "w", encoding="utf-8") as f:
        json.dump(resultado, f, ensure_ascii=False, indent=2)

    print(f"\n✅ Arquivo gerado: {arquivo_saida}")
    print(f"📦 Total de itens: {len(resultado)}")


if __name__ == "__main__":
    juntar_json_arrays(PASTA_JSON, ARQUIVO_SAIDA)