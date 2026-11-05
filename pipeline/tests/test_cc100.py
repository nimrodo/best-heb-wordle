"""Tests for CC-100 counts and the admission pool they define."""

from wordlists.cc100 import cc100_admitted, cc100_counts, cc100_pool


def test_counts_are_summed_over_final_letter_forms() -> None:
    assert cc100_counts("שלומם,10\nשלוממ,5\nשלומם,1") == {"שלוממ": 16}


def test_counts_ignore_rows_that_are_not_hebrew_words_with_a_count() -> None:
    assert cc100_counts("ג'ון,5\nabc,3\nאבגדה,x\nאבגדה,7\n\n") == {"אבגדה": 7}


def test_pool_is_words_at_or_above_the_minimum() -> None:
    assert cc100_pool({"אבגדה": 5000, "תפוזי": 4999}, 5000) == {"אבגדה"}


def test_admitted_needs_a_screening_score_at_or_above_the_bar() -> None:
    pool = {"אבגדה", "תפוזי", "שלומי"}
    screening = {"אבגדה": 0.9, "תפוזי": 0.2}
    assert cc100_admitted(pool, screening, 0.9) == {"אבגדה"}
