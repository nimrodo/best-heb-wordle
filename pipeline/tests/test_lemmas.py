"""Tests for the inferred lemma of a Hard word (Hspell has no lemma data)."""

from collections import Counter

from wordlists.lemmas import build_index, lemma_of

AFF = "NEEDAFFIX j\n"


def index_of(forms: list[str]) -> dict[str, set[str]]:
    return build_index(f"{len(forms)}\n" + "\n".join(forms) + "\n", AFF)


def test_lemma_is_the_bare_root_when_hspell_lists_it() -> None:
    index = index_of(["גנב", "אגנוב", "יגנבו"])
    assert lemma_of("אגנוב", index, Counter({"גנב": 100})) == "גנב"


def test_lemma_falls_back_to_the_most_frequent_other_form() -> None:
    index = index_of(["אגנוב", "יגנבו", "תגנבי"])
    counts = Counter({"אגנוב": 5, "יגנבו": 50, "תגנבי": 10})
    assert lemma_of("אגנוב", index, counts) == "יגנבו"


def test_noun_forms_starting_with_mem_are_not_the_fallback_lemma() -> None:
    index = index_of(["אגנוב", "מגנבה", "תגנבי"])
    counts = Counter({"אגנוב": 5, "מגנבה": 500, "תגנבי": 10})
    assert lemma_of("אגנוב", index, counts) == "תגנבי"


def test_a_word_without_a_three_consonant_skeleton_has_no_lemma() -> None:
    assert lemma_of("דחליל", index_of(["דחליל"]), Counter()) is None
