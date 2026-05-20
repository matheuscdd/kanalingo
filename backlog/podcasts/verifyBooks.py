import json
import re
from collections import defaultdict

# =========================================================
# TOTAL DE CAPÍTULOS DE CADA LIVRO DA BÍBLIA
# =========================================================

BIBLIA = {
    "Gênesis": 50,
    "Êxodo": 40,
    "Levítico": 27,
    "Números": 36,
    "Deuteronômio": 34,
    "Josué": 24,
    "Juízes": 21,
    "Rute": 4,
    "1 Samuel": 31,
    "2 Samuel": 24,
    "1 Reis": 22,
    "2 Reis": 25,
    "1 Crônicas": 29,
    "2 Crônicas": 36,
    "Esdras": 10,
    "Neemias": 13,
    "Ester": 10,
    "Jó": 42,
    "Salmos": 150,
    "Provérbios": 31,
    "Eclesiastes": 12,
    "Cânticos": 8,
    "Isaías": 66,
    "Jeremias": 52,
    "Lamentações": 5,
    "Ezequiel": 48,
    "Daniel": 12,
    "Oséias": 14,
    "Joel": 3,
    "Amós": 9,
    "Obadias": 1,
    "Jonas": 4,
    "Miquéias": 7,
    "Naum": 3,
    "Habacuque": 3,
    "Sofonias": 3,
    "Ageu": 2,
    "Zacarias": 14,
    "Malaquias": 4,
    "Mateus": 28,
    "Marcos": 16,
    "Lucas": 24,
    "João": 21,
    "Atos": 28,
    "Romanos": 16,
    "1 Coríntios": 16,
    "2 Coríntios": 13,
    "Gálatas": 6,
    "Efésios": 6,
    "Filipenses": 4,
    "Colossenses": 4,
    "1 Tessalonicenses": 5,
    "2 Tessalonicenses": 3,
    "1 Timóteo": 6,
    "2 Timóteo": 4,
    "Tito": 3,
    "Filemon": 1,
    "Hebreus": 13,
    "Tiago": 5,
    "1 Pedro": 5,
    "2 Pedro": 3,
    "1 João": 5,
    "2 João": 1,
    "3 João": 1,
    "Judas": 1,
    "Apocalipse": 22,
}

# =========================================================
# NORMALIZAÇÃO DOS NOMES
# =========================================================

MAPEAMENTO = {
    "genesis": "Gênesis",
    "exodo": "Êxodo",
    "levitico": "Levítico",
    "numeros": "Números",
    "deuteronomio": "Deuteronômio",
    "josue": "Josué",
    "juizes": "Juízes",
    "rute": "Rute",
    "1 samuel": "1 Samuel",
    "2 samuel": "2 Samuel",
    "1 reis": "1 Reis",
    "2 reis": "2 Reis",
    "1 cronicas": "1 Crônicas",
    "2 cronicas": "2 Crônicas",
    "esdras": "Esdras",
    "neemias": "Neemias",
    "ester": "Ester",
    "jo": "Jó",
    "salmos": "Salmos",
    "proverbios": "Provérbios",
    "eclesiastes": "Eclesiastes",
    "canticos": "Cânticos",
    "isaias": "Isaías",
    "jeremias": "Jeremias",
    "lamentacoes": "Lamentações",
    "ezequiel": "Ezequiel",
    "daniel": "Daniel",
    "oseias": "Oséias",
    "joel": "Joel",
    "amos": "Amós",
    "obadias": "Obadias",
    "jonas": "Jonas",
    "miqueias": "Miquéias",
    "naum": "Naum",
    "habacuque": "Habacuque",
    "sofonias": "Sofonias",
    "ageu": "Ageu",
    "zacarias": "Zacarias",
    "malaquias": "Malaquias",
    "mateus": "Mateus",
    "marcos": "Marcos",
    "lucas": "Lucas",
    "joao": "João",
    "atos": "Atos",
    "romanos": "Romanos",
    "1 corintios": "1 Coríntios",
    "2 corintios": "2 Coríntios",
    "galatas": "Gálatas",
    "efesios": "Efésios",
    "filipenses": "Filipenses",
    "colossenses": "Colossenses",
    "1 tessalonicenses": "1 Tessalonicenses",
    "2 tessalonicenses": "2 Tessalonicenses",
    "1 timoteo": "1 Timóteo",
    "2 timoteo": "2 Timóteo",
    "tito": "Tito",
    "filemon": "Filemon",
    "hebreus": "Hebreus",
    "tiago": "Tiago",
    "1 pedro": "1 Pedro",
    "2 pedro": "2 Pedro",
    "1 joao": "1 João",
    "2 joao": "2 João",
    "3 joao": "3 João",
    "judas": "Judas",
    "apocalipse": "Apocalipse",
}

# =========================================================
# REMOVE ACENTOS
# =========================================================

def remover_acentos(texto):
    substituicoes = {
        "á": "a", "à": "a", "ã": "a", "â": "a",
        "é": "e", "ê": "e",
        "í": "i",
        "ó": "o", "ô": "o", "õ": "o",
        "ú": "u",
        "ç": "c",
    }

    texto = texto.lower()

    for k, v in substituicoes.items():
        texto = texto.replace(k, v)

    return texto

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

    livro_normalizado = remover_acentos(livro)

    livro_final = MAPEAMENTO.get(livro_normalizado)

    return livro_final, capitulo

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

        caps_faltando = [
            cap
            for cap in range(1, total + 1)
            if cap not in existentes
        ]

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