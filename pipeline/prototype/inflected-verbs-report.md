# Everyday inflected verb forms: prototype report (issue #40)

Throwaway prototype. Scripts: `pipeline/prototype/*.py` (outside the shipped
`wordlists` package). Nothing in `solutions.json`, `commonness.json` or
pipeline source changed. All nimble runs wrote to a scratch file.

Words are shown in normalised form (final letters folded, e.g. `תנפנפ`, `מגנומ`).

## Question

A Hard word is promoted to Common only if `nimble` gives >= 0.90. Everyday
inflected verb forms miss it (אגנוב 0.731, אעניש 0.711, אתקרב 0.715) and score
the same as rarer words (אקליט 0.726, אציית 0.709, דחליל 0.722). Which
automatic, allowlist-free signal separates the two groups?

## Method and limits

- Inputs: Hspell `he_IL.dic/.aff` (LibreOffice), OpenSubtitles `he_full.txt`,
  `pipeline/commonness.json` (3,480 scored Hard words, 409 in the 0.70-0.75 band).
- **Hspell has no lemma data.** `he_IL.dic` lists every inflected form as its own
  entry and `he_IL.aff` has only prefix rules (no `SFX`). So a "family" is
  *inferred*: strip an optional future/binyan prefix letter (and a two-letter
  future+ת/נ/ה prefix) and an optional pronoun suffix, drop vav/yod, group by the
  3-consonant skeleton (`families.py`). This is crude: it pulls in nouns
  (מגניב, עונש), merges unrelated roots, and finds no family for אתקרב-style
  hitpael forms unless the two-letter prefix is handled (it is) or for
  doubled-yod roots (דחליל has none; אציית got the wrong root `אצת`).
- **Lemma** = the bare 3-letter root if Hspell lists it (past 3sg, e.g. גנב), else
  the most frequent family form not starting with מ. It is wrong for some words
  (listed below).
- nimble questions (same `/v1/systemone` Noul setup as `commonness.py`):
  - everyday question on the lemma: the existing `QUESTION`.
  - verb question on the word: "Is this word a form of an everyday Hebrew verb
    that any ordinary adult Israeli knows?"
- The lemma and verb questions were run only on the six examples and on **all
  409** words of the 0.70-0.75 band (320 of them have an inferred lemma).
  Words outside the band were not scored with them (see "Not measured").

## Example values

| word | set | hits | nimble | family size | family hits | lemma | lemma q | verb q |
|---|---|---|---|---|---|---|---|---|
| אגנוב | everyday | 387 | 0.731 | 143 | 65,423 | גנב | 0.991 | 0.722 |
| אעניש | everyday | 130 | 0.711 | 108 | 7,248 | עונש | 0.975 | 0.735 |
| אתקרב | everyday | 236 | 0.715 | 219 | 83,417 | קרב | 0.949 | 0.828 |
| אקליט | rarer | 115 | 0.726 | 206 | 33,029 | קלט | 0.761 | 0.596 |
| אציית | rarer | 153 | 0.709 | 64 | 1,288 | אצת (wrong) | 0.436 | 0.810 |
| דחליל | rarer | 217 | 0.722 | 0 | 0 | none | n/a | 0.426 |

## Per signal: does it put all three everyday words above all three rarer ones?

| signal | min everyday | max rarer | separates? |
|---|---|---|---|
| nimble (current) | 0.711 | 0.726 | no |
| family hits | 7,248 | 33,029 | **no**: אקליט's family (קלט, a real everyday verb) is bigger than אעניש's |
| verb-specific nimble | 0.722 | 0.810 | **no**: אציית scores 0.810 as a verb form |
| lemma scored by nimble | 0.949 | 0.761 | **yes**, margin 0.19 |

Family hits fail for a real reason, not only a crude heuristic: אקליט is a form
of a genuinely common verb (להקליט), so any family-size signal rates it everyday.
The task's "rarer" label there is about the *form*, which family hits cannot see.

## Combinations

Brute-force AND of two thresholds (taken from the example values) finds rules
that separate, but every one contains `lemma_q`, with the other signal doing no
work: `nimble >= 0.711 AND lemma_q >= 0.949`; `fam_hits >= 7,248 AND lemma_q >= 0.949`;
`lemma_q >= 0.949 AND verb_q >= 0.426`; and so on. The two combinations without
`lemma_q` that the search lists use verb_q with nimble or family hits
(`nimble >= 0.711 AND verb_q >= 0.722`; `fam_hits >= 7,248 AND verb_q >= 0.722`)
but they pass אציית's verb_q 0.810 only by being excluded through the other
threshold, i.e. they fit six points by chance. Do not trust them.
(`prototype/analyze.py` prints the full list.)

Effect on the 409-word band (`rule_report.py`):

| rule | promoted of 409 |
|---|---|
| lemma_q >= 0.90 | 88 |
| lemma_q >= 0.85 | 118 |
| lemma_q >= 0.80 | 142 |
| lemma_q >= 0.90 AND fam_hits >= 5,000 | 76 |
| lemma_q >= 0.90 AND verb_q >= 0.60 | 76 |
| fam_hits >= 5,000 alone | 246 (far too loose) |
| fam_hits >= 20,000 alone | 134 |
| verb_q >= 0.70 alone | 204 (far too loose) |

