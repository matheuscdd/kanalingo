"""
parse_ownpt.py
Converts OWN-PT WordNet-LMF XML to a structured JSON file.

Output: output.json — array of entries, one per LexicalEntry.

Each entry:
{
  "id": "own-pt-word-casa-n",
  "word": "casa",
  "pos_code": "n",
  "partOfSpeech": "substantivo",
  "senses": [
    {
      "synset_id": "own-pt-synset-XXXXX-n",
      "ili": "i12345",
      "definitions": ["..."],
      "examples": ["..."],
      "relations": [
        {"type": "hypernym", "target": "own-pt-synset-YYYYY-n"}
      ]
    }
  ]
}
"""

import json
import sys
import xml.etree.ElementTree as ET
from pathlib import Path

POS_LABELS = {
    "n": "noun",
    "v": "verb",
    "a": "adjective",
    "r": "adverb",
    "s": "adjective satellite",
}

XML_FILE = Path(__file__).with_name("own-pt-2026.04.07.xml")
OUTPUT_FILE = Path(__file__).with_name("output.json")


def build_synset_map(root) -> dict:
    """Index all Synset elements by id."""
    synset_map = {}
    for synset in root.iter("Synset"):
        sid = synset.get("id")
        definitions = [d.text for d in synset.findall("Definition") if d.text]
        examples = [e.text for e in synset.findall("Example") if e.text]
        relations = [
            {"type": rel.get("relType"), "target": rel.get("target")}
            for rel in synset.findall("SynsetRelation")
        ]
        synset_map[sid] = {
            "ili": synset.get("ili"),
            "definitions": definitions,
            "examples": examples,
            "relations": relations,
        }
    return synset_map


def build_entries(root, synset_map: dict) -> list:
    """Build one entry per LexicalEntry, resolving senses via synset_map."""
    entries = []
    for entry in root.iter("LexicalEntry"):
        lemma = entry.find("Lemma")
        if lemma is None:
            continue

        word = lemma.get("writtenForm", "")
        pos_code = lemma.get("partOfSpeech", "")

        senses = []
        for sense in entry.findall("Sense"):
            synset_id = sense.get("synset", "")
            synset_data = synset_map.get(synset_id, {})
            senses.append(
                {
                    "sense_id": sense.get("id", ""),
                    "synset_id": synset_id,
                    "ili": synset_data.get("ili"),
                    "definitions": synset_data.get("definitions", []),
                    "examples": synset_data.get("examples", []),
                    "relations": synset_data.get("relations", []),
                }
            )

        entries.append(
            {
                "id": entry.get("id", ""),
                "word": word,
                "pos_code": pos_code,
                "partOfSpeech": POS_LABELS.get(pos_code, pos_code),
                "senses": senses,
            }
        )
    return entries


def main():
    print(f"Parsing {XML_FILE} ...", flush=True)
    tree = ET.parse(XML_FILE)
    root = tree.getroot()

    # The Lexicon element may be a direct child or nested — find it
    lexicon = root.find("Lexicon")
    if lexicon is None:
        lexicon = root  # fall back to root if structure differs

    print("Building synset index ...", flush=True)
    synset_map = build_synset_map(lexicon)
    print(f"  {len(synset_map):,} synsets indexed.", flush=True)

    print("Building word entries ...", flush=True)
    entries = build_entries(lexicon, synset_map)
    print(f"  {len(entries):,} entries built.", flush=True)

    print(f"Writing {OUTPUT_FILE} ...", flush=True)
    with OUTPUT_FILE.open("w", encoding="utf-8") as fh:
        json.dump(entries, fh, ensure_ascii=False, indent=2)
    print(f"Done. Output saved to: {OUTPUT_FILE}", flush=True)


if __name__ == "__main__":
    sys.exit(main())
