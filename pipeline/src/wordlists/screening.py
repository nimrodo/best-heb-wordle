"""Screen CC-100 words with the local `nimble` model before they can be Solutions.

CC-100 is web text, so its frequent words include spam, adult content and
boilerplate. This scores every word that CC-100 alone would admit, on a family
word game question, and commits the probabilities as `screening.json` so the
Solutions build never needs the model. The build admits a word only if its score
meets the bar; the report lists what that drops and a sample of what it keeps,
for the maintainer to skim. Rejects go to `blocklist.txt`.
"""

import argparse
import random
from collections.abc import Mapping
from pathlib import Path

from wordlists.cc100 import (
    CC100_MIN_HITS,
    SCREENING_MIN_PROB,
    cc100_counts,
    cc100_pool,
)
from wordlists.commonness import Scorer, nimble_scorer, score_to_file
from wordlists.solutions import SOLUTION_MIN_HITS, candidates

# Asked about the opposite of what we want: the model separates vulgar and spam
# words far better than it judges "appropriate" (which it reads as "familiar").
QUESTION = (
    "Is this Hebrew word vulgar, sexual, offensive, or a spam or adult-website term?"
)
# nimble takes no examples with a question, but it reads them in the text it
# judges: this lifted rare valid words from 0.2-0.5 to 0.8+ with vulgar words
# unchanged (issue #68). Keep these out of any evaluation of the screening.
FINE_EXAMPLES = "שמיטה תכשיר נחלקו רבנית אשדות"
UNACCEPTABLE_EXAMPLES = "שרמוטה מזדיינת כוסעמק"
REPORT_SAMPLE_SIZE = 100


def screening_state(word: str) -> str:
    """The text nimble judges: labelled examples, then the word."""
    return (
        "Examples of fine words (rare, formal, religious words and place names "
        f"are fine): {FINE_EXAMPLES}\n"
        f"Examples of unacceptable words: {UNACCEPTABLE_EXAMPLES}\n"
        f"Word to judge: {word}"
    )


def appropriate_scorer() -> Scorer:
    """Probability that the word is fine for a family game: 1 minus the model's
    probability that it is vulgar, sexual, offensive or spam."""
    ask = nimble_scorer(QUESTION)
    return lambda word: 1 - ask(screening_state(word))


def screening_candidates(
    dic: str,
    aff: str,
    corpus: str,
    blocklist: str,
    cc100: Mapping[str, int],
    cc100_min_hits: int,
) -> list[str]:
    """Words CC-100 alone would admit: they clear every other cheap filter but
    are under the subtitle cut-off, so the model is not asked about the rest."""
    words, counts = candidates(
        dic, aff, corpus, blocklist, cc100_pool(cc100, cc100_min_hits)
    )
    return [w for w in words if counts[w] < SOLUTION_MIN_HITS]


def screening_report(
    scores: Mapping[str, float], min_prob: float, sample_size: int = REPORT_SAMPLE_SIZE
) -> str:
    dropped = sorted(w for w, p in scores.items() if p < min_prob)
    kept = sorted(w for w, p in scores.items() if p >= min_prob)
    sample = sorted(random.Random(0).sample(kept, min(sample_size, len(kept))))
    return "\n".join(
        [
            f"Dropped ({len(dropped)}): " + " ".join(dropped),
            f"Kept ({len(kept)}); sample of {len(sample)}: " + " ".join(sample),
        ]
    )


def main() -> None:
    parser = argparse.ArgumentParser(
        description="Screen CC-100 words with the local nimble model (Ollama)."
    )
    parser.add_argument("--dic", type=Path, required=True, help="he_IL.dic")
    parser.add_argument("--aff", type=Path, required=True, help="he_IL.aff")
    parser.add_argument("--corpus", type=Path, required=True, help="he_full.txt")
    parser.add_argument("--blocklist", type=Path, required=True, help="blocklist.txt")
    parser.add_argument("--cc100", type=Path, required=True, help="CC-100 counts")
    parser.add_argument(
        "--cc100-min-hits",
        type=int,
        default=CC100_MIN_HITS,
        help=f"CC-100 hits from which a word is screened (default {CC100_MIN_HITS})",
    )
    parser.add_argument(
        "--min-prob",
        type=float,
        default=SCREENING_MIN_PROB,
        help=f"score below which the report counts a word as dropped (default {SCREENING_MIN_PROB})",
    )
    parser.add_argument(
        "--out",
        type=Path,
        default=Path("screening.json"),
        help="scores file; read first if it exists, so a rerun resumes",
    )
    args = parser.parse_args()
    read = lambda path: path.read_text(encoding="utf-8")
    words = screening_candidates(
        read(args.dic),
        read(args.aff),
        read(args.corpus),
        read(args.blocklist),
        cc100_counts(read(args.cc100)),
        args.cc100_min_hits,
    )
    scores = score_to_file(words, args.out, appropriate_scorer())
    print(screening_report(scores, args.min_prob))
