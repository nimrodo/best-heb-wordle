# Detecting Prefix-attached forms

Ticket: #3. Question: how do we tell a Prefix-attached form (לבית = ל + בית) from a word that merely begins with a Prefix letter (לחם, כלב, שלום), so Solutions never include the former?

Researched 2026-10-31. Items are marked **[verified]** (I ran it or read the primary source myself) or **[inferred]** (my reasoning, not tested).

## Answer in brief

- Use **DictaBERT-joint's prefix-segmentation head** (`dicta-il/dictabert-joint`, CC BY 4.0) as the detector. It runs offline from Python via `uv`, on CPU, on single isolated words. On 92 hand-labelled words (33 Prefix-attached, 59 not) it made **0 errors** [verified]. That sample is small and was labelled by me, so treat the true error rate as unmeasured (see "Error rates").
- **Stanza Hebrew** also runs offline but was clearly worse: it missed 5 of 33 Prefix-attached forms and wrongly split 5 of 59 ordinary words [verified]. Its training data is CC BY-NC-SA, which is a licence risk [inferred for the model, verified for the treebank].
- **Hspell** has the right primary data (a lexicon with explicit prefix rules, `hspell -l` lists every prefix + word split) but is AGPL-3.0 including its dictionary and word lists, and I could not build or run it here [not verified by running].
- **YAP** is Apache-2.0 for code but needs a Go build, 6 GB RAM, and a separately licensed BGU/MILA lexicon whose production use needs the owner's permission. Not worth it [verified from README, not run].
- Hand curation is still needed for a short tail: words that are *both* a plain word and prefix + word (מכונה, כביש, מבנה...). No tool can decide those; it is a policy call per word.

## Candidate tools

| Tool | Licence | Offline from Python via `uv` | Prefix output | Run by me |
|---|---|---|---|---|
| DictaBERT-joint (`dicta-il/dictabert-joint`) | CC BY 4.0 (model card) | Yes. `uv add torch transformers huggingface_hub`; model snapshot 715 MB; `HF_HUB_OFFLINE=1` worked; needs `trust_remote_code=True` | `seg` split and `morph.prefixes` per token | Yes |
| Stanza `he` | Code Apache-2.0 (LICENSE file in stanfordnlp/stanza); model trained on UD Hebrew-HTB, which is CC BY-NC-SA 4.0 | Yes. `uv add stanza`; models 183 MB; the `mwt` processor splits prefixes into separate words | Multi-word-token expansion (prefix becomes its own word) | Yes |
| Hspell 1.4 | AGPL-3.0; README says dictionary files and generated word lists are AGPL too | C program plus Perl build, no PyPI package I found; invoke as a subprocess | `hspell -l` shows "the correct splits of the given word into prefix + word" (man page) | No: building downloaded source was blocked by this session's permission guard |
| YAP (OnlpLab) | Code Apache-2.0; BGU lexicon NOT Apache, contact owner for production use | No: Go 1.15 build, 6 GB RAM, REST service | Morphological lattice with segmentation | No |

Sources:
- DictaBERT model card and API metadata: https://huggingface.co/dicta-il/dictabert-joint (pinned revision `7b1256fc0846e22d1af431eae299e2dcecee2778`); paper arXiv 2403.06970.
- Stanza performance table (Hebrew HTB: tokens 99.98, words/MWT 92.29, UD 2.12): https://stanfordnlp.github.io/stanza/performance.html. UD Hebrew-HTB licence "CC BY-NC-SA 4.0": https://github.com/UniversalDependencies/UD_Hebrew-HTB.
- Hspell: README and `hspell.1` in `hspell-1.4.tar.gz` from https://hspell.sourceforge.net/ (sha256 `7310f5d5...abea3`, matches Homebrew's formula). Homebrew formula also records `AGPL-3.0-only`.
- YAP: https://github.com/OnlpLab/yap README, sections "Requirements" and "Licensing Highlights".

