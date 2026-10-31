# Sources for word meanings (issue #4)

Question: can the game show a short meaning after a Puzzle, especially for a Hard word? Which sources offer Hebrew definitions of single words, under what terms, in what format, and with what coverage of 5-letter words?

Researched 2026-10-31. "Verified" means I read it on the owner's page or measured it from downloaded data. "Inferred" means my reasoning, not a source statement. This is not legal advice.

## Answer in brief

- Yes, feasible, but only with one source: **Hebrew Wiktionary** (CC BY-SA 4.0, bulk dump, no API needed). Every other Hebrew dictionary site checked forbids copying, bulk use or commercial use.
- Hebrew Wiktionary has about 2,900 5-letter entries with a usable definition. Coverage of an actual Solution list is unmeasured because no Solution list exists yet (see "Coverage").
- Plan on a **fallback**: when a Solution has no stored meaning, show none (or a link out). Do not make meanings a hard requirement per Solution. Hard words are the weakest-covered group (inferred).
- Attribution plus share-alike apply to the stored definition data. Keep the definitions file separate from app code and licence that file CC BY-SA 4.0 (inferred application of the terms).

## Candidate sources

| Source | Terms (verified) | Bulk/API | Store and show in a free web app? | Format |
|---|---|---|---|---|
| Hebrew Wiktionary (ויקימילון) | Text under CC BY-SA 4.0 | Full dumps, no key | Yes, with attribution and share-alike | MediaWiki XML wikitext |
| Wikidata Hebrew lexemes | Lexeme namespace is CC0 | SPARQL and dumps | Yes, no conditions | RDF/JSON, short glosses |
| Academy of the Hebrew Language dictionary | Non-commercial study/research only; commercial use needs written permission | No API or download found | No (not without written permission) | Web pages |
| Academy Ma'agarim (historical dictionary corpus) | Same terms, plus mandatory credit | Texts purchasable for research only | No | Quotations corpus, not definitions |
| Morfix (Melingo) | Copying, public display and word-list runs forbidden | Forbidden explicitly | No | Web pages |
| Milog (מילוג) | All rights reserved, no copying without written consent | Crawlers forbidden; terms mention an "API" but I found no public API doc | No, without consent | Web pages |
| Open Multilingual Wordnet, Hebrew | Licence listed as "wordnet" | Download | Too small to help | Synsets, English-oriented |

### Hebrew Wiktionary (recommended)

- Licence, verified on a live entry footer (he.wiktionary.org/wiki/סוגיה): "הטקסט מוגש בכפוף לרישיון Creative Commons ייחוס-שיתוף זהה 4.0; ייתכן שישנם תנאים נוספים". Wikimedia Terms of Use section 7 (foundation.wikimedia.org/wiki/Policy:Terms_of_Use) confirms: CC BY-SA 4.0 and GFDL, commercial reuse allowed, reusers must credit the authors and follow the licence; credit can be a link to the article or a link to a stable copy that lists authors; modified text must say changes were made and carry a licence notice; facts can be reused without attribution.
- Obligations, if the app shows definitions: show a credit such as "ההגדרה מתוך ויקימילון, CC BY-SA 4.0" with a link to the entry (the entry URL is derivable from the Solution) and to the licence. Keep any shortening marked as a change. Share-alike covers the adapted definitions file (inferred). Whether it reaches the app code is a legal question; keeping code and data separate is the cautious choice (inferred).
- Format and access, verified: `https://dumps.wikimedia.org/hewiktionary/latest/hewiktionary-latest-pages-articles.xml.bz2`, 14.4 MB (1 Oct 2026 snapshot), checks out with `bzip2 -t`. Entries are wikitext. Definitions are lines starting `#`, often with templates such as `{{רובד|...}}` (register/period), `{{משלב|סלנג}}`, `{{הקשר|...}}`, and wiki links `[[...]]`. These must be cleaned for display.
- Coverage, measured from that dump (ns 0 pages, titles stripped of niqqud, exactly 5 Hebrew letters):

| Count | What |
|---|---|
| 31,185 | main-namespace pages in the whole dictionary |
| 3,676 | 5-letter Hebrew titles |
| 3,505 | of those with at least one `#` definition line |
| 2,885 | of those, with a real definition after dropping redirects `הפניה X` (alternate spellings) |
| 2,678 | of those, whose first definition is 15 or more characters after cleaning |

  Median first-definition length is 46 characters, so most are display-ready as one line. Some are short synonym glosses ("חתול."), a few include etymology prose or a `{{פירוש לקוי}}` (incorrect-meaning) template, so a filter and a manual review of Hard words is needed.
