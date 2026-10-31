"""Extract a Meaning for each Solution from the Hebrew Wiktionary dump.

Run by hand; the result is committed as `definitions.json`. Only an entry whose
title is exactly the Solution is used (no lemmatiser), and only its first sense.
The text is CC BY-SA 4.0 (Wiktionary contributors).
"""

import argparse
import bz2
import html
import json
import re
import xml.etree.ElementTree as ET
from collections.abc import Iterator
from pathlib import Path

from wordlists.commonness import restore_final_letters
from wordlists.guesses import normalise

MIN_LENGTH = 15
MAX_LENGTH = 120
ELLIPSIS = "…"

_TEMPLATE = re.compile(r"\{\{[^{}]*\}\}")
_REF = re.compile(r"<ref\b[^>]*?/>|<ref\b.*?</ref>", re.DOTALL)
_COMMENT = re.compile(r"<!--.*?-->", re.DOTALL)
_TAG = re.compile(r"</?[A-Za-z][^>]*>")
_PIPED_LINK = re.compile(r"\[\[(?:[^\]|]*\|)+([^\]]*)\]\]")
_LINK = re.compile(r"\[\[([^\]]*)\]\]")
_EXTERNAL_LINK = re.compile(r"\[(?:https?:)?//\S+\s*([^\]]*)\]")
_QUOTES = re.compile(r"'{2,}")
_SENSE = re.compile(r"^#(?![#:*;!])[ \t]*(\S.*)$", re.MULTILINE)
_REDIRECT = re.compile(r"\s*#\s*(?:redirect|הפניה)", re.IGNORECASE)


def _strip_templates(text: str) -> str:
    # Innermost first, so nested templates unwind.
    previous = None
    while previous != text:
        previous, text = text, _TEMPLATE.sub("", text)
    return text


def clean_wikitext(raw: str) -> str:
    text = _COMMENT.sub("", raw)
    text = _REF.sub("", text)
    text = _strip_templates(text)
    text = _PIPED_LINK.sub(r"\1", text)
    text = _LINK.sub(r"\1", text)
    text = _EXTERNAL_LINK.sub(r"\1", text)
    text = _TAG.sub("", text)
    text = _QUOTES.sub("", text)
    return " ".join(html.unescape(text).split())


def first_sense(text: str) -> str | None:
    """The first top-level numbered line (`# ...`) of an entry, as raw wikitext."""
    if _REDIRECT.match(text):
        return None
    match = _SENSE.search(text)
    return match.group(1) if match else None


def fit_length(meaning: str) -> str | None:
    """Drop a Meaning under the floor; cut a long one at a word to fit the cap."""
    if len(meaning) < MIN_LENGTH:
        return None
    if len(meaning) <= MAX_LENGTH:
        return meaning
    room = meaning[: MAX_LENGTH - len(ELLIPSIS) + 1]
    head = room.rsplit(" ", 1)[0] if " " in room else room[:-1]
    return head.rstrip(" ,;:-–") + ELLIPSIS


def meaning_for(text: str) -> str | None:
    sense = first_sense(text)
    return fit_length(clean_wikitext(sense)) if sense else None


def _is_properly_spelled(title: str) -> bool:
    # Final letters only at the end: a title like מכנסימ is a misspelling and
    # would collide with the real מכנסים once normalised.
    return restore_final_letters(normalise(title)) == title


def _entries(dump: Path) -> Iterator[tuple[str, str]]:
    """Stream (title, wikitext) of main-namespace pages, discarding each page
    after use. The dump is untrusted: nothing in it is executed or followed."""
    with bz2.open(dump, "rb") as stream:
        for _, elem in ET.iterparse(stream):
            if not elem.tag.endswith("}page"):
                continue
            # "{*}" matches the export schema's namespace, whatever its version.
            if elem.findtext("{*}ns") == "0":
                title = elem.findtext("{*}title") or ""
                yield title, elem.findtext(".//{*}text") or ""
            elem.clear()


def build_meanings(dump: Path, solutions: set[str]) -> dict[str, str]:
    """Meaning per Solution (normalised word), for those with a usable entry."""
    meanings: dict[str, str] = {}
    for title, text in _entries(dump):
        word = normalise(title)
        if word in solutions and word not in meanings and _is_properly_spelled(title):
            meaning = meaning_for(text)
            if meaning:
                meanings[word] = meaning
    return meanings


def meanings_json(meanings: dict[str, str]) -> str:
    body = json.dumps(
        meanings, ensure_ascii=False, sort_keys=True, separators=(",", ":")
    )
    return body + "\n"


def coverage_report(meanings: dict[str, str], solutions: set[str]) -> str:
    share = 100 * len(meanings) / len(solutions) if solutions else 0
    return f"Meanings: {len(meanings)} of {len(solutions)} Solutions ({share:.1f}%)"


def main() -> None:
    parser = argparse.ArgumentParser(
        description="Build definitions.json (Meanings) from the Hebrew Wiktionary dump."
    )
    parser.add_argument(
        "--dump", type=Path, required=True, help="hewiktionary-*-pages-articles.xml.bz2"
    )
    parser.add_argument(
        "--solutions", type=Path, required=True, help="public/solutions.json"
    )
    parser.add_argument(
        "--out", type=Path, required=True, help="output definitions.json"
    )
    args = parser.parse_args()
    entries = json.loads(args.solutions.read_text(encoding="utf-8"))
    solutions = {e["word"] for e in entries}
    meanings = build_meanings(args.dump, solutions)
    args.out.write_text(meanings_json(meanings), encoding="utf-8")
    print(coverage_report(meanings, solutions))
