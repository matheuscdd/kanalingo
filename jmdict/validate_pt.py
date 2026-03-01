import json
from pathlib import Path

def ler_json_array(caminho_arquivo):
    try:
        # Abrir arquivo com UTF-8
        with open(caminho_arquivo, "r", encoding="utf-8") as f:
            dados = json.load(f)

        # Verificar se é um array
        if not isinstance(dados, list):
            raise ValueError("O JSON não é um array.")

        return dados

    except FileNotFoundError:
        print("Arquivo não encontrado.")
    except json.JSONDecodeError as e:
        print("Erro ao decodificar JSON:", e)
    except Exception as e:
        print("Erro:", e)


if __name__ == "__main__":
    caminho = Path("azure_translator.json")

    array_json = ler_json_array(caminho)

    if array_json:
        print(f"Total de itens: {len(array_json)}\n")

        for i in array_json:
            if not isinstance(i["pt"], list):
                print(i["senseUid"])