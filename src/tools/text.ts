/** Levenshtein edit distance between two strings. */
export const levenshtein = (a: string, b: string): number => {
  const rows = Array.from({ length: b.length + 1 }, (_, i) => [i]);

  for (let j = 0; j <= a.length; j++) rows[0][j] = j;

  for (let i = 1; i <= b.length; i++) {
    for (let j = 1; j <= a.length; j++) {
      rows[i][j] =
        b[i - 1] === a[j - 1]
          ? rows[i - 1][j - 1]
          : 1 + Math.min(rows[i - 1][j - 1], rows[i][j - 1], rows[i - 1][j]);
    }
  }

  return rows[b.length][a.length];
};

/**
 * The candidate closest to `word`, or undefined when nothing is close enough to
 * be worth putting in front of the user as a "did you mean".
 */
export const closest = (
  word: string,
  candidates: string[],
  maxDistance = 2,
): string | undefined => {
  let best: string | undefined;
  let bestDistance = maxDistance + 1;

  for (const candidate of candidates) {
    const distance = levenshtein(candidate, word);

    if (distance < bestDistance) {
      best = candidate;
      bestDistance = distance;
    }
  }

  return best;
};
