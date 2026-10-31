"""Tests for the Meanings extraction, driven by tiny in-memory Wiktionary dumps."""

import bz2
import json
from pathlib import Path

from wordlists.definitions import (
    MAX_LENGTH,
    MIN_LENGTH,
    build_meanings,
    clean_wikitext,
    first_sense,
    fit_length,
    meanings_json,
)

LONG = "מבנה קבע המשמש למגורים של בני אדם"  # well over 15 characters


def page(title: str, text: str, ns: int = 0) -> str:
    return (
        f"<page><title>{title}</title><ns>{ns}</ns><revision>"
        f'<text xml:space="preserve">{text}</text></revision></page>'
    )


def meanings(tmp_path: Path, solutions: set[str], *pages: str) -> dict[str, str]:
    path = tmp_path / "dump.xml.bz2"
    # The real dump declares a default XML namespace on the root.
    ns = 'xmlns="http://www.mediawiki.org/xml/export-0.11/"'
    xml = f"<mediawiki {ns}>{''.join(pages)}</mediawiki>"
    path.write_bytes(bz2.compress(xml.encode()))
    return build_meanings(path, solutions)


# --- wikitext cleanup ---


def test_links_keep_their_display_text() -> None:
    assert clean_wikitext("[[מבנה]] קבע ב[[בית|בתים]]") == "מבנה קבע בבתים"


def test_templates_refs_and_markup_are_removed() -> None:
    raw = "'''מבנה''' {{משני|א|{{פנימי}}}} קבע<ref>מקור</ref> <b>ו</b>&amp;כו"
    assert clean_wikitext(raw) == "מבנה קבע ו&כו"


def test_external_links_keep_their_label() -> None:
    assert clean_wikitext("ראו [https://example.com אתר] כאן") == "ראו אתר כאן"


def test_whitespace_is_collapsed() -> None:
    assert clean_wikitext("  א \n  ב\t ג ") == "א ב ג"


# --- first sense ---


def test_first_sense_is_the_first_top_level_numbered_line() -> None:
    assert first_sense("intro\n# ראשון\n#: דוגמה\n# שני\n") == "ראשון"


def test_sense_examples_and_subsenses_are_not_senses() -> None:
    assert first_sense("#: דוגמה\n## תת\n#* ציטוט\n") is None


def test_redirects_have_no_sense() -> None:
    assert first_sense("#הפניה [[בית]]") is None
    assert first_sense("#REDIRECT [[בית]]") is None


# --- length rules ---


def test_long_meanings_are_cut_at_a_word_with_an_ellipsis() -> None:
    cut = fit_length("מילה " * 40)
    assert cut is not None
    assert len(cut) <= MAX_LENGTH
    assert cut.endswith("מילה…")


def test_meaning_at_exactly_the_cap_is_unchanged() -> None:
    text = "א" * MAX_LENGTH
    assert fit_length(text) == text


def test_meanings_under_the_floor_are_dropped() -> None:
    assert fit_length("א" * (MIN_LENGTH - 1)) is None
    assert fit_length("א" * MIN_LENGTH) == "א" * MIN_LENGTH


# --- exact-form matching ---


def test_only_the_exact_form_of_a_solution_gets_a_meaning(tmp_path: Path) -> None:
    result = meanings(
        tmp_path,
        {"ביתימ", "כלבימ"},
        page("ביתים", f"# {LONG}"),
        page("בית", f"# {LONG}"),  # the lemma, which is not a Solution
        page("הכלבים", f"# {LONG}"),  # Prefix-attached, not a Solution
    )
    assert list(result) == ["ביתימ"]


def test_final_letters_are_normalised_to_match_solutions(tmp_path: Path) -> None:
    result = meanings(tmp_path, {"מכנסימ"}, page("מכנסים", f"# {LONG}"))
    assert result == {"מכנסימ": LONG}


def test_titles_with_misplaced_final_letters_are_ignored(tmp_path: Path) -> None:
    assert meanings(tmp_path, {"מכנסימ"}, page("מכנסימ", f"# {LONG}")) == {}


def test_other_namespaces_are_ignored(tmp_path: Path) -> None:
    assert meanings(tmp_path, {"שלומ"}, page("שלום", f"# {LONG}", ns=10)) == {}


def test_solution_without_a_usable_meaning_is_left_out(tmp_path: Path) -> None:
    assert meanings(tmp_path, {"ביתימ"}, page("ביתים", "# קצר")) == {}


def test_output_is_sorted_compact_json() -> None:
    out = meanings_json({"תתתתת": "ב", "אאאאא": "א"})
    assert out == '{"אאאאא":"א","תתתתת":"ב"}\n'
    assert json.loads(out) == {"אאאאא": "א", "תתתתת": "ב"}
