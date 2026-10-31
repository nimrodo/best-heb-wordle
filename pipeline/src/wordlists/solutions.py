"""Build `solutions.json`: the Solutions, each flagged Hard word or Common word.

Candidates are 5-letter forms in Hspell (the Academy spelling), so spelling
variants that only Guesses accept never appear. A candidate must clear the
frequency cut-off, not be blocklisted, not be a Prefix-attached form, and not
have a common alternative spelling of a different length.
"""

import argparse
import json
from collections.abc import Callable
from dataclasses import dataclass
from pathlib import Path

from wordlists.guesses import (
    VARIANT_MIN_HITS,
    WORD_LENGTH,
    corpus_counts,
    expand_forms,
    normalise,
    variants,
)

COMMON_MIN_HITS = 1000
# Below this a form is too rare to be a Solution at all.
HARD_MIN_HITS = 100

PrefixDetector = Callable[[list[str]], set[str]]


@dataclass(frozen=True)
class Solution:
    word: str
    hard: bool


def _parse_blocklist(blocklist: str) -> set[str]:
    lines = (line.strip() for line in blocklist.splitlines())
    return {normalise(line) for line in lines if line and not line.startswith("#")}


def _has_misleading_variant(form: str, counts: dict[str, int]) -> bool:
    """A common alternative spelling of another length would miscount the tiles."""
    return any(
        len(variant) != WORD_LENGTH and counts.get(variant, 0) >= VARIANT_MIN_HITS
        for variant in variants(form)
    )


def build_solutions(
    dic: str,
    aff: str,
    corpus: str,
    blocklist: str,
    detect_prefix_attached: PrefixDetector,
) -> list[Solution]:
    """Return the Solutions, sorted by word.

    `detect_prefix_attached` gets the surviving candidates and returns the ones
    that are Prefix-attached forms. It is slow in production, so it runs last.
    """
    counts = corpus_counts(corpus)
    blocked = _parse_blocklist(blocklist)
    candidates = sorted(
        form
        for form in expand_forms(dic, aff)
        if len(form) == WORD_LENGTH
        and counts[form] >= HARD_MIN_HITS
        and form not in blocked
        and not _has_misleading_variant(form, counts)
    )
    attached = detect_prefix_attached(candidates)
    return [
        Solution(form, hard=counts[form] < COMMON_MIN_HITS)
        for form in candidates
        if form not in attached
    ]


def solutions_json(solutions: list[Solution]) -> str:
    entries = [{"word": s.word, "hard": s.hard} for s in solutions]
    return json.dumps(entries, ensure_ascii=False, indent=0) + "\n"


def pool_report(solutions: list[Solution]) -> str:
    hard = sum(s.hard for s in solutions)
    return f"Common words: {len(solutions) - hard}\nHard words: {hard}"


def main() -> None:
    parser = argparse.ArgumentParser(
        description="Build solutions.json from Hspell and OpenSubtitles data."
    )
    parser.add_argument("--dic", type=Path, required=True, help="he_IL.dic")
    parser.add_argument("--aff", type=Path, required=True, help="he_IL.aff")
    parser.add_argument("--corpus", type=Path, required=True, help="he_full.txt")
    parser.add_argument("--blocklist", type=Path, required=True, help="blocklist.txt")
    parser.add_argument("--out", type=Path, required=True, help="output solutions.json")
    args = parser.parse_args()
    # Imported here so the tests and `wordlists` need no torch install.
    from wordlists.prefix_detector import detect_prefix_attached

    read = lambda path: path.read_text(encoding="utf-8")
    solutions = build_solutions(
        read(args.dic),
        read(args.aff),
        read(args.corpus),
        read(args.blocklist),
        detect_prefix_attached,
    )
    args.out.write_text(solutions_json(solutions), encoding="utf-8")
    print(pool_report(solutions))
