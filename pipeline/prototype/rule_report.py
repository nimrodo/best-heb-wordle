"""THROWAWAY PROTOTYPE (issue #40): promoted-word counts and lists for candidate rules.

uv run python prototype/rule_report.py ROWS_JSON
"""

import json
import sys
from pathlib import Path

rows = json.loads(Path(sys.argv[1]).read_text(encoding="utf-8"))
scored = {w: r for w, r in rows.items() if "verb_q" in r}
print(
    "band words scored:",
    len(scored),
    "with lemma:",
    sum(1 for r in scored.values() if r["lemma"]),
)

rules = {
    "lemma_q>=0.90": lambda r: r.get("lemma_q", 0) >= 0.90,
    "lemma_q>=0.85": lambda r: r.get("lemma_q", 0) >= 0.85,
    "lemma_q>=0.80": lambda r: r.get("lemma_q", 0) >= 0.80,
    "lemma_q>=0.90 & fam_hits>=5000": lambda r: (
        r.get("lemma_q", 0) >= 0.90 and r["fam_hits"] >= 5000
    ),
    "lemma_q>=0.90 & verb_q>=0.60": lambda r: (
        r.get("lemma_q", 0) >= 0.90 and r["verb_q"] >= 0.60
    ),
    "fam_hits>=5000": lambda r: r["fam_hits"] >= 5000,
    "fam_hits>=20000": lambda r: r["fam_hits"] >= 20000,
    "verb_q>=0.70": lambda r: r["verb_q"] >= 0.70,
}
for name, rule in rules.items():
    got = [w for w, r in scored.items() if rule(r)]
    print(f"{name}: {len(got)} of {len(scored)}")

chosen = rules["lemma_q>=0.90"]
print("\nPROMOTED by lemma_q>=0.90 (word hits nimble lemma lemma_q fam_hits):")
sub = sorted(
    ((w, r) for w, r in scored.items() if chosen(r)), key=lambda t: t[1]["nimble"]
)
for lo in (0.70, 0.725):
    hi = lo + 0.025
    print(f"\nband {lo:.3f}-{hi:.3f}")
    for w, r in sub:
        if lo <= r["nimble"] < hi:
            print(
                f"{w} h={r['hits']} n={r['nimble']:.3f} lem={r['lemma']} lq={r['lemma_q']:.2f} fam={r['fam_hits']}"
            )
