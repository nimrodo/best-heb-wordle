"""Tests for the Construct form finder, driven by small Hspell `.hif` fixtures.

Each `.hif` line is `word tag,tag,...`; a `סמיכות` tag marks a construct reading.
"""

from wordlists.construct import construct_forms, construct_list


def find(nouns: str = "", verbs: str = "") -> list[str]:
    return construct_forms(nouns, verbs)


def test_noun_with_only_a_construct_reading_is_a_construct_form() -> None:
    assert find("אבטחה נ,ע,יחיד\nאבטחת נ,ע,יחיד,סמיכות") == ["אבטחת"]


def test_plural_noun_construct_is_found_beside_its_possessive_reading() -> None:
    nouns = "אוהדים ז,ע,רבים\nאוהדי ז,ע,רבים,סמיכות\nאוהדי ז,ע,יחיד,של/אני"
    assert find(nouns) == ["אוהדי"]


def test_participle_construct_is_found_in_the_verb_file() -> None:
    verbs = "רוכבים פ,הווה,רבים,ז\nרוכבי פ,הווה,רבים,ז,סמיכות"
    assert find(verbs=verbs) == ["רוכבי"]


def test_form_that_is_also_a_plain_word_is_not_a_construct_form() -> None:
    nouns = "פשרות נ,ע,רבים\nפשרות נ,ע,רבים,סמיכות"
    assert find(nouns) == []


def test_form_that_is_a_plain_participle_and_a_construct_is_kept_out() -> None:
    verbs = "אוכלת פ,הווה,יחיד,נ\nאוכלת פ,הווה,יחיד,נ,סמיכות"
    assert find(verbs=verbs) == []


def test_form_that_is_also_an_adjective_is_not_a_construct_form() -> None:
    nouns = "פנימי ת,יחיד,ז\nפנימי נ,ע,רבים,סמיכות"
    assert find(nouns) == []


def test_a_past_tense_verb_reading_does_not_make_it_plain() -> None:
    both = "אבטחת נ,ע,יחיד,סמיכות\nאבטחת פ,עבר,אתה"
    assert find(both, both) == ["אבטחת"]


def test_adjective_construct_alone_is_not_a_construct_form() -> None:
    assert find("תלותי ת,יחיד,ז,סמיכות") == []


def test_only_five_letter_words_are_listed_sorted_and_without_duplicates() -> None:
    nouns = (
        "אבטחת נ,ע,יחיד,סמיכות\nאבטחת נ,ע,רבים,סמיכות\n"
        "אורחי ז,ע,רבים,סמיכות\nבתי ז,ע,רבים,סמיכות\nמשפחתי נ,ע,יחיד,סמיכות"
    )
    assert find(nouns) == ["אבטחת", "אורחי"]


def test_final_letters_are_normalised() -> None:
    assert find("אבדכמ ז,ע,רבים,סמיכות") == ["אבדכמ"]
    assert find("אבדךם ז,ע,רבים,סמיכות") == ["אבדכמ"]


def test_comment_and_blank_lines_are_ignored() -> None:
    assert find("#* generated\n\nאבטחת נ,ע,יחיד,סמיכות\n") == ["אבטחת"]


def test_list_file_is_one_word_per_line_with_a_header() -> None:
    text = construct_list(["אבטחת", "אורחי"])
    assert text.startswith("#")
    assert text.splitlines()[-2:] == ["אבטחת", "אורחי"]


def test_masculine_singular_construct_reading_is_not_evidence() -> None:
    # Spelled the same as the plain word, so a missing plain reading proves nothing.
    assert find("חדלון ז,ע,יחיד,סמיכות") == []
    assert find(verbs="רוכבת פ,הווה,יחיד,ז,סמיכות") == []
