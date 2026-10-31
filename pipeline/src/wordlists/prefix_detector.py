"""Flag Prefix-attached forms with DictaBERT-joint's prefix-segmentation head.

Each word is judged alone, since the input is a word list, not sentences.
A word is flagged when the model splits it into more than one piece. That
over-flags on purpose: a missed Prefix-attached form breaks the Solution rule,
while a false flag only shrinks the pool.
"""

MODEL = "dicta-il/dictabert-joint"
# Pinned because the model repo ships Python that `trust_remote_code` runs.
REVISION = "7b1256fc0846e22d1af431eae299e2dcecee2778"
BATCH_SIZE = 256


def detect_prefix_attached(words: list[str]) -> set[str]:
    from transformers import AutoModel, AutoTokenizer

    tokenizer = AutoTokenizer.from_pretrained(MODEL, revision=REVISION)
    model = AutoModel.from_pretrained(MODEL, revision=REVISION, trust_remote_code=True)
    model.eval()
    flagged: set[str] = set()
    for start in range(0, len(words), BATCH_SIZE):
        batch = words[start : start + BATCH_SIZE]
        # One "sentence" per word, so each result holds exactly one token.
        for word, result in zip(
            batch, model.predict(batch, tokenizer, output_style="json"), strict=True
        ):
            if len(result["tokens"][0]["seg"]) > 1:
                flagged.add(word)
    return flagged
