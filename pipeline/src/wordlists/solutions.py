"""Build `solutions.json`: the Solutions, each flagged Hard word or Common word.

Candidates are 5-letter forms in Hspell (the Academy spelling), so spelling
variants that only Guesses accept never appear. A candidate must clear the
frequency cut-off, not be blocklisted, not be a Prefix-attached form (by the
dictionary's prefix rules, then by the model), and not
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
    normalise,
    split_forms,
    variants,
)

# Default; the CLI can override it (--common-min-hits).
COMMON_MIN_HITS = 500
# Below this a form is too rare to be a Solution at all.
SOLUTION_MIN_HITS = 100

PrefixDetector = Callable[[list[str]], set[str]]


@dataclass(frozen=True)
class Solution:
    word: str
    hard: bool


def _parse_blocklist(blocklist: str) -> set[str]:
    lines = (line.strip() for line in blocklist.splitlines())
    return {normalise(line) for line in lines if line and not line.startswith("#")}


def _has_misleading_variant(form: str, counts: dict[str, int]) -> bool:
    """A common alternative spelling of another length would miscount the tiles.

    "Common" uses the same 100-hit floor that admits a variant as a Guess.
    """
    return any(
        len(variant) != WORD_LENGTH and counts.get(variant, 0) >= VARIANT_MIN_HITS
        for variant in variants(form)
    )


DEFINITE_ARTICLE = "ה"


def _built_by_prefix(form: str, bare: set[str], prefixed: set[str]) -> bool:
    """Prefix-attached by the dictionary's own rules, before any model is asked.

    A form Hspell also lists as a word in its own right (a dual reading) is kept.
    The definite article is stricter: ה plus any known word is out, even where
    Hspell has no rule for it.
    """
    if form[0] == DEFINITE_ARTICLE and form[1:] in bare:
        return True
    return form in prefixed and form not in bare


def build_solutions(
    dic: str,
    aff: str,
    corpus: str,
    blocklist: str,
    detect_prefix_attached: PrefixDetector,
    common_min_hits: int = COMMON_MIN_HITS,
) -> list[Solution]:
    """Return the Solutions, sorted by word.

    `detect_prefix_attached` gets the surviving candidates and returns the ones
    that are Prefix-attached forms. It is slow in production, so it runs last.
    """
    counts = corpus_counts(corpus)
    bare, prefixed = split_forms(dic, aff)
    blocked = _parse_blocklist(blocklist)
    candidates = sorted(
        form
        for form in bare | prefixed
        if len(form) == WORD_LENGTH
        and counts[form] >= SOLUTION_MIN_HITS
        and form not in blocked
        and not _built_by_prefix(form, bare, prefixed)
        and not _has_misleading_variant(form, counts)
    )
    attached = detect_prefix_attached(candidates)
    return [
        Solution(form, hard=counts[form] < common_min_hits)
        for form in candidates
        if form not in attached
    ]


def solutions_json(solutions: list[Solution]) -> str:
    # One entry per line keeps the start-up fetch small and diffs readable.
    entries = (
        json.dumps({"word": s.word, "hard": s.hard}, ensure_ascii=False)
        for s in solutions
    )
    return "[\n" + ",\n".join(entries) + "\n]\n"


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
    parser.add_argument(
        "--common-min-hits",
        type=int,
        default=COMMON_MIN_HITS,
        help=f"hits from which a word is Common, not Hard (default {COMMON_MIN_HITS})",
    )
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
        args.common_min_hits,
    )
    args.out.write_text(solutions_json(solutions), encoding="utf-8")
    print(pool_report(solutions))
