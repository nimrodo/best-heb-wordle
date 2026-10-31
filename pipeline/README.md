# Word-list pipeline

Offline `uv` pipeline that builds `public/guesses.txt`, the list of every valid
Guess. Run it by hand when the sources change; it is **not run in CI**, and the
generated file is committed.

## What it produces

One word per line, sorted, final letters normalised (ך→כ, ם→מ, ן→נ, ף→פ, ץ→צ):

1. Every 5-letter form in Hspell 1.4, with Prefix letters expanded using the
   dictionary's own prefix rules. Stems flagged `NEEDAFFIX` (already
   Prefix-attached forms listed as stems) appear only with a prefix.
2. Spelling variants: a form one letter longer or shorter than a 4- to 6-letter
   Hspell form, made by inserting or removing a single ו or י inside the word
   (never the first letter), kept only if it has 100 or more OpenSubtitles hits.

Words found only in the subtitle corpus are never accepted.

## Inputs

| File | Source |
|---|---|
| `he_IL.dic`, `he_IL.aff` | [LibreOffice `he_IL`](https://github.com/LibreOffice/dictionaries/tree/master/he_IL), generated from Hspell 1.4 (AGPL-3.0) |
| `he_full.txt` | [FrequencyWords `content/2018/he/he_full.txt`](https://github.com/hermitdave/FrequencyWords), OpenSubtitles2018 counts (CC BY-SA 4.0) |

## Run

```sh
cd pipeline
uv sync
uv run wordlists \
  --dic path/to/he_IL.dic --aff path/to/he_IL.aff \
  --corpus path/to/he_full.txt --out ../public/guesses.txt
```

Takes about 15 seconds. The last build gave 223,744 Hspell forms plus 774
variants (224,518 lines).

## Develop

```sh
uv run pytest        # fixtures only, no downloads needed
uv run ruff check . && uv run ruff format .
```

Tests drive `build_guesses` and `build_solutions`, the top-level build functions.

## Solutions (`public/solutions.json`)

A JSON array of `{"word": ..., "hard": bool}`, sorted by word. Candidates are
5-letter Hspell forms (the Academy spelling; corpus-only variants are never
Solutions). A candidate is kept if:

1. Its OpenSubtitles count (summed over final-letter forms) is 100 or more:
   1,000+ is a Common word, 100-999 a Hard word, under 100 is dropped. Inflected
   forms count on their own.
2. It is not in `blocklist.txt` (proper nouns, vulgar words; hand-edited).
3. No vav/yod spelling variant of a *different length* has 100+ hits, so the
   player is never misled when counting tiles. Those words stay valid Guesses.
4. DictaBERT-joint's prefix head does not split it (Prefix-attached forms).
   The model, pinned to a revision, loads with `trust_remote_code`, so it
   downloads and runs Python from the model repo (about 715 MB). It runs only
   on candidates that survive 1-3. It over-flags by design.

```sh
uv sync --extra detector
uv run wordlists-solutions \
  --dic path/to/he_IL.dic --aff path/to/he_IL.aff \
  --corpus path/to/he_full.txt --blocklist blocklist.txt \
  --common-min-hits 1000 \
  --out ../public/solutions.json
```

`--common-min-hits` (default 1,000) sets where Common starts; the 100-hit floor
is fixed.

The report printed at the end gives the Common and Hard pool sizes. The last
build gave 1,230 Common and 4,609 Hard words (5,839 in all); before the
detector ran, the pools were 2,080 and 8,480. The detector module has no tests
(it is the model boundary), so spot-check the output for Prefix-attached forms
and names and add them to `blocklist.txt`.

