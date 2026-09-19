// === DETECTION FOLD — ADR-0006 ===
//
// This module has zero imports from project code, deliberately. It sits at
// the same level as integrity.ts in the dependency DAG: a leaf that the
// scanner imports and that imports nothing.
//
// The problem it exists for: TOBIRA patterns matched raw code units, but the
// consumer of the same paste is a language model, and the two disagree about
// what the text says. A single invisible character defeated the registry —
// "ig<U+200B>nore previous instructions" fired nothing and was not blocked,
// while the model reads it as "ignore previous instructions".
//
// The fold is what the model effectively reads. The ORIGINAL is what gets
// attested: audit.ts hash-chains raw content, MAX_INPUT_CHARS is enforced
// against raw length in gate(), and nothing here touches either. Do not
// route the fold into the audit trail, the hash chain, or a length check.

// Unicode general category Cf (format). Covers U+200B ZWSP, U+200C ZWNJ,
// U+200D ZWJ, U+FEFF BOM, U+2060 word joiner, U+200E/200F directional marks,
// and U+00AD soft hyphen — which is Cf itself and needs no special case.
// Verified against the runtime rather than assumed from the Unicode tables.
const FORMAT_CHARS = /\p{Cf}/gu

/**
 * Reduce input to the form a language model effectively reads.
 *
 * Removal runs BEFORE normalization, and the order is load-bearing:
 * `e` + U+200B + U+0301 composes to `é` only if the ZWSP is gone before
 * NFKC runs. Normalizing first leaves the combining mark stranded.
 *
 * NFKC rather than NFC because NFC leaves compatibility forms distinct, so
 * fullwidth `ｉｇｎｏｒｅ` would still evade. NFKC is lossy in ways that are
 * acceptable for matching precisely because the caller retains the original.
 *
 * Note: this can LENGTHEN the input — NFKC expands U+FB01 `ﬁ` to two
 * characters. Never derive a length check from the result.
 *
 * Idempotent: fold(fold(x)) === fold(x). The first pass leaves no format
 * characters to remove and NFKC is itself idempotent.
 */
export function fold(input: string): string {
  return input.replace(FORMAT_CHARS, '').normalize('NFKC')
}

/**
 * True when folding changes the input — i.e. the raw text and the text the
 * model reads are not the same string.
 *
 * This is not itself a verdict. Benign content legitimately contains format
 * characters and compatibility forms, so this must not be wired to a TOBIRA
 * on its own. It exists so that a caller can record the divergence.
 */
export function foldDiverges(input: string): boolean {
  return fold(input) !== input
}
