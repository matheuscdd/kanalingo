"""
enrich_ownpt.py
Enriches output.json with English definitions from Open English WordNet (OEWN)
via the ILI (Inter-Lingual Index), for senses that have no Portuguese definition.

Adds to each sense:
  - "definitions_en": list[str]  — English definitions from OEWN
  - "lemmas_en":      list[str]  — English lemmas from OEWN (synonyms in English)

Senses that already have Portuguese definitions are not modified.

Requires:
    pip install wn
    python -c "import wn; wn.download('oewn:2024')"  (run once)

Usage:
    python enrich_ownpt.py
"""

import json
import sys
from pathlib import Path

import wn

INPUT_FILE = Path(__file__).with_name("output.json")
OUTPUT_FILE = Path(__file__).with_name("output_enriched.json")


def load_ili_index() -> dict:
    """Build a dict ILI → {definitions_en, lemmas_en} from OEWN, queried lazily."""
    # We don't pre-load everything; we'll cache on demand.
    return {}


def lookup_ili(cache: dict, ili: str) -> dict:
    if ili in cache:
        return cache[ili]

    synsets = wn.synsets(ili=ili)
    if not synsets:
        result = {"definitions_en": [], "lemmas_en": []}
    else:
        s = synsets[0]
        result = {
            "definitions_en": [d for d in [s.definition()] if d],
            "lemmas_en": s.lemmas(),
        }
    cache[ili] = result
    return result


def main():
    print(f"Loading {INPUT_FILE} ...", flush=True)
    with INPUT_FILE.open(encoding="utf-8") as fh:
        data = json.load(fh)

    cache: dict = {}
    enriched_senses = 0
    total_senses = 0

    for entry in data:
        for sense in entry["senses"]:
            total_senses += 1
            ili = sense.get("ili")
            has_pt_def = bool(sense.get("definitions"))

            if ili:
                en_data = lookup_ili(cache, ili)
                sense["definitions_en"] = en_data["definitions_en"]
                sense["lemmas_en"] = en_data["lemmas_en"]
                if not has_pt_def and en_data["definitions_en"]:
                    enriched_senses += 1
            else:
                sense["definitions_en"] = []
                sense["lemmas_en"] = []

    print(f"  ILIs resolved: {len(cache):,}", flush=True)
    print(f"  Senses enriched (EN def added where PT was missing): {enriched_senses:,}", flush=True)
    print(f"  Total senses: {total_senses:,}", flush=True)

    print(f"Writing {OUTPUT_FILE} ...", flush=True)
    with OUTPUT_FILE.open("w", encoding="utf-8") as fh:
        json.dump(data, fh, ensure_ascii=False, indent=2)
    print(f"Done. Output saved to: {OUTPUT_FILE}", flush=True)


if __name__ == "__main__":
    sys.exit(main())
