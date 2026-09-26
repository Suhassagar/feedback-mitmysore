/**
 * Deterministic Pseudo-Random Number Generator (PRNG) & Fisher-Yates Shuffle Utilities
 * Used to randomize question order and section category sequence uniquely for each student
 * based on their USN / session seed while remaining 100% stable across page refreshes.
 */

// Hash any string (USN, UUID, or Session ID) into a 32-bit positive integer seed with full avalanche dispersion
export function stringToSeed(str) {
  if (!str) return 123456789;
  let hash = 0;
  const s = String(str);
  for (let i = 0; i < s.length; i++) {
    const char = s.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash |= 0; // Convert to 32-bit integer
  }
  // 32-bit SplitMix32 / MurmurHash3 avalanche mixer:
  // Guarantees that even a 1-character difference in USN (e.g. 413 vs 414)
  // scatters completely across the 32-bit integer space from the very first draw.
  let h = hash >>> 0;
  h = Math.imul(h ^ (h >>> 16), 0x85ebca6b);
  h = Math.imul(h ^ (h >>> 13), 0xc2b2ae35);
  h = (h ^ (h >>> 16)) >>> 0;
  return h;
}

// Mulberry32 PRNG: returns a deterministic pseudo-random float [0, 1)
export function createPRNG(seed) {
  let s = Number(seed) >>> 0;
  return function() {
    let t = (s += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// Fisher-Yates Shuffle using a deterministic PRNG function
export function seededShuffle(array, prng) {
  if (!Array.isArray(array) || array.length <= 1) return [...(array || [])];
  const result = [...array];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(prng() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

/**
 * Jumble questions and section headings deterministically for a student
 * @param {Array} rawQuestions - List of question objects from API
 * @param {string} studentSeed - Unique seed string (e.g. USN + session_id)
 * @returns {Object} { groupedQuestions, orderedSections, flatShuffledQuestions }
 */
export function jumbleQuestionsForStudent(rawQuestions, studentSeed) {
  if (!Array.isArray(rawQuestions) || rawQuestions.length === 0) {
    return { groupedQuestions: {}, orderedSections: [], flatShuffledQuestions: [] };
  }

  const seed = stringToSeed(studentSeed);
  const prng = createPRNG(seed);

  // 1. Group questions by their raw heading
  const rawGrouped = {};
  rawQuestions.forEach((q) => {
    const heading = q.question_heading || "General Feedback";
    if (!rawGrouped[heading]) rawGrouped[heading] = [];
    rawGrouped[heading].push(q);
  });

  // 2. Shuffle the section category order itself
  const sectionHeadings = Object.keys(rawGrouped);
  const shuffledHeadings = seededShuffle(sectionHeadings, prng);

  // 3. Shuffle questions within each section category
  const jumbledGrouped = {};
  const orderedSections = [];
  const flatShuffledQuestions = [];

  shuffledHeadings.forEach((heading) => {
    const questionsInSection = seededShuffle(rawGrouped[heading], prng);
    jumbledGrouped[heading] = questionsInSection;
    orderedSections.push({
      heading,
      questions: questionsInSection,
    });
    flatShuffledQuestions.push(...questionsInSection);
  });

  return {
    groupedQuestions: jumbledGrouped,
    orderedSections,
    flatShuffledQuestions,
  };
}
