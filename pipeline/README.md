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
   500+ is a Common word, 100-499 a Hard word, under 100 is dropped. Inflected
   forms count on their own.
2. It is not in `blocklist.txt` (proper nouns, vulgar words; hand-edited).
3. No vav/yod spelling variant of a *different length* has 100+ hits, so the
   player is never misled when counting tiles. Those words stay valid Guesses.
4. It is not Prefix-attached by Hspell's own rules: a form built by a prefix
   rule is dropped unless Hspell also lists it as a word in its own right (a
   dual reading). The definite article is stricter: ה plus any known 4-letter
   word is dropped, rule or not.
5. DictaBERT-joint's prefix head does not split it. The model, pinned to a
   revision, loads with `trust_remote_code`, so it downloads and runs Python
   from the model repo (about 715 MB). It runs only on candidates that survive
   1-4, and it over-flags by design but still misses some.

```sh
uv sync --extra detector
uv run wordlists-solutions \
  --dic path/to/he_IL.dic --aff path/to/he_IL.aff \
  --corpus path/to/he_full.txt --blocklist blocklist.txt \
  --common-min-hits 500 \
  --out ../public/solutions.json
```

`--common-min-hits` (default 500) sets where Common starts; the 100-hit floor
is fixed.

### Common rule: hits or the `nimble` model

Frequency alone mislabels everyday words as Hard (אבהות has 360 hits). A word
is Common if it has `--common-min-hits` or more hits, **or** `nimble`'s
probability that it is an everyday word is at least `--commonness-min-prob`
(default 0.90). It only **promotes**, never demotes: the model scores inflected
verb forms too low (יהרסו 33%), so a word with enough hits stays Common
whatever it said. A word absent from `commonness.json` is judged on hits alone.
`--commonness` points at the scores file (default `commonness.json`, used when
present; an explicit path that is missing is an error). The report lists the
promoted words for review.

### Scoring with `nimble` (`commonness.json`)

The scores are produced by a separate script and committed, so the build never
needs the model. It needs [Ollama](https://ollama.com) running locally with the
`nimble` decision model. `nimble` is not a chat model: it is served at
`/v1/systemone`, where a Noul question returns the probability of "yes". The
question is "Is this an everyday Hebrew word that any ordinary adult Israeli
knows?", asked of the word with its final letters restored.

```sh
uv run wordlists-commonness \
  --dic path/to/he_IL.dic --aff path/to/he_IL.aff \
  --corpus path/to/he_full.txt --blocklist blocklist.txt
```

It scores every candidate that is Hard by hits (it skips the slow prefix
detector, so a few scored words may later be dropped). About 0.7 s per word,
roughly 40 minutes in all. `commonness.json` (`--out`) maps each normalised
word to its probability, sorted, compact. It is saved every 25 words and read
first on a rerun, so an interrupted run resumes and scored words are not
re-asked. Words that are no longer Hard are dropped from the file.

The report printed at the end gives the Common and Hard pool sizes. The last
build gave 2,261 Common and 2,835 Hard words (5,096 in all) at the 500 cut-off, 512 of the Common ones promoted by `nimble`. The detector module has no tests
(it is the model boundary), so spot-check the output for Prefix-attached forms
and names and add them to `blocklist.txt`.

## Meanings (`definitions.json`)

A JSON object mapping a Solution (normalised form, as in `solutions.json`) to its
Meaning, sorted, compact. It lives in `pipeline/`, not `public/`, until the
game loads it. Built only for Solutions, from the Hebrew Wiktionary dump
(`hewiktionary-latest-pages-articles.xml.bz2`, from
[dumps.wikimedia.org](https://dumps.wikimedia.org/hewiktionary/latest/)):

1. Exact form only, with no lemmatiser: the entry's title must be the Solution
   itself (final letters normalised; a title with a final letter mid-word is
   ignored). An inflected Solution whose form has no entry of its own gets no
   Meaning.
2. First sense only: the first top-level `# ` line of the entry.
3. Wikitext cleaned to plain text (templates, refs and HTML removed, links
   reduced to their display text, quote markup removed, whitespace collapsed).
4. Under 15 characters: dropped. Over 120: cut at a word and ended with `…`.

A Solution with no Meaning stays in `solutions.json` (a Meaning is optional).
The dump is streamed, never loaded whole, and treated as untrusted data.

```sh
uv run wordlists-definitions \
  --dump path/to/hewiktionary-latest-pages-articles.xml.bz2 \
  --solutions ../public/solutions.json --out definitions.json
```

Takes a few seconds. The last build (dump of 2026-10) gave Meanings for 577 of
5,096 Solutions (11.3%).

### Licence

`definitions.json` is the only CC BY-SA 4.0 file in the project: its text is
derived from [Hebrew Wiktionary](https://he.wiktionary.org) entries by
Wiktionary contributors, licensed
[CC BY-SA 4.0](https://creativecommons.org/licenses/by-sa/4.0/); each Meaning
is a shortened, cleaned excerpt of an entry's first sense. Any reuse of the
file must keep this attribution and the same licence. (The OpenSubtitles counts
in `he_full.txt` are also CC BY-SA 4.0 but are an input only and are not
shipped.)