Not covered: other tools (e.g. a rules-only regex over a lexicon, spaCy/Trankit Hebrew models, Dicta's online API). The online API is out because the pipeline should run offline.

## Experiment

Method [verified]: each word was passed **alone** (no sentence context), because the real input is a word list. Prediction "Prefix-attached" = the tool splits the word into more than one piece. Gold labels are my own judgement of Hebrew and have not been reviewed by a native reader. Words that are genuinely ambiguous were labelled A and excluded from the error counts.

Set 1 (17 P + 29 N + 6 A) and set 2, a harder set of negatives that look like prefix + word (16 P + 30 N + 4 A). Both include the clear cases the ticket named: לבית (P), and לחם, כלב, שלום, הרבה (N, in set 1). Note that לחם, כלב, שלום, הרבה are 3-4 letters, so they are tests of the detector, not valid Solution lengths.

Scripts and raw outputs live in the session scratchpad, not in the repo. To reproduce: `uv add torch transformers huggingface_hub`, download the pinned revision, then call `model.predict([word], tokenizer, output_style="json")` and read `tokens[0]["seg"]`.

### Results (92 labelled words)

| Tool | Prefix-attached caught | Ordinary words wrongly split |
|---|---|---|
| DictaBERT-joint | 33 / 33 | 0 / 59 |
| Stanza `he` | 28 / 33 | 5 / 59 |

Stanza misses (Prefix-attached labelled as not): מבית, שהלך, בלילה, ללילה, מכלבו. Stanza false splits: מטבח (מ+טבח), מכתב (מ+כתב), מטוס (מ+טוס), בטחון (ב+טחון), הצבעה (ה+צבעה).

DictaBERT correctly handled stacked prefixes (מהבית -> מה + בית, ולכלב, שבבית), ו+ל+חם (ולחם -> ו + לחם), and kept לבנה, הלכה, מלחמה, מטבח, מכתב, כבשה whole.

The A set (מכונה, כביש, מבנה, שערה, מילה, כבשה, מדבר, שבות, כבוד, מבוא): DictaBERT left all whole; Stanza split only כביש (כ + ביש). Whether these count as Prefix-attached is a matter of policy, not detection.

## Error rates (what the sample does and does not tell us)

- Observed: DictaBERT 0 errors on 92 words. By the "rule of three", zero errors in 33 and 59 trials is still compatible with a true miss rate up to roughly 9% on Prefix-attached forms and 5% on ordinary words [inferred]. The sample is too small and too easy (and my labels are unreviewed) to claim better.
- For the game, the two error directions cost different things [inferred]: a missed Prefix-attached form breaks the Solution rule; a falsely flagged ordinary word only shrinks the pool slightly. So lean towards over-flagging, and send disagreements to a human.
- The Solution pool is probably a few thousand words, small enough that a person can skim the final list for anything that looks like a Prefix-attached form. That skim is the real safety net, not the detector's error rate.

## What needs hand curation

1. **Dual-reading words.** Words that are a valid word on their own and also prefix + valid word: מכונה (machine / מ+כונה), כביש, מבנה, שערה, כבשה, מדבר. Decide a rule once (suggestion [inferred]: keep the word if its unsplit form is a standard dictionary entry, which is what a lexicon like Hspell can tell you) and curate the list of exceptions by hand.
2. **Plural/construct and possessive forms with prefixes** (למשפט-type words are caught; things like מכלבו passed on Dicta but missed by Stanza, so check any word ending in a possessive suffix).
3. **Proper nouns and loan words** starting with a Prefix letter (שלום as a name, מגדל, כנסת). Neither tool is specifically tuned to these in isolation; none misfired in the sample [verified], but the sample had very few.
4. **The final Solution list**, once, by eye.

## Caveats

- Remote code: DictaBERT's loader runs Python from the model repo (`trust_remote_code=True`). I read the four `.py` files, found only torch/transformers imports and no network, subprocess, `exec` or `eval`, and pinned the revision, but the user should pin the revision in the prep script too [verified for that revision].
- The model decides from context-free single words. Isolated words are out of distribution for a model trained on sentences [inferred]; the results above show it holds up on this sample, but a bigger audit is worthwhile.
- Hspell's AGPL covers its word lists. If the Solution list were derived *from* Hspell's lexicon, it could be encumbered; using Hspell only as a classifier over a different word source is a different question and was not investigated [inferred].
- DictaBERT CC BY 4.0 requires attribution only; classifying words with it does not appear to restrict the output list [inferred].
