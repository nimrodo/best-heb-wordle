# Hebrew word and frequency sources

Research for issue #2. Terms follow `GLOSSARY.md` (Solution, Guess, Prefix letter, Prefix-attached form, Hard word). Final letters are normalised everywhere (ך=כ, ם=מ, ן=נ, ף=פ, ץ=צ), so a "5-letter form" means a distinct string after normalisation, in the Hebrew alphabet only (no quotes or hyphens).

Date of research: 2026-10-31. "Verified" means I read it in the source's own file or page, or computed it from downloaded data. "Inferred" is marked as such.

## Answer in brief

- **Valid-word list (Guess check): Hspell.** It is the only candidate that is free, complete with inflections, bulk-downloadable and licence-clear. Licence is AGPL-3.0 (copyleft: see the licence caveat below). It follows one official spelling standard only.
- **Frequency: OpenSubtitles-based list (hermitdave/FrequencyWords, `he_full`).** Code MIT, data CC BY-SA 4.0. Its counts are for surface forms, from subtitles, so they are colloquial and name-heavy. Usable to rank Hspell words.
- **Online dictionary sites (Morfix, Milog, the Academy's sites, Pealim): none is usable as a bulk source.** Their terms are either all-rights-reserved or not retrievable, and none offers an API or a download that I could find. Not needed anyway.
- **Hebrew Wiktionary** is permissively licensed (CC BY-SA 4.0) but too small (about 3.7k five-letter titles) to be the validity list. It could help as a source of definitions or a hard-word signal.
- **5 letters is viable.** Hspell has 75,760 five-letter stems and 226k five-letter forms when Prefix letters are expanded. About 2.4k stems appear at least 1,000 times in the subtitle corpus, and about 9.6k at least 100 times. Four letters has 23.7k stems, 6.8k at 100 or more and 2.4k at 1,000 or more: a smaller pool with no gain in commonness, so there is no reason to drop to 4.

## Verified numbers

Data: Hspell 1.4 via the LibreOffice `he_IL` Hunspell dictionary (generated from Hspell 1.4), and `he_full.txt` from FrequencyWords 2018 (OpenSubtitles2018). Scripts were run with `uv run python -I`.

### Distinct normalised forms by length

| Length | Hspell stems (unprefixed list) | Hspell with Prefix letters expanded | OpenSubtitles distinct forms |
|---|---|---|---|
| 3 | 3,073 | 4,167 | 7,435 |
| 4 | 23,722 | 40,528 | 51,810 |
| 5 | 78,300 (75,760 usable bare, see note) | 226,060 | 159,278 |
| 6 | 123,549 | 814,804 | 229,812 |

The `.dic` file has 469,730 entries (467,690 pure-Hebrew normalised stems). The prefix-expanded total is 12.7M forms over all lengths.

Note on the `j` flag: the affix file declares `NEEDAFFIX j`. 2,540 of the 5-letter stems are valid only with a prefix. Samples are החנות, השעות, רבותי: these are already Prefix-attached forms listed as stems. Dropping them leaves 75,760 bare 5-letter stems. The ranges below use the original 78,300 unless stated.

### Common versus rare (5-letter, subtitle count of the surface form)

Counts are token counts of the normalised form, summed over variants that normalise together.

| Count threshold | Corpus forms | Of those, in Hspell stems | in Hspell with prefixes | not in Hspell at all |
|---|---|---|---|---|
| ≥ 1 | 159,278 | 38,325 | 87,875 | 71,403 |
| ≥ 10 | 55,735 | 21,875 | 42,944 | 12,791 |
| ≥ 100 | 18,480 | 9,623 | 16,352 | 2,128 |
| ≥ 1,000 | 4,083 | 2,439 | 3,850 | 233 |
| ≥ 5,000 | 874 | 519 | 846 | 28 |

Hspell 5-letter stems bucketed by corpus count: 0 occurrences 39,975 (51%), 1 to 9 occurrences 16,450, 10 to 99 occurrences 12,252, 100 to 999 occurrences 7,184, 1,000 or more 2,439.

Bare-stem correction (excluding `NEEDAFFIX`): count ≥ 100 gives 9,596 stems and count ≥ 1,000 gives 2,429.

For comparison, 4-letter Hspell stems: 23,722 total, 6,753 with count ≥ 100, 2,370 with count ≥ 1,000. Ranked by frequency, the 1,000th 5-letter stem has about 2,713 occurrences and the 3,000th about 758.

### What the numbers mean for common versus Hard word (inferred)

- The 51% of Hspell 5-letter stems with zero subtitle hits are mostly pronoun-suffixed verb forms (for example אאבדהו) and formal forms. They are valid Guesses but poor Solutions.
- Hard words are best defined by a frequency band, not by absence. A reasonable starting split, to be tuned in the design: common = count ≥ about 1,000 (about 2.4k stems before removing Prefix-attached forms), hard = count about 10 to 100 that still exist in Hspell (about 12k stems). The threshold needs a human eye on samples before it is locked.
- The frequency list is per surface form, not per lemma, and subtitles skew colloquial: top words include אנחנו, עכשיו, יודעת, הייתי, קדימה. Names are common among corpus forms missing from Hspell with count ≥ 1,000 (מייקל, קווינ, רוברט), plus spelling variants (אוקיי, איכפת, להכנס, השניה, שהיתה). None of those should be Solutions.

### Prefix-attached forms among 5-letter stems (inferred upper bound)

24,416 of the 5-letter stems start with a Prefix letter (מ ש ה ו כ ל ב). 11,851 of them have a 4-letter remainder that is also a stem. That is a loose upper bound, because it counts coincidences (משפחה, שלושה, מישהו are not Prefix-attached). 2,301 of those have count ≥ 100. The build must therefore not just strip by pattern. Excluding Prefix-attached forms from Solutions needs either a curated list or a rule that requires Hspell to mark the form as `prefix + word` where the word is a real lemma, plus a manual review of the common band. Hspell's prefix flags (in `he_IL.aff`) are the right data to derive this from.

### Two accepted spellings (ktiv male versus ktiv haser)

Hspell enforces the Academy of the Hebrew Language's niqqud-less standard strictly and lists one spelling. Its `README` says it is "100% and strictly compliant" with the Academy's rules and explains that it is a clean-room implementation, not based on other companies' lists, printed dictionaries or scanned documents.

So variant spellings show up as corpus forms missing from Hspell. I measured this as an upper bound by checking whether adding or removing one ו or י (not in the first position) turns a form into the other:

- 519 of the 16,352 five-letter Hspell forms with count ≥ 100 (3.2%) have an off-standard spelling that is also seen at least 100 times in the corpus. 435 (2.7%) have a variant at least 10% as frequent as the standard form. Examples: הייתה, האישה, מצוינ, אינני, תישאר, באזור, לוותר, טיפשי, הרצפה.
- 487 five-letter corpus forms with count ≥ 100 are off-standard spellings of a different-length standard form (examples: אמיתי, איכפת, להכנס, השניה). This list also contains names and coincidences, so it is noisy.
- The vav/yod neighbour test is too coarse to count homographs exactly: it flags real different words that differ by one letter. Treat the numbers as the order of magnitude: roughly 500 five-letter Guesses where the player may type a different accepted spelling, not thousands.
- A variant can change the word's length (4, 5 or 6 letters). A 5-letter Solution whose other spelling is 4 or 6 letters has a variant the player cannot enter as a 5-letter Guess. A Solution whose standard spelling is 6 letters and whose alternative is 5 letters would appear as a 5-letter Guess that Hspell rejects.

Design consequence (inferred): accept the common alternative spellings as Guesses (map them to the standard form for feedback), and pick Solutions only from the standard spelling. The roughly 500-entry scale makes a curated map feasible.

## Candidate sources

### Hspell (valid words with inflections)

- Licence: AGPL-3.0. `LICENSE` in the tarball says the program, "the dictionary files, and the generated word lists" are all AGPL (the download page wording is looser about GPL; the file wins). Copyright 2000-2017 Nadav Har'El and Dan Kenigsberg.
- Obtain: release 1.4 (2017-06-24) tarball at `http://hspell.sourceforge.net/hspell-1.4.tar.gz` (572,716 bytes). The tarball contains source and Perl generators (`wolig.pl`, `wolig.dat`, `milot.hif`), not a ready word list. I did not build it (running the downloaded build was blocked in this session), so I used the generated Hunspell dictionary instead.
- Format of what I used: `he_IL.dic` (UTF-8, first line is a count, then `word/flags`) and `he_IL.aff` (only `PFX` rules, no suffix rules). Source: `LibreOffice/dictionaries`, folder `he_IL`, README states "generated automatically from data prepared by the Hspell project... Hspell version 1.4". The word list is stems without Prefix letters plus flag letters that say which prefix groups can attach.
- Fitness: best available. Covers inflected forms, strict spelling standard, no names or slang. Weaknesses: includes many pronoun-suffixed and rare forms (51% of 5-letter stems never appear in subtitles); the `.dic` also lists some already-prefixed forms as stems (the `NEEDAFFIX` entries); no frequency.
- Licence caveat (inference, not legal advice): AGPL covers the word lists. A static site that ships a derived word list would likely need to offer the corresponding source under AGPL. This should be decided before the build, either by accepting AGPL for the word-list data and publishing it, or by generating the list at build time and checking what the licence requires. The dictionary-text licence may be read differently from the code's licence, so confirm.

### OpenSubtitles frequency (hermitdave/FrequencyWords)

- Licence: `LICENSE` is MIT (Copyright 2016 Hermit Dave). The repo README states MIT for the code and CC BY-SA 4.0 for the content. The underlying corpus is OpenSubtitles2018 (OPUS).
- Obtain: raw file `content/2018/he/he_full.txt` in the repo (19.2 MB, 1,167,621 lines).
- Format: UTF-8 text, one line per word: `word count`, descending (for example `לא 5020713`).
- Fitness: good for ranking, which is its only job here. Weaknesses (verified in the sample): per-surface-form counts, many names and transliterations, colloquial spelling and some non-standard spellings, including words not in Hspell with high counts.
- SA note (inference): the share-alike terms apply to the list itself. A derived rank or band in a published word list would need attribution and the same licence for that part.

### wordfreq (Python package, Hebrew supported)

- Source: README of `rspeer/wordfreq`: Hebrew `he` is supported at "large" size and the lists blend several sources. The README also says the project is sunset (see `SUNSET.md`), meaning no further updates.
- Licence: code Apache; data files "may be" under CC BY-SA 4.0 per the README (and some sources have their own terms, see README).
- Fitness: an alternative to the subtitle list that blends multiple sources, so it is less subtitle-biased. Not downloaded or measured here (inferred value only). Not essential, since FrequencyWords already answers the question.

### Hebrew Wiktionary and Wikipedia dumps

- Licence: text is CC BY-SA 4.0 with possible additional terms (Hebrew Wiktionary main page). Wikimedia dumps legal page: text under GFDL and CC BY-SA 4.0.
- Obtain: dumps at `dumps.wikimedia.org/hewiktionary/latest/`. `pages-articles.xml.bz2` is about 14 MB, and the title list is `hewiktionary-latest-all-titles-in-ns0.gz` (122,766 bytes). Wikipedia has its own dumps (not downloaded).
- Format: MediaWiki XML (bz2), SQL, and title lists.
- Verified: the namespace-0 title list has 31,186 titles. 3,670 are five Hebrew letters and 3,669 are distinct after normalising. The main page (dated 2022) says about 25,314 entries.
- Fitness: too small and uneven to validate Guesses (only about 3.7k five-letter pages, mostly lemmas, not inflected forms). Useful as an optional signal that a word has a dictionary entry. A Wikipedia text dump would give a larger frequency corpus but is more work than needed, and the SA licence applies. Not measured.

### Online dictionary sites

Whether each can be a validity check or bulk source. Where I could not read the terms, I say so and do not guess.

| Site | Owner | Terms of use (what I found) | Bulk or API | Format | Verdict |
|---|---|---|---|---|---|
| Morfix (morfix.co.il) | Melingo, an Encyclopaedia Britannica subsidiary (Morfix site and Wikipedia's list of Hebrew dictionaries) | Site footer links a "Terms of use" page, but my fetch of it returned HTTP 403, so the wording is not verified. | None found | HTML pages | Do not use. Unknown terms, and no documented access. |
| Rav-Milim (Melingo; Hebrew dictionary) | Melingo (Wikipedia list), originally the Center for Educational Technology | Second-hand only: Yale's library page says its licensed access bars anything except manual typing or copying of single words, bars automatic query programs and bars copying content. Written for Yale's licence, so it may not match the public terms. | None found | HTML | Do not use. |
| Milog (milog.co.il) | Not named on the site | Footer says all rights are reserved to Milog, except Wikipedia quotes under CC BY-SA 3.0 and Tanakh quotes from tanach.us under its own licence. The separate terms page text did not load, so scraping rules are not verified. | No API or download mentioned | HTML | Do not use for bulk. At best a manual spot-check, which "all rights reserved" does not clearly allow. |
| Academy of the Hebrew Language (hebrew-academy.org.il) and the historical dictionary databases (Ma'agarim) | The Academy | Direct fetch of the Academy sites returned HTTP 403. A web search summary of the Academy's terms said: rights in the site and contents reserved to the Academy; use permitted for study, learning and research; commercial use needs prior written permission; credit the Historical Dictionary Project. I did not read this on the Academy's own page, so treat it as unconfirmed. | No download or API found | HTML databases | Not usable as a bulk list. The Academy's spelling rules are the authority Hspell implements, so its rulings are the right reference for the ktiv map, not its data. |
| Hebrew Wiktionary | Wikimedia | CC BY-SA 4.0, as above. | Dumps and the MediaWiki API are provided | XML, SQL, JSON via API | Usable and licence-clear, but small (see above). |
| Pealim (pealim.com) | Not stated | No licence or terms text on the home page, only a privacy policy link. About 9,000 words (verb tables). | None found | HTML | Do not use. Verbs only, and no licence. |

Verdict on sites as a runtime validity check: none should be called from the game. The game has no backend (map notes), and the site terms either reserve rights or could not be read. They also add a network dependency. If the player disputes a word, the offline Hspell list is the arbiter, and the sites can be used by a human to check by hand.

## What was not done

- Hspell itself was not built or run (the build of downloaded code was blocked), so numbers use the generated Hunspell dictionary of Hspell 1.4. Expansion of Prefix letters follows the `PFX` rules in `he_IL.aff` as I parsed them. I did not cross-check against `hspell -l` output.
- I did not measure a Wikipedia or wordfreq-based frequency list, and did not download the full Wiktionary text.
- I could not read Morfix's and the Academy's terms pages (HTTP 403 for my fetcher), and did not try to get around the block. The Academy terms above come from a search summary.
- No legal review. The licence readings are mine.

## Sources

- Hspell 1.4 tarball: `http://hspell.sourceforge.net/hspell-1.4.tar.gz` (files `LICENSE`, `README`, `likelyerrors`, `spellinghints`); download page `https://hspell.sourceforge.net/download.html`.
- LibreOffice Hunspell dictionary generated from Hspell: `https://github.com/LibreOffice/dictionaries/tree/master/he_IL` (`he_IL.dic`, `he_IL.aff`, `README_he_IL.txt`).
- FrequencyWords: `https://github.com/hermitdave/FrequencyWords` (`LICENSE`, `content/2018/he/he_full.txt`).
- wordfreq: `https://github.com/rspeer/wordfreq` (`README.md`).
- Hebrew Wiktionary dumps: `https://dumps.wikimedia.org/hewiktionary/latest/`; dump licence: `https://dumps.wikimedia.org/legal.html`; main page: `https://he.wiktionary.org/wiki/עמוד_ראשי`.
- Milog: `http://milog.co.il/`.
- Morfix: `https://www.morfix.co.il/en/` (terms page returned 403); `https://en.wikipedia.org/wiki/List_of_Hebrew_dictionaries` (ownership, second-hand).
- Rav-Milim access conditions (second-hand): `https://library.yale.edu/eresources/access/access-milonrav-milim`.
- Academy of the Hebrew Language: `https://hebrew-academy.org.il/` and `https://maagarim.hebrew-academy.org.il` (both returned 403).
- Pealim: `https://www.pealim.com/`.
