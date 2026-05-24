import json
import os
import re
import unicodedata
import xml.etree.ElementTree as ET


XML_DIR = os.path.dirname(os.path.abspath(__file__))
OUTPUT_PATH = os.path.join(XML_DIR, "saida.json")

GRAMMATICAL_CLASS_ORDER = [
    "suffix",
    "adj",
    "det",
    "pron",
    "num",
    "noun",
    "prefix",
    "particle",
    "prep",
    "interfix",
    "postp",
    "adv_phrase",
    "prep_phrase",
    "phrase",
    "adv",
    "contraction",
    "intj",
    "conj",
    "proverb",
    "name",
    "verb",
]
GRAMMATICAL_CLASS_SET = set(GRAMMATICAL_CLASS_ORDER)
UNKNOWN_GRAMMATICAL_CLASSES = {}
CLASS_PATTERNS = {
    "suffix": [r"\bsuf\.?(\s|$|,)"],
    "prefix": [r"\bpref\.?(\s|$|,)"],
    "interfix": [r"\b(interfix|interf|infix)\b"],
    "postp": [r"\bpostp\.?(\s|$)"],
    "pron": [
        r"\bpron\.?(\s|$)",
        r"\bpess\.?(\s|$)",
        r"\bindef\.?(\s|$)",
        r"\bdemonstr\.?(\s|$)",
        r"\brelat\.?(\s|$)",
    ],
    "det": [r"\b(art|det)\.?(\s|$)"],
    "num": [r"\bnum\.?(\s|$)"],
    "adj": [r"\badj\.?(\s|$)", r"\bqualif\.?(\s|$)"],
    "adv": [r"\badv\.?(\s|$)"],
    "prep": [r"\bprep\.?(\s|$)", r"\bprepos\.?(\s|$)"],
    "intj": [r"\binterj\.?(\s|$)"],
    "conj": [r"\bconj(unct)?\.?(\s|$)"],
    "proverb": [r"\bprov(erbio)?\.?(\s|$)"],
    "contraction": [r"\bcontr(ac[cg][aao])?\.?(\s|$)", r"\babrev\.?(\s|$)"],
    "name": [r"\bnome\b", r"\bn\.\s*p\."],
    "verb": [
        r"\bpart\.\s*irr\b",
        r"\bverb(al)?\.?(\s|$)",
        r"(^|[^a-z])v\.([^a-z]|$)",
        r"\binf\.?(\s|$)",
    ],
    "particle": [r"\bpartic(ula|le)\b"],
}
DEF_PREFIX_PATTERN = re.compile(r"^_([^_]+)_\s*")
LEADING_NOTE_PATTERN = re.compile(r"^\([^)]*\)\s*")


def simplify_text(text):
    compact = " ".join((text or "").split())
    normalized = unicodedata.normalize("NFKD", compact.casefold())
    return "".join(char for char in normalized if not unicodedata.combining(char))


def add_class(classes, class_name):
    if class_name in GRAMMATICAL_CLASS_SET and class_name not in classes:
        classes.append(class_name)


def record_unknown(raw_value):
    if raw_value:
        UNKNOWN_GRAMMATICAL_CLASSES[raw_value] = UNKNOWN_GRAMMATICAL_CLASSES.get(raw_value, 0) + 1


def detect_phrase_classes(simplified):
    classes = []
    is_adv_phrase = bool(re.search(r"\bloc\.\s*adv\b", simplified))
    is_prep_phrase = bool(re.search(r"\bloc\.\s*(prep|prepos)\b", simplified))
    has_locution = "loc." in simplified

    if is_adv_phrase:
        add_class(classes, "adv_phrase")
    if is_prep_phrase:
        add_class(classes, "prep_phrase")
    if has_locution and not is_adv_phrase and not is_prep_phrase:
        add_class(classes, "phrase")

    return classes, is_adv_phrase, is_prep_phrase


def detect_pattern_classes(simplified, is_adv_phrase, is_prep_phrase):
    classes = []
    for class_name, patterns in CLASS_PATTERNS.items():
        if class_name == "adv" and is_adv_phrase:
            continue
        if class_name == "prep" and is_prep_phrase:
            continue
        if any(re.search(pattern, simplified) for pattern in patterns):
            add_class(classes, class_name)
    return classes


def is_noun_entry(simplified):
    if re.search(r"\bsubst\.?(\s|$)", simplified):
        return True
    if re.match(r"^(adj|pron|(art|det))\.?(\s|$)", simplified):
        return False
    return bool(re.match(r"^(m|f|pl|s|subst|substantivo|fem|masc)\.?(\s|$)", simplified))


def normalize_grammatical_classes(raw_value, record_unknown_value=True):
    simplified = simplify_text(raw_value)
    classes, is_adv_phrase, is_prep_phrase = detect_phrase_classes(simplified)

    for class_name in detect_pattern_classes(simplified, is_adv_phrase, is_prep_phrase):
        add_class(classes, class_name)

    if is_noun_entry(simplified):
        add_class(classes, "noun")

    if not classes and record_unknown_value:
        record_unknown(" ".join((raw_value or "").split()))

    return [class_name for class_name in GRAMMATICAL_CLASS_ORDER if class_name in classes]


def extract_text(elem):
    if elem is None:
        return None

    text = " ".join("".join(elem.itertext()).split())
    return text or None


def extract_classes(sense):
    classes = []
    for gram_group in sense.findall(".//gramGrp"):
        for class_name in normalize_grammatical_classes(extract_text(gram_group)):
            add_class(classes, class_name)
    return classes


def extract_prefixed_classes(definition):
    if not definition:
        return [], definition

    match = DEF_PREFIX_PATTERN.match(definition)
    if not match:
        return [], definition

    classes = normalize_grammatical_classes(match.group(1), record_unknown_value=False)
    if not classes:
        return [], definition

    cleaned_definition = definition[match.end():].strip()
    cleaned_definition = LEADING_NOTE_PATTERN.sub("", cleaned_definition).strip()
    return classes, cleaned_definition


def build_record(word, pos, definition):
    return {
        "word": word,
        "pos": pos,
        "def": definition,
    }


def entry_to_records(entry):
    word = extract_text(entry.find("./form/orth"))
    if not word:
        return []

    records = []
    for sense in entry.findall("./sense"):
        definition = extract_text(sense.find("./def"))
        if not definition:
            continue

        classes = extract_classes(sense)
        if not classes:
            classes, definition = extract_prefixed_classes(definition)
        if not classes:
            records.append(build_record(word, None, definition))
            continue

        for class_name in classes:
            records.append(build_record(word, class_name, definition))

    return records


all_data = []

for filename in sorted(os.listdir(XML_DIR)):
    if not filename.lower().endswith(".xml"):
        continue

    xml_path = os.path.join(XML_DIR, filename)
    try:
        tree = ET.parse(xml_path)
        root = tree.getroot()
        for entry in root.findall("./entry"):
            all_data.extend(entry_to_records(entry))
    except Exception as error:
        print(f"Erro ao processar {filename}: {error}")

with open(OUTPUT_PATH, "w", encoding="utf-8") as output_file:
    json.dump(all_data, output_file, ensure_ascii=False, indent=2)

print(f"Todos os XMLs foram convertidos e salvos em {OUTPUT_PATH}")

if UNKNOWN_GRAMMATICAL_CLASSES:
    print("Classes gramaticais sem mapeamento:")
    for raw_value, count in sorted(UNKNOWN_GRAMMATICAL_CLASSES.items(), key=lambda item: (-item[1], item[0])):
        print(f"  {count:>5}x {raw_value}")
