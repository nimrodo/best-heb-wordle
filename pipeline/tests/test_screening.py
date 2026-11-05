"""Tests for the screening scorer, driven by a fake scorer (no Ollama needed)."""

from wordlists.screening import (
    screening_candidates,
    screening_report,
    screening_state,
)

AFF = "NEEDAFFIX j\n"


def test_only_words_admitted_by_cc100_alone_are_screened() -> None:
    dic = "3\nאבגדה\nתפוזי\nשלומי\n"
    corpus = "תפוזי 5000"  # already a Solution by subtitle hits
    cc100 = {"אבגדה": 9000, "תפוזי": 9000, "שלומי": 10}
    assert screening_candidates(dic, AFF, corpus, "", cc100, 5000) == ["אבגדה"]


def test_blocklisted_words_are_not_screened() -> None:
    dic = "1\nאבגדה\n"
    assert screening_candidates(dic, AFF, "", "אבגדה", {"אבגדה": 9000}, 5000) == []


def test_report_lists_dropped_words_and_a_sample_of_kept_ones() -> None:
    scores = {"אבגדה": 0.9, "תפוזי": 0.2, "שלומי": 0.8}
    report = screening_report(scores, 0.5, sample_size=1)
    assert "Dropped (1): תפוזי" in report
    assert "Kept (2)" in report
    assert report.count("אבגדה") + report.count("שלומי") == 1


def test_state_holds_the_word_after_labelled_examples() -> None:
    state = screening_state("נהריה")
    assert state.endswith("Word to judge: נהריה")
    assert "fine" in state and "unacceptable" in state