## Best rule: lemma_q >= 0.90 (inside the 0.70-0.75 band)

Promotes **88 of the 409** band words (22%), all six examples in the right
place: all three everyday words promoted, אקליט (0.761), אציית and דחליל not.
Cut-off 0.90 sits in the empty gap 0.761 to 0.949, so any value from about 0.80
to 0.94 gives the same example result; 0.90 matches the existing
`--commonness-min-prob`.

### Promoted words, band 0.700-0.725 (38)

נחנקו תבגוד תחגגו נגריל זרועו תנפנפ מגנומ רודפי תתאהב תשרדי נשבעה ידליק אעניש
תעיפי מעטות יגרור תישענ אקריב אתקרב יתאהב נמשכה טוניק גושימ יעודד מושתנ מגוננ
שהותי תלולה אתרגל רדומה הולכי תחברו חנוכת יתערב מהולל תשלוט נקברו תחבוש נגרמו

### Promoted words, band 0.725-0.750 (50)

יגנבו אתנהג סדוקה אשווה נפוחה יזמינ אתקבל יפחדו אגנוב מגלות מחמשת לועגת אתאמנ
העניש יאסופ יתמזל עונשי נאבקו גדרות תזרימ נדלקו מעצרו פוצצו מפשעה שמיני שוכני
נשקול שבילה אתאהב אדומי מבשרת תשקרו נהרגת לחצנו חגיגי מזמני חוותה מגדרי לבבית
תשקלי ישתפו יבשתי שתפנה יעניש סלילי חמצני תקשרי מטרתי נשמעו

### Likely false positives to skim

The rule trusts the lemma question, so a wrong lemma can promote a rare word:

- Wrong or unrelated lemma: מגנומ (lemma הוגנימ), טוניק (טנק "tank"), תלולה (לילה),
  שהותי (שהייתי), חוותה (אחותה), רדומה (יורדימ), פוצצו (פצצה), אשווה (אשה),
  מגלות (גיליתי), תנפנפ (נפנופ), תעיפי (תעופ), נגריל (גורל).
- Everyday lemma but the form itself is a rare noun or adjective, not a verb
  form: שמיני, אדומי, חגיגי, מטרתי, יבשתי, לבבית, סדוקה, נפוחה, שבילה, גדרות,
  חמצני, סלילי, מעטות, עונשי, מגדרי.
- Genuinely the target group (inflected everyday verbs): אגנוב, אעניש, אתקרב,
  תבגוד, תחגגו, ידליק, יגרור, אתרגל, תשלוט, נקברו, יפחדו, נשקול, תשקרו,
  נהרגת, נשמעו, נגרמו, ישתפו and most `ת-`/`י-`/`נ-` forms.

Roughly a quarter of the 88 are not inflected verb forms. A maintainer should
decide whether nouns and adjectives with an everyday root are acceptable
(they are arguably Common too: חגיגי, אדומי, שבילה) and whether the handful
with a plainly wrong lemma matter.

## Recommendation

**Adopt, tentatively, rule: promote a Hard word when `nimble`'s everyday
probability for its inferred lemma is >= 0.90, applied to words already in the
Hard pool with a current `nimble` score of at least about 0.70.** No other single
signal or combination is justified: family hits and the verb-specific question
are ruled out by the examples (fail the separation test) and by the band
statistics (too loose); combinations only help when `lemma_q` is in them.

Before adopting, a follow-up must settle what this prototype could not:

1. **Lemma quality.** The skeleton heuristic is the weak link (about a dozen
   wrong lemmas in 88). A real lemmatiser (for example a DictaBERT
   lemma head; not tested here) would
   remove the main false-positive source. Hspell itself cannot supply lemmas.
2. **Six examples is a tiny test set.** The separation (0.949 vs 0.761) is real
   but narrow in n; a 40-word hand-labelled sample of the 88 plus a sample of
   the 321 not promoted would give a precision/recall figure.
3. **Lower floor not measured.** Whether the rule should also reach words with
   `nimble` below 0.70 (0.55-0.70 holds ~830 more Hard words) is unknown.

If the maintainer will not accept the lemma-heuristic false positives and no
lemmatiser is added, the honest answer is that **no automatic rule works
cleanly with Hspell and OpenSubtitles data alone**; family hits in particular
cannot work because the rarer-form אקליט belongs to a very common verb.

## Not measured

- Lemma and verb nimble scores for the Hard words outside 0.70-0.75, so the
  rule's total promotions across the whole 2,835-word Hard pool are unknown
  (88 is the band count only). Scoring the rest is about 40 minutes per question.
- Precision against hand labels (none exist).
- Words later dropped by the DictaBERT prefix detector were not filtered out
  (candidates are Hard by hits, as in `commonness.py`).

## Reproduce

```sh
cd pipeline
uv run python prototype/collect.py DIR rows.json   # DIR has he_IL.dic, he_IL.aff, he_full.txt
uv run python prototype/analyze.py rows.json
uv run python prototype/rule_report.py rows.json
```