- Sample quality, verified by reading 10 random entries: reasonable one-line Hebrew glosses (ארומה, גוררת, מסרון, התחפש). Some entries mix several periods (המקרא, לשון חז"ל, עברית חדשה), so picking the right sense for a single Solution needs a rule such as first definition without a historical-period tag.
- Inflected forms: I did not measure how many of the 5-letter titles are inflections of other lemmas versus lemmas. Unmeasured.

### Wikidata Hebrew lexemes (supplement)

- Licence, verified (wikidata.org/wiki/Wikidata:Licensing): structured data including the Lexeme namespace is CC0 / public domain. No attribution required.
- Measured via the public query service on 2026-10-31: 29,629 Hebrew lexemes, of which 6,173 senses carry a Hebrew gloss. Distinct lemmas with a Hebrew gloss: 5,998, of which 1,363 are 5-letter. 782 of those 1,363 overlap with Hebrew Wiktionary entries that have real definitions, so only 581 would be additions.
- Glosses are very short and sometimes uninformative (seen: "מין של צמח", "שמקומו אינו ידוע"). Use only as a last-resort fallback. Union with Wiktionary would reach about 3,466 distinct 5-letter words (computed: 2,885 + 581).

### Academy of the Hebrew Language

- Site terms, read on hebrew-academy.org.il/תנאי-שימוש: copyright reserved; use "מותר לצורכי עיון, לימוד ומחקר"; "אין לעשות שימוש מסחרי בתכנים אלא ברשות בכתב"; every publication must credit the Academy site and the specific database.
- The Hebrew-Hebrew dictionary page (hebrew-academy.org.il/הסבר-על-המילון/, 2022) describes dictionary definitions, grammar details, usage notes and phrases, "in development, updated from time to time". I found no download, API or bulk licence offer.
- Ma'agarim terms, read on maagarim.hebrew-academy.org.il (תנאי השימוש): all rights reserved, use for study and research, no commercial use without written permission, must credit the Historical Dictionary Project. Full texts can be purchased for research or other non-commercial purposes. It is a corpus of quotations, not a word-to-meaning table.
- Consequence: a free app is arguably non-commercial, but the terms grant use "for study and research", not redistribution of a stored dataset or display in a public app. Treat it as unavailable unless the Academy gives written permission (maagarim@hebrew-academy.org.il is the contact on that page). Whether a free web app counts as permitted use is a question only the Academy can answer.
- Note: the Academy site returns HTTP 403 to plain fetch tools; I read it in a real browser session.

### Morfix

Terms read at morfix.co.il/en/info/termsofuse. All dictionary content is Melingo's; it is "forbidden to copy or display in public the contents", and "forbidden to run lists of words through Morfix dictionaries, whether by using a computer program or manually, and to produce files, lists or any kind of databases". Information extraction systems are forbidden. Verdict: do not use. It is also primarily a Hebrew-English dictionary.

### Milog

Terms read at milog.co.il (תנאי השימוש של מילוג): content is copyright of Milog; no copying or reorganising "ללא הסכמה מראש ובכתב"; spiders and crawlers forbidden except for search-engine indexing. Its footer says only the Wikipedia quotations are CC BY-SA 3.0. The terms mention access "via API" but I found no public API documentation, so I could not verify any API terms. Verdict: do not use without written consent. Links out to the entry are allowed in practice, but I did not verify a linking policy.

### Others briefly

- Open Multilingual Wordnet Hebrew (omwn.org): 5,325 words, 6,872 senses, licence label "wordnet". Far too small to cover 5-letter words. Not investigated further.
- Pealim.com: a verb-conjugation site; its about page states no licence or reuse terms. Not a definitions source. Not pursued.
- Rav-Milim / Even-Shoshan and the Ben-Yehuda dictionary: not verified (rav-milim.co.il did not resolve from here). Even-Shoshan is a commercial dictionary (inferred, not checked), so assume unavailable.

## Coverage: what is verified and what is not

- Verified: counts above, from the Wiktionary dump and Wikidata query service, as of 2026-10-31.
- Not available: coverage of the real Solution list. There is no Solution list in the repo yet, and the Hard-word list is not defined. I did not measure any independent list. I tried to obtain the hspell word list as a reference but the build was blocked, so I have no independent estimate of how many 5-letter words exist.
- Inferred: Wiktionary has 3,676 5-letter headwords. If the final Solution list draws common words from a larger frequency list, coverage of common Solutions is likely high and of Hard words likely lower, because Wiktionary entries skew to well-known words and many rare words lack pages. Verify by intersecting the real Solution list with `real.json`-style extraction once the list exists.

## Recommendations for the design

1. Show a meaning after a Puzzle when one exists; show nothing extra when it does not. Do not design the screen to require it.
2. Source: Hebrew Wiktionary, preprocessed offline into a small JSON map (Solution to cleaned first definition, entry URL). The user's Python and `uv` workflow fits this. A 5-letter-only map is on the order of 3,000 entries (tens of KB).
3. Pick the display sense by a rule (first definition without a historical-period tag, at most one line) and review the Hard words by hand.
4. Show attribution and licence link next to every definition; ship the definitions file under CC BY-SA 4.0.
5. Optional: Wikidata glosses (CC0) as a thin fallback; ask the Academy for written permission only if the Wiktionary coverage of Hard words proves too thin.

## Open questions for the owner

- Are Solutions with no meaning acceptable, or should the Solution list be restricted to words that have a definition?
- Is a link out to the Academy or Milog entry (no copying) good enough as a fallback for missing meanings?
