"""THROWAWAY PROTOTYPE (issue #40): collect every signal into a scratch JSON.

uv run python prototype/collect.py IN_DIR OUT_JSON

Needs Ollama with `nimble` for the lemma and verb questions. Writes only to
OUT_JSON (scratch); never touches commonness.json. Resumable: nimble answers
already in OUT_JSON are reused.
"""

import json
import sys
import urllib.request
from pathlib import Path

from wordlists.commonness import ENDPOINT, MODEL, QUESTION, restore_final_letters
from wordlists.lemmas import build_index, family
from wordlists.solutions import candidates

EXAMPLES = ["אגנוב", "אעניש", "אתקרב", "אקליט", "אציית", "דחליל"]
BAND = (0.70, 0.75)
VERB_QUESTION = (
    "Is this word a form of an everyday Hebrew verb "
    "that any ordinary adult Israeli knows?"
)


def ask(word: str, question: str) -> float:
    body = json.dumps(
        {
            "model": MODEL,
            "state": restore_final_letters(word),
            "questions": {"q": {"type": "noul", "instructions": question}},
        }
    ).encode()
    req = urllib.request.Request(ENDPOINT, body, {"Content-Type": "application/json"})
    with urllib.request.urlopen(req, timeout=60) as r:
        return json.load(r)["answers"]["q"]["noul"]


def pick_lemma(word, key, forms, counts):
    """The bare root if Hspell lists it (past 3sg, e.g. גנב); else the top non-מ form."""
    if key in forms and counts[key] > 0:
        return key
    pool = [f for f in forms if f != word and not f.startswith("מ")]
    return max(pool, key=lambda f: counts[f], default=None)


def main() -> None:
    d, out = Path(sys.argv[1]), Path(sys.argv[2])
    read = lambda p: p.read_text(encoding="utf-8")
    dic, aff, corpus = (
        read(d / "he_IL.dic"),
        read(d / "he_IL.aff"),
        read(d / "he_full.txt"),
    )
    blocklist = read(Path("blocklist.txt"))
    words, counts = candidates(dic, aff, corpus, blocklist)
    commonness = json.loads(read(Path("commonness.json")))
    index = build_index(dic, aff)
    rows = json.loads(read(out)) if out.exists() else {}
    for w in words:
        if counts[w] >= 500:
            continue
        forms, key = family(w, index)
        row = rows.setdefault(w, {})
        row.update(
            hits=counts[w],
            nimble=commonness.get(w),
            key=key,
            fam_size=len(forms),
            fam_hits=sum(counts[f] for f in forms),
            lemma=pick_lemma(w, key, forms, counts) if key else None,
        )
    todo = [
        w
        for w, r in rows.items()
        if w in EXAMPLES
        or (r["nimble"] is not None and BAND[0] <= r["nimble"] < BAND[1])
    ]
    cache: dict[str, float] = {}
    for n, w in enumerate(todo, 1):
        r = rows[w]
        if "verb_q" not in r:
            r["verb_q"] = ask(w, VERB_QUESTION)
        if r["lemma"] and "lemma_q" not in r:
            lem = r["lemma"]
            if lem not in cache:
                cache[lem] = ask(lem, QUESTION)
            r["lemma_q"] = cache[lem]
        if n % 25 == 0:
            out.write_text(json.dumps(rows, ensure_ascii=False), encoding="utf-8")
            print(f"{n}/{len(todo)}", flush=True)
    out.write_text(json.dumps(rows, ensure_ascii=False), encoding="utf-8")
    for w in EXAMPLES:
        print(w, rows.get(w))


main()
