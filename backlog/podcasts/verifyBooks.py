import json
import re
from collections import defaultdict

# =========================================================
# TOTAL DE CAPÍTULOS DE CADA LIVRO DA BÍBLIA
# =========================================================

BIBLIA = {
    "Soosei-ki": 50,
    "Shutsu-Ejiputo-ki": 40,
    "Rebi-ki": 27,
    "Minsuu-ki": 36,
    "Shimmei-ki": 34,
    "Yoshua": 24,
    "Shishiki": 21,
    "Rutsu": 4,
    "Samueru-daiichi": 31,
    "Samueru-daini": 24,
    "Retsuoo-daiichi": 22,
    "Retsuoo-daini": 25,
    "Rekidai-daiichi": 29,
    "Rekidai-daini": 36,
    "Ezura": 10,
    "Nehemiya": 13,
    "Esuteru": 10,
    "Yobu": 42,
    "Shihen": 150,
    "Shingen": 31,
    "Dendoo-no-sho": 12,
    "Gaka": 8,
    "Izaya": 66,
    "Eremiya": 52,
    "Aika": 5,
    "Ezekieru": 48,
    "Danieru": 12,
    "Hosea": 14,
    "Yoeru": 3,
    "Amosu": 9,
    "Obadeya": 1,
    "Yona": 4,
    "Mika": 7,
    "Nahomu": 3,
    "Habakuku": 3,
    "Zepaniya": 3,
    "Hagai": 2,
    "Zekariya": 14,
    "Maraki": 4,
    "Matai": 28,
    "Maruko": 16,
    "Ruka": 24,
    "Yohane": 21,
    "Shito": 28,
    "Rooma": 16,
    "Korinto-daiichi": 16,
    "Korinto-daini": 13,
    "Garateya": 6,
    "Efesosu": 6,
    "Firipi": 4,
    "Korosai": 4,
    "Tesaronike-daiichi": 5,
    "Tesaronike-daini": 3,
    "Temote-daiichi": 6,
    "Temote-daini": 4,
    "Tetosu": 3,
    "Firemon": 1,
    "Heburai": 13,
    "Yakobu": 5,
    "Petero-daiichi": 5,
    "Petero-daini": 3,
    "Yohane-daiichi": 5,
    "Yohane-daini": 1,
    "Yohane-daisan": 1,
    "Yuda": 1,
    "Mokushiroku": 22,
}
# =========================================================
# NORMALIZAÇÃO DOS NOMES
# =========================================================

# =========================================================
# REMOVE ACENTOS
# =========================================================

# =========================================================
# EXTRAI LIVRO E CAPÍTULO
# =========================================================


def extrair_livro_capitulo(texto):
    texto = texto.strip()

    match = re.match(r"^(.*?)\s+(\d+)", texto)

    if not match:
        return None, None

    livro = match.group(1)
    capitulo = int(match.group(2))

    return livro, capitulo


# =========================================================
# VERIFICA CAPÍTULOS FALTANDO
# =========================================================


def verificar_capitulos_faltando(lista):
    encontrados = defaultdict(set)

    for item in lista:
        livro, capitulo = extrair_livro_capitulo(item)

        if livro and capitulo:
            encontrados[livro].add(capitulo)

    faltando = {}

    for livro, total in BIBLIA.items():
        existentes = encontrados.get(livro, set())

        caps_faltando = [cap for cap in range(1, total + 1) if cap not in existentes]

        if caps_faltando:
            faltando[livro] = caps_faltando

    return faltando


# =========================================================
# EXEMPLO
# =========================================================

with open("biblia.json", "r", encoding="utf-8") as f:
    dados = json.load(f)

faltando = verificar_capitulos_faltando(dados)

for livro, caps in faltando.items():
    print(f"\n{livro}")
    print(caps)

print("\n===================================")
print("TOTAL DE LIVROS COM FALTAS:", len(faltando))
