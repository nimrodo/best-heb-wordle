"""Tests for the commonness scorer, driven by a fake scorer (no Ollama needed)."""

import json
from collections import Counter

from wordlists.commonness import (
    band_lemmas,
    candidate_hard_words,
    commonness_json,
    restore_final_letters,
    score_words,
)

AFF = "NEEDAFFIX j\n"


def test_final_letters_are_restored_at_word_end_only() -> None:
    assert restore_final_letters("מכנסימ") == "מכנסים"
    assert restore_final_letters("כנפ") == "כנף"
    assert restore_final_letters("אבהות") == "אבהות"
    assert restore_final_letters("מנמנ") == "מנמן"


def test_only_hard_candidates_are_scored() -> None:
    dic = "3\nאבגדה\nתפוזי\nשלומי\n"
    corpus = "אבגדה 360\nתפוזי 5000\nשלומי 50"
    assert candidate_hard_words(dic, AFF, corpus, "", 500) == ["אבגדה"]


def test_words_already_scored_are_not_asked_again() -> None:
    asked: list[str] = []

    def scorer(question: str) -> float:
        asked.append(question)
        return 0.5

    scores = score_words(["אבגדה", "תפוזי"], {"אבגדה": 0.9}, scorer)
    assert asked == ["תפוזי"]
    assert scores == {"אבגדה": 0.9, "תפוזי": 0.5}


def test_scorer_gets_the_word_with_final_letters_restored() -> None:
    asked: list[str] = []
    score_words(["ילדימ"], {}, lambda w: asked.append(w) or 0.5)
    assert asked == ["ילדים"]


def test_words_no_longer_hard_are_dropped_from_the_scores() -> None:
    assert score_words(["אבגדה"], {"תפוזי": 0.9}, lambda w: 0.1) == {"אבגדה": 0.1}


def test_progress_callback_sees_each_new_score() -> None:
    sizes: list[int] = []
    score_words(
        ["אבגדה", "תפוזי"],
        {},
        lambda w: 0.5,
        on_progress=lambda scores: sizes.append(len(scores)),
    )
    assert sizes == [1, 2]


def test_output_is_sorted_compact_json() -> None:
    text = commonness_json({"תפוזי": 0.5, "אבגדה": 0.25})
    assert list(json.loads(text)) == ["אבגדה", "תפוזי"]
    assert ": " not in text


# Lemma scoring: only the lemmas of Hard words scored in the 0.70-0.75 band.


def test_only_lemmas_of_band_words_are_scored_once_each() -> None:
    dic = "4\nגנב\nאגנוב\nיגנבו\nאבגדה\n"
    scores = {"אגנוב": 0.73, "יגנבו": 0.72, "אבגדה": 0.74, "גנב": 0.5}
    counts = Counter({"גנב": 100})
    assert band_lemmas(scores, dic, AFF, counts) == ["גנב"]
