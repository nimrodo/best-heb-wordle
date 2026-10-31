# Hebrew Wordle

A Wordle-style word-guessing game in Hebrew, made for one player to enjoy as many puzzles per day as she likes.

## Language

**Puzzle**:
One round of the game: a hidden Solution and up to six Guesses to find it.
_Avoid_: Game, round, level

**Solution**:
The hidden five-letter Hebrew word a player is trying to find. Never a Prefix-attached form.
_Avoid_: Answer, target word, secret word

**Guess**:
A five-letter Hebrew word the player submits. Any valid word is accepted, including Prefix-attached forms.
_Avoid_: Attempt, try

**Prefix letter**:
One of the letters מ ש ה ו כ ל ב (אותיות השימוש) attached to the front of a word, as in לבית = ל + בית. A word that begins with one of these letters as part of its own spelling (לחם, כלב) is not Prefix-attached.
_Avoid_: Relation letter, clitic

**Prefix-attached form**:
A word that is a Prefix letter plus another word. Such forms are excluded from Solutions.
_Avoid_: Prefixed word

**Hard word**:
A Solution that is valid but uncommon, and is marked as such for the player.
_Avoid_: Rare word, advanced word

**Common word**:
A Solution frequent enough in everyday Hebrew that no warning is needed. The counterpart of a Hard word.
_Avoid_: Easy word

**Meaning**:
A short Hebrew definition of a Solution, shown after the Puzzle ends. Optional: a Solution without one is still valid.
_Avoid_: Definition, hint

**Streak**:
The number of Puzzles won in a row. A loss, including an abandoned Puzzle, resets it to zero. Not tied to days, since there is no daily Puzzle.
_Avoid_: Daily streak
