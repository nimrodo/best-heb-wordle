"""THROWAWAY PROTOTYPE (issue #40): lemma-family hits. Not part of the shipped package.

Hspell's he_IL.dic has no lemma information (it lists every inflected form as its
own entry and he_IL.aff has only PFX rules), so a "family" is inferred here from
spelling: strip an optional future/binyan prefix letter and an optional pronoun
suffix, drop vav/yod, and group forms by the remaining 3-consonant skeleton.
"""

from collections import defaultdict

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
