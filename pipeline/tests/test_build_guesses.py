"""Tests drive `build_guesses` with small Hspell/corpus fixtures.

Fixtures use the real formats: a Hunspell .dic/.aff pair generated from
Hspell 1.4, and `word count` lines from OpenSubtitles frequency data.
"""

from wordlists import build_guesses

AFF = """\
NEEDAFFIX j
PFX a N 5
PFX a 0 ל .
PFX a 0 ב [^ו]
PFX a 0 ב" .
PFX a 0 שמ וו
"""


def build(dic_words: list[str], corpus: list[str] | None = None) -> list[str]:
    dic = f"{len(dic_words)}\n" + "\n".join(dic_words) + "\n"
    corpus_text = "\n".join(corpus or [])
    output = build_guesses(dic, AFF, corpus_text)
    assert output == "" or output.endswith("\n")
    return output.splitlines()


def test_keeps_only_five_letter_hspell_forms() -> None:
    assert build(["שלום", "חלומות", "חלום", "ספרים"]) == ["ספרימ"]


def test_final_letters_are_normalised() -> None:
    assert build(["ילדים", "מחשבן"]) == ["ילדימ", "מחשבנ"]


def test_output_is_sorted_and_deduplicated() -> None:
    assert build(["תפוזי", "אבגדה", "תפוזי"]) == ["אבגדה", "תפוזי"]


def test_prefix_letters_are_expanded_from_stem_flags() -> None:
    # 4-letter stem plus ל or ב makes 5-letter forms; the bare stem is too short.
    assert build(["ביתי/a"]) == ["בביתי", "לביתי"]


def test_prefix_rule_condition_must_match_stem_start() -> None:
    # The ב rule needs a first letter other than ו; the ל rule has no condition.
    assert build(["ויתר/a"]) == ["לויתר"]


def test_prefix_rules_with_quotes_are_not_letter_forms() -> None:
    # ב" would make a 5-letter string, but it is not pure Hebrew letters.
    assert build(["גדה/a"]) == []


def test_needaffix_stem_is_valid_only_with_a_prefix() -> None:
    # j marks stems that are already prefix-attached forms listed as stems.
    assert build(["החנות/aj"]) == []
    assert build(["חנות/aj"]) == ["בחנות", "לחנות"]


def test_stems_with_hspell_quote_marks_are_skipped() -> None:
    assert build(['א"יגד', "אבגדה"]) == ["אבגדה"]


# Vav/yod spelling variants: a spelling that differs from an Hspell form by
# one non-initial ו or י is a Guess only if the corpus attests it 100+ times.


def test_variant_by_inserting_yod_is_kept_at_100_hits() -> None:
    assert build(["שניה"], ["שנייה 100"]) == ["שנייה"]


def test_variant_is_dropped_at_99_hits() -> None:
    assert build(["שניה"], ["שנייה 99"]) == []


def test_variant_by_removing_vav_from_a_longer_form() -> None:
    assert build(["שיחזור"], ["שיחזר 150"]) == ["שיחזר"]


def test_variant_counts_sum_across_final_letter_forms() -> None:
    assert build(["שנים"], ["שניים 60", "שניימ 40"]) == ["שניימ"]


def test_variants_of_five_letter_forms_are_never_five_letters() -> None:
    # One added or removed letter changes the length, so only 4- and 6-letter
    # Hspell forms can yield a 5-letter variant.
    assert build(["טיפשי"], ["טפשי 500", "טיפושי 500"]) == ["טיפשי"]


def test_variant_does_not_touch_the_first_letter() -> None:
    assert build(["ילדה"], ["וילדה 500"]) == []
    assert build(["וילדים"], ["ילדים 500"]) == []


def test_variant_edit_must_be_vav_or_yod() -> None:
    assert build(["שנהב"], ["שנאהב 500", "שנההב 500"]) == []


def test_variant_of_a_prefix_expanded_form() -> None:
    assert build(["שמה/a"], ["לשומה 300"]) == ["לשומה"]


def test_variant_of_a_hspell_form_is_not_added_twice() -> None:
    assert build(["טיפשי", "טפשי"], ["טיפשי 500"]) == ["טיפשי"]


def test_corpus_only_words_are_excluded() -> None:
    corpus = ["מייקל 90000", "אוקיי 80000", "שלום 70000"]
    assert build(["אבגדה"], corpus) == ["אבגדה"]


def test_malformed_and_non_hebrew_corpus_lines_are_ignored() -> None:
    corpus = ["hello 500", "", "שנייה", "שנייה abc", "שנ'יה 500", "שנייה 100"]
    assert build(["שניה"], corpus) == ["שנייה"]
