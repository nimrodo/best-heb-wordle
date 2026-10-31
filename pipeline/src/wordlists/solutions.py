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
from wordlists.lemmas import build_index, lemma_of

# Default; the CLI can override it (--common-min-hits).
COMMON_MIN_HITS = 500
# Default; the CLI can override it (--commonness-min-prob).
COMMONNESS_MIN_PROB = 0.90
# A form scored in this band (measured in the issue #40 prototype) is Common if
# the model rates its lemma at LEMMA_MIN_PROB or more. Fixed: not a CLI option.
LEMMA_BAND = (0.70, 0.75)
LEMMA_MIN_PROB = 0.90


def in_lemma_band(probability: float) -> bool:
    return LEMMA_BAND[0] <= probability < LEMMA_BAND[1]


# Below this a form is too rare to be a Solution at all.
SOLUTION_MIN_HITS = 100

DEFAULT_COMMONNESS = Path("commonness.json")
DEFAULT_LEMMA_COMMONNESS = Path("lemma_commonness.json")
DEFAULT_EXTRA_HARD = Path("book_hard.txt")

PrefixDetector = Callable[[list[str]], set[str]]


@dataclass(frozen=True)
class Solution:
    word: str
    hard: bool
    # Common only because the model said so, not because of its hit count.
    promoted: bool = False


def _parse_word_list(text: str) -> set[str]:
    """One word per line; `#` comments and blank lines ignored, final letters normalised."""
    lines = (line.strip() for line in text.splitlines())
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


def is_common(
    hits: int,
    probability: float | None,
    lemma_probability: float | None,
    common_min_hits: int,
    min_prob: float,
) -> bool:
    """Promote only, never demote: the model scores inflected verbs too low.

    The lemma rule rescues inflected forms the model scores just under the bar.
    """
    if hits >= common_min_hits:
        return True
    if probability is None:
        return False
    in_band = LEMMA_BAND[0] <= probability < LEMMA_BAND[1]
    by_lemma = (
        in_band
        and lemma_probability is not None
        and lemma_probability >= LEMMA_MIN_PROB
    )
    return probability >= min_prob or by_lemma


def candidates(
    dic: str, aff: str, corpus: str, blocklist: str
) -> tuple[list[str], dict[str, int]]:
    """Every form that clears all the cheap filters, and the hit counts.

    The slow prefix detector is not applied here; it runs last in `build_solutions`.
    """
    counts = corpus_counts(corpus)
    bare, prefixed = split_forms(dic, aff)
    blocked = _parse_word_list(blocklist)
    return sorted(
        form
        for form in bare | prefixed
        if len(form) == WORD_LENGTH
        and counts[form] >= SOLUTION_MIN_HITS
        and form not in blocked
        and not _built_by_prefix(form, bare, prefixed)
        and not _has_misleading_variant(form, counts)
    ), counts


def build_solutions(
    dic: str,
    aff: str,
    corpus: str,
    blocklist: str,
    detect_prefix_attached: PrefixDetector,
    common_min_hits: int = COMMON_MIN_HITS,
    commonness: dict[str, float] | None = None,
    commonness_min_prob: float = COMMONNESS_MIN_PROB,
    lemma_commonness: dict[str, float] | None = None,
    extra_hard: str = "",
) -> list[Solution]:
    """Return the Solutions, sorted by word.

    `detect_prefix_attached` gets the surviving candidates and returns the ones
    that are Prefix-attached forms. It is slow in production, so it runs last.
    `commonness` maps a word to the model's probability that it is everyday; a
    word missing from it is judged on hits alone. `lemma_commonness` maps an
    inferred lemma to the same probability. `extra_hard` is a hand-checked word
    list (see `book_hard.txt`): each word not already a Solution is added as a
    Hard word, whatever its hit count, and skips the filters above.
    """
    commonness = commonness or {}
    lemma_commonness = lemma_commonness or {}
    index = build_index(dic, aff) if lemma_commonness else {}
    words, counts = candidates(dic, aff, corpus, blocklist)
    attached = detect_prefix_attached(words)
    solutions = []
    for form in words:
        if form in attached:
            continue
        by_hits = counts[form] >= common_min_hits
        lemma = lemma_of(form, index, counts) if index else None
        common = is_common(
            counts[form],
            commonness.get(form),
            lemma_commonness.get(lemma) if lemma else None,
            common_min_hits,
            commonness_min_prob,
        )
        solutions.append(
            Solution(form, hard=not common, promoted=common and not by_hits)
        )
    known = {s.word for s in solutions}
    solutions += [
        Solution(word, hard=True)
        for word in _parse_word_list(extra_hard)
        if word not in known
    ]
    return sorted(solutions, key=lambda s: s.word)


def solutions_json(solutions: list[Solution]) -> str:
    # One entry per line keeps the start-up fetch small and diffs readable.
    entries = (
        json.dumps({"word": s.word, "hard": s.hard}, ensure_ascii=False)
        for s in solutions
    )
    return "[\n" + ",\n".join(entries) + "\n]\n"


def pool_report(solutions: list[Solution]) -> str:
    hard = sum(s.hard for s in solutions)
    lines = [f"Common words: {len(solutions) - hard}", f"Hard words: {hard}"]
    promoted = [s.word for s in solutions if s.promoted]
    if promoted:
        lines.append(f"Promoted by the model ({len(promoted)}): " + " ".join(promoted))
    return "\n".join(lines)


def optional_scores(
    parser: argparse.ArgumentParser, given: Path | None, default: Path
) -> dict[str, float] | None:
    """A scores file: used if present, an error if named explicitly but missing."""
    path = given or default
    if path.exists():
        return json.loads(path.read_text(encoding="utf-8"))
    if given:
        parser.error(f"{path} does not exist")
    return None


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
    parser.add_argument(
        "--commonness",
        type=Path,
        default=None,
        help="commonness.json from wordlists-commonness; "
        f"optional if absent (default {DEFAULT_COMMONNESS})",
    )
    parser.add_argument(
        "--commonness-min-prob",
        type=float,
        default=COMMONNESS_MIN_PROB,
        help="model probability from which a Hard word is promoted to Common "
        f"(default {COMMONNESS_MIN_PROB})",
    )
    parser.add_argument(
        "--lemma-commonness",
        type=Path,
        default=None,
        help="lemma_commonness.json from wordlists-commonness; "
        f"optional if absent (default {DEFAULT_LEMMA_COMMONNESS})",
    )
    parser.add_argument(
        "--extra-hard",
        type=Path,
        default=DEFAULT_EXTRA_HARD,
        help=f"hand-checked Hard words added as they are (default {DEFAULT_EXTRA_HARD})",
    )
    parser.add_argument("--out", type=Path, required=True, help="output solutions.json")
    args = parser.parse_args()
    read = lambda path: path.read_text(encoding="utf-8")
    commonness = optional_scores(parser, args.commonness, DEFAULT_COMMONNESS)
    lemma_commonness = optional_scores(
        parser, args.lemma_commonness, DEFAULT_LEMMA_COMMONNESS
    )
    # Imported here so the tests and `wordlists` need no torch install.
    from wordlists.prefix_detector import detect_prefix_attached

    solutions = build_solutions(
        read(args.dic),
        read(args.aff),
        read(args.corpus),
        read(args.blocklist),
        detect_prefix_attached,
        args.common_min_hits,
        commonness,
        args.commonness_min_prob,
        lemma_commonness,
        read(args.extra_hard) if args.extra_hard.exists() else "",
    )
    args.out.write_text(solutions_json(solutions), encoding="utf-8")
    print(pool_report(solutions))
