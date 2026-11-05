"""CC-100 web-text counts: a second frequency source for the Solution pool.

OpenSubtitles under-counts written vocabulary and place names, so a word with
enough CC-100 hits is admitted as a Solution even under the subtitle cut-off.
CC-100 is web text (spam, adult content), so an admitted word must also have
passed the `nimble` screening (`wordlists-screening`). Counts come from
eyaler/hebrew_wordlists, `cc100_intersect_with_fatverb.csv`: `word,count` rows.
"""

from collections import Counter
from collections.abc import Mapping

from wordlists.guesses import HEBREW_WORD, normalise

# Default; the CLI can override it (--cc100-min-hits).
CC100_MIN_HITS = 5000
# Default; the CLI can override it (--screening-min-prob).
SCREENING_MIN_PROB = 0.05


def cc100_counts(text: str) -> Counter[str]:
    """Hits per normalised word, summed over final-letter forms."""
    counts: Counter[str] = Counter()
    for line in text.splitlines():
        word, _, count = line.partition(",")
        if HEBREW_WORD.fullmatch(word) and count.isdigit():
            counts[normalise(word)] += int(count)
    return counts


def cc100_pool(counts: Mapping[str, int], min_hits: int) -> set[str]:
    """Words frequent enough in CC-100 to be considered, before screening."""
    return {word for word, hits in counts.items() if hits >= min_hits}


def cc100_admitted(
    pool: set[str], screening: Mapping[str, float], min_prob: float
) -> set[str]:
    """Pool words that passed screening; one with no score is not admitted."""
    return {word for word in pool if screening.get(word, 0.0) >= min_prob}
