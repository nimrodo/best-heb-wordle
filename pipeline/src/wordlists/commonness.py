"""Ask the local `nimble` decision model which Hard words are everyday words.

Run by hand; the probabilities are committed as `commonness.json` so the
Solutions build never depends on the model. The model only ever promotes a Hard
word to Common (see `solutions.is_common`).
"""

import argparse
import json
import urllib.request
from collections.abc import Callable, Mapping
from pathlib import Path

from wordlists.guesses import BASE_TO_FINAL, corpus_counts
from wordlists.lemmas import build_index, lemma_of
from wordlists.solutions import (
    COMMON_MIN_HITS,
    DEFAULT_LEMMA_COMMONNESS,
    LEMMA_BAND,
    candidates,
)

MODEL = "nimble"
ENDPOINT = "http://localhost:11434/v1/systemone"
QUESTION = "Is this an everyday Hebrew word that any ordinary adult Israeli knows?"
SAVE_EVERY = 25
# Seconds; a hung Ollama should stop the run, which a rerun then resumes.
REQUEST_TIMEOUT = 60

# Takes the word (final letters restored), returns the probability of "yes".
Scorer = Callable[[str], float]


def restore_final_letters(word: str) -> str:
    return word[:-1] + word[-1].translate(BASE_TO_FINAL)


def candidate_hard_words(
    dic: str, aff: str, corpus: str, blocklist: str, common_min_hits: int
) -> list[str]:
    """Candidates that would be Hard by hits alone. The prefix detector is skipped:
    scoring a word that later proves Prefix-attached is harmless."""
    words, counts = candidates(dic, aff, corpus, blocklist)
    return [w for w in words if counts[w] < common_min_hits]


def score_words(
    words: list[str],
    existing: dict[str, float],
    scorer: Scorer,
    on_progress: Callable[[dict[str, float]], None] = lambda scores: None,
) -> dict[str, float]:
    """Score `words`, reusing `existing`. Words no longer in `words` are dropped."""
    scores = {w: existing[w] for w in words if w in existing}
    for word in words:
        if word not in scores:
            scores[word] = scorer(restore_final_letters(word))
            on_progress(scores)
    return scores


def band_lemmas(
    scores: dict[str, float], dic: str, aff: str, counts: Mapping[str, int]
) -> list[str]:
    """The distinct inferred lemmas of words scored inside the lemma rule's band."""
    index = build_index(dic, aff)
    lemmas = {
        lemma_of(word, index, counts)
        for word, score in scores.items()
        if LEMMA_BAND[0] <= score < LEMMA_BAND[1]
    }
    return sorted(lemmas - {None})


def commonness_json(scores: dict[str, float]) -> str:
    return json.dumps(scores, ensure_ascii=False, sort_keys=True, separators=(",", ":"))


def ask_nimble(word: str) -> float:
    """Probability of "yes" from a Noul question, via Ollama's System One endpoint."""
    body = json.dumps(
        {
            "model": MODEL,
            "state": word,
            "questions": {"everyday": {"type": "noul", "instructions": QUESTION}},
        }
    ).encode()
    request = urllib.request.Request(
        ENDPOINT, body, {"Content-Type": "application/json"}
    )
    with urllib.request.urlopen(request, timeout=REQUEST_TIMEOUT) as response:
        return json.load(response)["answers"]["everyday"]["noul"]


def main() -> None:
    parser = argparse.ArgumentParser(
        description="Score Hard words with the local nimble model (Ollama)."
    )
    parser.add_argument("--dic", type=Path, required=True, help="he_IL.dic")
    parser.add_argument("--aff", type=Path, required=True, help="he_IL.aff")
    parser.add_argument("--corpus", type=Path, required=True, help="he_full.txt")
    parser.add_argument("--blocklist", type=Path, required=True, help="blocklist.txt")
    parser.add_argument(
        "--common-min-hits",
        type=int,
        default=COMMON_MIN_HITS,
        help=f"hits from which a word is Common, so not scored (default {COMMON_MIN_HITS})",
    )
    parser.add_argument(
        "--out",
        type=Path,
        default=Path("commonness.json"),
        help="scores file; read first if it exists, so a rerun resumes",
    )
    parser.add_argument(
        "--lemma-out",
        type=Path,
        default=DEFAULT_LEMMA_COMMONNESS,
        help="lemma scores file (same resuming behaviour as --out)",
    )
    args = parser.parse_args()
    read = lambda path: path.read_text(encoding="utf-8")
    words = candidate_hard_words(
        read(args.dic),
        read(args.aff),
        read(args.corpus),
        read(args.blocklist),
        args.common_min_hits,
    )
    existing = json.loads(read(args.out)) if args.out.exists() else {}

    def saver(path: Path) -> Callable[[dict[str, float]], None]:
        return lambda scores: path.write_text(
            commonness_json(scores) + "\n", encoding="utf-8"
        )

    def progress(save: Callable, total: int) -> Callable:
        def report(scores: dict[str, float]) -> None:
            if len(scores) % SAVE_EVERY == 0:
                save(scores)
                print(f"{len(scores)}/{total}", flush=True)

        return report

    save_words = saver(args.out)
    scores = score_words(words, existing, ask_nimble, progress(save_words, len(words)))
    save_words(scores)

    # The lemma rule needs the lemmas of band words scored too.
    lemmas = band_lemmas(
        scores, read(args.dic), read(args.aff), corpus_counts(read(args.corpus))
    )
    existing_lemmas = (
        json.loads(read(args.lemma_out)) if args.lemma_out.exists() else {}
    )
    save_lemmas = saver(args.lemma_out)
    save_lemmas(
        score_words(
            lemmas, existing_lemmas, ask_nimble, progress(save_lemmas, len(lemmas))
        )
    )
