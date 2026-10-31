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

Tests drive `build_guesses`, the single top-level build function.
