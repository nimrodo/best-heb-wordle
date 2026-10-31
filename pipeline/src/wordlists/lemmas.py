"""Infer a word's lemma, since Hspell has no lemma data.

`he_IL.dic` lists every inflected form as its own entry and `he_IL.aff` has only
prefix rules, so a family of forms is inferred from spelling: strip an optional
future/binyan prefix letter and an optional pronoun suffix, drop vav/yod, and
group forms by the remaining 3-consonant skeleton. It is crude: it can pick a
wrong lemma, or none (see the issue #40 report in `prototype/`).
"""

from collections import defaultdict
from collections.abc import Mapping

from wordlists.guesses import HEBREW_WORD, normalise

PREFIX_LETTERS = "אינתהמ"
SUFFIXES = ["", "ו", "ה", "י", "ך", "ם", "ן", "נה", "ני", "נו", "כם", "כן", "הו",
            "הם", "הן", "תי", "תם", "תן", "ת"]  # fmt: skip


def _cores(form: str) -> set[str]:
    """Stems left after stripping an optional prefix letter and an optional suffix."""
    out = set()
    prefixes = ["", *[c for c in PREFIX_LETTERS if form.startswith(c)]]
    # Future of hitpael/nifal/hifil: future letter + ת/נ/ה (אתקרב = א + ת + קרב).
    if form[:1] in "אינת" and form[1:2] in "תנה":
        prefixes.append(form[:2])
    for pre in prefixes:
        rest = form[len(pre) :]
        for suf in SUFFIXES:
            if suf and not rest.endswith(suf):
                continue
            core = rest[: len(rest) - len(suf)]
            if 3 <= len(core) <= 5:
                out.add(core)
    return out


def skeleton(core: str) -> str:
    return "".join(c for c in core if c not in "וי")


def build_index(dic: str, aff: str) -> dict[str, set[str]]:
    """3-consonant skeleton -> Hspell forms (length 3-7, listed as words) in it."""
    need_affix = next(
        (p[1] for p in map(str.split, aff.splitlines()) if p[:1] == ["NEEDAFFIX"]), None
    )
    by_skel: dict[str, set[str]] = defaultdict(set)
    for line in dic.splitlines()[1:]:
        stem, _, flags = line.partition("/")
        if not HEBREW_WORD.fullmatch(stem) or need_affix in flags:
            continue
        form = normalise(stem)
        if 3 <= len(form) <= 7:
            for core in _cores(form):
                sk = skeleton(core)
                if len(sk) == 3:
                    by_skel[sk].add(form)
    return by_skel


def family(word: str, by_skel: dict[str, set[str]]) -> tuple[set[str], str | None]:
    """Forms sharing the candidate's most-populated 3-consonant skeleton."""
    keys = {skeleton(c) for c in _cores(word)} & by_skel.keys()
    if not keys:
        return set(), None
    key = max(keys, key=lambda k: len(by_skel[k]))
    return by_skel[key], key


def lemma_of(
    word: str, by_skel: dict[str, set[str]], counts: Mapping[str, int]
) -> str | None:
    """The bare root if Hspell lists it (past 3sg, e.g. גנב), else the most
    frequent other form of the family. Forms starting with מ are skipped: they
    are mostly nouns (מגניב), not the verb's base form."""
    forms, key = family(word, by_skel)
    if key is None:
        return None
    if key in forms and counts.get(key, 0) > 0:
        return key
    others = [f for f in forms if f != word and not f.startswith("מ")]
    return max(others, key=lambda f: counts.get(f, 0), default=None)
