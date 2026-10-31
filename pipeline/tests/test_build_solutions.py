"""Tests drive `build_solutions` with small Hspell/corpus fixtures.

The Prefix-attached detector (DictaBERT in production) is replaced by a stub
that flags the words it is told to.
"""

import json
from collections.abc import Iterable

from wordlists import Solution, build_solutions
from wordlists.solutions import solutions_json

AFF = """\
NEEDAFFIX j
PFX a N 1
PFX a 0 ל .
"""


def build(
    dic_words: list[str],
    corpus: list[str],
    *,
    blocklist: str = "",
    prefix_attached: Iterable[str] = (),
    common_min_hits: int | None = None,
) -> list[Solution]:
    dic = f"{len(dic_words)}\n" + "\n".join(dic_words) + "\n"
    flagged = set(prefix_attached)
    return build_solutions(
        dic,
        AFF,
        "\n".join(corpus),
        blocklist,
        lambda words: flagged & set(words),
        **({} if common_min_hits is None else {"common_min_hits": common_min_hits}),
    )


def words(solutions: list[Solution]) -> list[str]:
    return [s.word for s in solutions]


# Frequency cut-offs: Common 500+, Hard word 100-499, under 100 excluded.


def test_cutoff_below_100_is_excluded() -> None:
    assert build(["אבגדה"], ["אבגדה 99"]) == []


def test_cutoff_100_is_a_hard_word() -> None:
    assert build(["אבגדה"], ["אבגדה 100"]) == [Solution("אבגדה", hard=True)]


def test_cutoff_499_is_a_hard_word() -> None:
    assert build(["אבגדה"], ["אבגדה 499"]) == [Solution("אבגדה", hard=True)]


def test_cutoff_500_is_a_common_word() -> None:
    assert build(["אבגדה"], ["אבגדה 500"]) == [Solution("אבגדה", hard=False)]


def test_common_cutoff_is_configurable() -> None:
    corpus = ["אבגדה 360"]
    assert build(["אבגדה"], corpus) == [Solution("אבגדה", hard=True)]
    assert build(["אבגדה"], corpus, common_min_hits=360) == [
        Solution("אבגדה", hard=False)
    ]


def test_counts_sum_across_final_letter_forms() -> None:
    assert build(["ילדים"], ["ילדים 300", "ילדימ 200"]) == [
        Solution("ילדימ", hard=False)
    ]


def test_word_missing_from_corpus_is_excluded() -> None:
    assert build(["אבגדה"], []) == []


def test_output_is_sorted() -> None:
    corpus = ["תפוזי 500", "אבגדה 500"]
    assert words(build(["תפוזי", "אבגדה"], corpus)) == ["אבגדה", "תפוזי"]


def test_inflected_forms_are_judged_on_their_own_count() -> None:
    corpus = ["ספרים 2000", "ספרות 50"]
    assert words(build(["ספרים", "ספרות"], corpus)) == ["ספרימ"]


# Only Hspell's own (Academy-spelled) forms are Solutions, never a corpus
# variant that Guesses accept.


def test_corpus_attested_variant_is_not_a_solution() -> None:
    # שנייה (5 letters) is only a variant of Hspell's 4-letter שניה.
    assert build(["שניה"], ["שניה 5000", "שנייה 5000"]) == []


# Solutions whose common alternative spelling has a different length are
# excluded (they stay valid Guesses; that is the Guess list's job).


def test_solution_with_common_longer_variant_is_excluded() -> None:
    assert build(["שיחזר"], ["שיחזר 5000", "שיחזור 100"]) == []


def test_solution_with_rare_longer_variant_is_kept() -> None:
    assert words(build(["שיחזר"], ["שיחזר 5000", "שיחזור 99"])) == ["שיחזר"]


def test_solution_with_common_shorter_variant_is_excluded() -> None:
    assert build(["טיפשי"], ["טיפשי 5000", "טפשי 100"]) == []


def test_same_length_variant_does_not_exclude() -> None:
    # A substitution is not a ktiv male/haser variant, and keeps the length anyway.
    assert words(build(["אבוגד"], ["אבוגד 500", "אביגד 500"])) == ["אבוגד"]


# Prefix-attached forms (stubbed detector) never become Solutions.


def test_prefix_attached_form_is_excluded() -> None:
    assert build(["ביתי/a"], ["לביתי 5000"], prefix_attached=["לביתי"]) == []


def test_form_built_by_a_dictionary_prefix_rule_is_excluded() -> None:
    # The detector flags nothing, but Hspell itself derives לביתי as ל + ביתי.
    assert build(["ביתי/a"], ["לביתי 5000"]) == []


def test_prefix_form_that_is_also_a_bare_stem_is_kept() -> None:
    # Dual reading: Hspell lists לביתי as a word in its own right.
    corpus = ["לביתי 5000"]
    assert words(build(["ביתי/a", "לביתי"], corpus)) == ["לביתי"]


def test_needaffix_stem_is_not_a_bare_stem() -> None:
    # j marks a stem that is valid only with a prefix, so it cannot rescue לחנות.
    assert build(["חנות/aj", "לחנות/j"], ["לחנות 5000"]) == []


def test_definite_article_form_is_excluded_without_a_dictionary_rule() -> None:
    # No ה rule in the fixture: ה + a known 4-letter word is still out.
    corpus = ["הילדה 5000", "ילדה 5000"]
    assert words(build(["הילדה", "ילדה"], corpus)) == []


def test_ha_initial_word_whose_rest_is_not_a_word_is_kept() -> None:
    assert words(build(["הצלחה"], ["הצלחה 5000"])) == ["הצלחה"]


def test_detector_only_sees_candidates_that_clear_the_cutoff() -> None:
    seen: list[str] = []

    def spy(candidates: list[str]) -> set[str]:
        seen.extend(candidates)
        return set()

    dic = "2\nאבגדה\nתפוזי\n"
    build_solutions(dic, AFF, "אבגדה 500\nתפוזי 5", "", spy)
    assert seen == ["אבגדה"]


# Blocklist: proper nouns and vulgar words, one per line.


def test_blocklisted_word_is_excluded() -> None:
    assert build(["אבגדה"], ["אבגדה 500"], blocklist="אבגדה\n") == []


def test_blocklist_ignores_comments_blank_lines_and_final_letters() -> None:
    blocklist = "# names\n\nילדים\n"
    assert build(["ילדים"], ["ילדים 500"], blocklist=blocklist) == []


def test_solutions_json_is_a_valid_array_of_word_and_hard() -> None:
    text = solutions_json([Solution("אבגדה", hard=True), Solution("תפוזי", hard=False)])
    assert json.loads(text) == [
        {"word": "אבגדה", "hard": True},
        {"word": "תפוזי", "hard": False},
    ]
