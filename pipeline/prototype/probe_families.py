"""THROWAWAY PROTOTYPE (issue #40): family hits for the six examples.

uv run python prototype/probe_families.py IN_DIR
"""

import sys
from pathlib import Path

from families import build_index, family

from wordlists.guesses import corpus_counts

EVERYDAY = ["אגנוב", "אעניש", "אתקרב"]
RARER = ["אקליט", "אציית", "דחליל"]

d = Path(sys.argv[1])
dic, aff, corpus = (
    (d / n).read_text(encoding="utf-8")
    for n in ("he_IL.dic", "he_IL.aff", "he_full.txt")
)
counts = corpus_counts(corpus)
index = build_index(dic, aff)
for w in EVERYDAY + RARER:
    forms, key = family(w, index)
    top = sorted(forms, key=lambda f: -counts[f])[:8]
    print(
        w,
        "own",
        counts[w],
        "key",
        key,
        "size",
        len(forms),
        "fam_hits",
        sum(counts[f] for f in forms),
    )
    print("   ", [(f, counts[f]) for f in top])
