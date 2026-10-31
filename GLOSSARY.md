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
