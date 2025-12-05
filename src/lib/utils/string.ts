/**
 * String utility functions for product name normalization
 */

/**
 * Calculate Jaro-Winkler similarity between two strings
 * Returns a value between 0 and 1, where 1 means exact match
 */
export function jaroWinklerSimilarity(s1: string, s2: string): number {
  if (s1 === s2) return 1;
  if (s1.length === 0 || s2.length === 0) return 0;

  const matchWindow = Math.floor(Math.max(s1.length, s2.length) / 2) - 1;
  const s1Matches = new Array(s1.length).fill(false);
  const s2Matches = new Array(s2.length).fill(false);

  let matches = 0;
  let transpositions = 0;

  // Find matches
  for (let i = 0; i < s1.length; i++) {
    const start = Math.max(0, i - matchWindow);
    const end = Math.min(i + matchWindow + 1, s2.length);

    for (let j = start; j < end; j++) {
      if (s2Matches[j] || s1[i] !== s2[j]) continue;
      s1Matches[i] = true;
      s2Matches[j] = true;
      matches++;
      break;
    }
  }

  if (matches === 0) return 0;

  // Count transpositions
  let k = 0;
  for (let i = 0; i < s1.length; i++) {
    if (!s1Matches[i]) continue;
    while (!s2Matches[k]) k++;
    if (s1[i] !== s2[k]) transpositions++;
    k++;
  }

  // Jaro similarity
  const jaro =
    (matches / s1.length +
      matches / s2.length +
      (matches - transpositions / 2) / matches) /
    3;

  // Winkler modification: boost for common prefix
  let prefix = 0;
  for (let i = 0; i < Math.min(4, s1.length, s2.length); i++) {
    if (s1[i] === s2[i]) prefix++;
    else break;
  }

  return jaro + prefix * 0.1 * (1 - jaro);
}

/**
 * Remove Korean particles and common suffixes
 */
export function removeKoreanParticles(text: string): string {
  const particles = [
    "은", "는", "이", "가", "을", "를", "에", "에서", "으로", "로",
    "와", "과", "의", "도", "만", "까지", "부터", "처럼", "같이",
  ];

  let result = text;
  for (const particle of particles) {
    // Remove particle at the end of words
    const regex = new RegExp(`(\\S+)${particle}(?=\\s|$)`, "g");
    result = result.replace(regex, "$1");
  }

  return result;
}

/**
 * Normalize Korean text for comparison
 */
export function normalizeKorean(text: string): string {
  return text
    .normalize("NFC") // Normalize Unicode
    .toLowerCase()
    .replace(/\s+/g, "") // Remove all whitespace
    .replace(/[^\w가-힣]/g, ""); // Keep only alphanumeric and Korean
}

/**
 * Extract numbers from text (for model numbers)
 */
export function extractNumbers(text: string): string[] {
  const matches = text.match(/\d+/g);
  return matches || [];
}

/**
 * Check if text contains a brand name
 */
export function findBrandInText(text: string, brands: string[]): string | null {
  const lowerText = text.toLowerCase();
  for (const brand of brands) {
    if (lowerText.includes(brand.toLowerCase())) {
      return brand;
    }
  }
  return null;
}
