"""THROWAWAY PROTOTYPE (issue #40): evaluate signals and rules from collect.py output.

uv run python prototype/analyze.py ROWS_JSON
"""

import itertools
import json
import sys
from pathlib import Path

EVERYDAY = ["אגנוב", "אעניש", "אתקרב"]
RARER = ["אקליט", "אציית", "דחליל"]
rows = json.loads(Path(sys.argv[1]).read_text(encoding="utf-8"))

SIGNALS = ["nimble", "fam_hits", "lemma_q", "verb_q"]


def val(w, s):
    v = rows[w].get(s)
    return -1 if v is None else v


print("== example values ==")
print("word kind hits nimble fam_size fam_hits lemma lemma_q verb_q")
for kind, ws in (("everyday", EVERYDAY), ("rarer", RARER)):
    for w in ws:
        r = rows[w]
        print(
            w,
            kind,
            r["hits"],
            f"{r['nimble']:.3f}",
            r["fam_size"],
            r["fam_hits"],
            r["lemma"],
            r.get("lemma_q"),
            f"{r['verb_q']:.3f}",
        )

print("\n== single signals: min(everyday) vs max(rarer) ==")
for s in SIGNALS:
    lo = min(val(w, s) for w in EVERYDAY)
    hi = max(val(w, s) for w in RARER)
    print(f"{s}: min everyday {lo:.3f}, max rarer {hi:.3f}, separates={lo > hi}")

# Rule search: AND of two thresholds, taken from the example values themselves.
print("\n== AND pairs: thresholds from example values; rules that separate ==")
found = []
for a, b in itertools.combinations(SIGNALS, 2):
    ta = sorted({val(w, a) for w in EVERYDAY + RARER})
    tb = sorted({val(w, b) for w in EVERYDAY + RARER})
    for x, y in itertools.product(ta, tb):
        ok = all(val(w, a) >= x and val(w, b) >= y for w in EVERYDAY) and not any(
            val(w, a) >= x and val(w, b) >= y for w in RARER
        )
        if ok:
            found.append((a, x, b, y))
print(found or "none")
