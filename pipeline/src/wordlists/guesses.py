"""Build `guesses.txt`: every valid 5-letter Guess.

Inputs are the Hunspell dictionary generated from Hspell 1.4 (`he_IL.dic` and
`he_IL.aff`) and OpenSubtitles frequency counts (`word count` per line).
Output is one normalised word per line, sorted.
"""

import argparse
import re
from collections import Counter, defaultdict
from pathlib import Path

WORD_LENGTH = 5
# Variants are one letter longer or shorter than the Hspell form they come from.
SOURCE_LENGTHS = range(WORD_LENGTH - 1, WORD_LENGTH + 2)
# A spelling variant needs this many OpenSubtitles hits to be accepted.
VARIANT_MIN_HITS = 100
# The letters that ktiv male adds and ktiv haser drops (vav and yod).
MATER_LECTIONIS = "וי"

FINAL_TO_BASE = str.maketrans("ךםןףץ", "כמנפצ")
HEBREW_WORD = re.compile(r"[א-ת]+")


def normalise(word: str) -> str:
    return word.translate(FINAL_TO_BASE)


def _parse_prefix_rules(
    aff: str,
) -> tuple[str | None, dict[str, list[tuple[str, re.Pattern[str]]]]]:
    """Return the NEEDAFFIX flag and, per prefix flag, (prefix, stem condition) rules."""
    need_affix = None
    rules: dict[str, list[tuple[str, re.Pattern[str]]]] = defaultdict(list)
    for line in aff.splitlines():
        parts = line.split()
        if len(parts) == 2 and parts[0] == "NEEDAFFIX":
            need_affix = parts[1]
        elif len(parts) == 5 and parts[0] == "PFX":
            _, flag, _strip, prefix, condition = parts
            # Hspell's rules never strip letters from the stem.
            rules[flag].append((prefix, re.compile(condition)))
    return need_affix, rules


def _expand_forms(dic: str, aff: str) -> set[str]:
    """All Hspell forms of length 4-6 (the lengths a 5-letter Guess can come from)."""
    need_affix, rules = _parse_prefix_rules(aff)
    forms: set[str] = set()
    for line in dic.splitlines()[1:]:  # first line is the entry count
        stem, _, flags = line.partition("/")
        if not HEBREW_WORD.fullmatch(stem):
            continue
        stem = normalise(stem)
        if need_affix not in flags and len(stem) in SOURCE_LENGTHS:
            forms.add(stem)
        for flag in flags:
            for prefix, condition in rules.get(flag, ()):
                if (
                    len(prefix) + len(stem) in SOURCE_LENGTHS
                    and HEBREW_WORD.fullmatch(prefix)
                    and condition.match(stem)
                ):
                    forms.add(prefix + stem)
    return forms


def _corpus_counts(corpus: str) -> Counter[str]:
    counts: Counter[str] = Counter()
    for line in corpus.splitlines():
        parts = line.split()
        if len(parts) == 2 and HEBREW_WORD.fullmatch(parts[0]) and parts[1].isdigit():
            counts[normalise(parts[0])] += int(parts[1])
    return counts


def _variants(form: str) -> set[str]:
    """Forms one non-initial vav or yod away from `form`."""
    # Interior only: ktiv male adds or drops these letters inside a word.
    inserted = {
        form[:i] + c + form[i:] for i in range(1, len(form)) for c in MATER_LECTIONIS
    }
    removed = {
        form[:i] + form[i + 1 :]
        for i in range(1, len(form) - 1)
        if form[i] in MATER_LECTIONIS
    }
    return inserted | removed


def build_guesses(dic: str, aff: str, corpus: str) -> str:
    """Return the contents of `guesses.txt`."""
    forms = _expand_forms(dic, aff)
    guesses = {form for form in forms if len(form) == WORD_LENGTH}
    counts = _corpus_counts(corpus)
    for form in forms:
        for variant in _variants(form):
            if len(variant) == WORD_LENGTH and counts[variant] >= VARIANT_MIN_HITS:
                guesses.add(variant)
    return "".join(f"{word}\n" for word in sorted(guesses))


def main() -> None:
    parser = argparse.ArgumentParser(
        description="Build guesses.txt from Hspell and OpenSubtitles data."
    )
    parser.add_argument(
        "--dic", type=Path, required=True, help="he_IL.dic (Hspell 1.4)"
    )
    parser.add_argument(
        "--aff", type=Path, required=True, help="he_IL.aff (Hspell 1.4)"
    )
    parser.add_argument(
        "--corpus", type=Path, required=True, help="he_full.txt (OpenSubtitles counts)"
    )
    parser.add_argument("--out", type=Path, required=True, help="output guesses.txt")
    args = parser.parse_args()
    read = lambda path: path.read_text(encoding="utf-8")
    args.out.write_text(
        build_guesses(read(args.dic), read(args.aff), read(args.corpus)),
        encoding="utf-8",
    )
