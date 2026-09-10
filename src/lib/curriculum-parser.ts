/**
 * KnowledgeStream AI — Isomorphic Curriculum Parser
 * 
 * Provides unified markdown stripping, lesson title extraction, sequential
 * progression gating, and first-uncompleted-lesson resume logic across
 * C, C++, Java, and Python courses.
 * 
 * Safe for both Client Components and Server-Side execution.
 */

/**
 * Strips markdown symbols, code fences, badges, and mermaid graphs from text.
 */
export function stripMarkdown(md: string): string {
  if (!md) return "";
  return md
    .replace(/[#*`>_\-]/g, "")
    .replace(/\[!NOTE\]/gi, "Note:")
    .replace(/\[!TIP\]/gi, "Tip:")
    .replace(/\[!IMPORTANT\]/gi, "Important:")
    .replace(/\[!WARNING\]/gi, "Warning:")
    .replace(/\[!CAUTION\]/gi, "Caution:")
    .replace(/\[.*?\]\(.*?\)/g, "")
    .replace(/\|.*?\|/g, "")
    .replace(/```[\s\S]*?```/g, "")
    .replace(/graph (TD|LR)[\s\S]*?/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Extracts clean, sequential lesson titles from chapter markdown content.
 * 
 * Features:
 * - Supports heading levels 1 to 5 (`#{1,5}`) to seamlessly handle C++ `#####` headings.
 * - Prioritizes primary chapter sections and filters out nested subheadings.
 * - Excludes quizzes, tier headers, chapter summaries, and interview Q&A blocks.
 */
export function extractLessonTitles(content: string, chapterOrder?: number): string[] {
  if (!content || !content.trim()) return [];

  const levels: Record<number, string[]> = { 2: [], 3: [], 4: [], 5: [] };
  const lines = content.split("\n");

  for (const line of lines) {
    const m = line.match(/^\s{0,3}(#{2,5})\s+(.+)/);
    if (!m) continue;
    const level = m[1].length;
    const raw = m[2].trim();
    const title = stripMarkdown(raw).trim();

    if (
      title &&
      /^\d+(?:\.\d+)*[.)]?\s+/.test(title) &&
      !/^quiz( assessment)?$/i.test(title) &&
      !/^chapter assessment/i.test(title) &&
      !/^by the end of this chapter/i.test(title) &&
      !/^tier \d+/i.test(title) &&
      !/interview question/i.test(title) &&
      !/^practice and evaluation/i.test(title) &&
      !/^coding exercises/i.test(title)
    ) {
      if (levels[level]) {
        levels[level].push(title);
      }
    }
  }

  // 1. If chapterOrder is provided (> 0), check for level matching `${chapterOrder}.\\d+`
  // (e.g. C++ Chapter 1: 1.1, 1.2; C Chapter 8: 8.1, 8.2)
  if (typeof chapterOrder === "number" && chapterOrder > 0) {
    const prefixRegex = new RegExp(`^${chapterOrder}\\.\\d+`);
    for (const lvl of [2, 3, 5, 4]) {
      const matching = levels[lvl].filter((t) => prefixRegex.test(t));
      if (matching.length >= 2) {
        return Array.from(new Set(matching));
      }
    }
  }

  // 2. C++ specific: level 5 has numbered topics, while levels 2 and 3 do not
  if (levels[5].length >= 3 && levels[3].length === 0 && levels[2].length === 0) {
    return Array.from(new Set(levels[5]));
  }

  // 3. Java, Python, and modern C: level 3 has numbered topics
  if (levels[3].length >= 2) {
    return Array.from(new Set(levels[3]));
  }

  // 4. Early C chapters: level 2 has numbered topics
  if (levels[2].length >= 2) {
    return Array.from(new Set(levels[2]));
  }

  // 5. C++ fallback if level 5 has topics
  if (levels[5].length >= 2) {
    return Array.from(new Set(levels[5]));
  }

  // 6. Generic fallback across candidate levels
  for (const lvl of [3, 2, 5, 4]) {
    if (levels[lvl].length > 0) {
      return Array.from(new Set(levels[lvl]));
    }
  }

  return [];
}

/**
 * Returns the FIRST uncompleted lesson in sequential curriculum order.
 * Ensures the student cannot skip ahead past incomplete prerequisites.
 * 
 * If all lessons are completed, returns the last lesson (or lessons[0]).
 */
export function getFirstUncompletedLesson(
  lessons: string[],
  completedLessons: Set<string> | string[] | Record<string, any>
): string | null {
  if (!lessons || lessons.length === 0) return null;

  let completedSet: Set<string>;
  if (completedLessons instanceof Set) {
    completedSet = completedLessons;
  } else if (Array.isArray(completedLessons)) {
    completedSet = new Set(completedLessons);
  } else if (completedLessons && typeof completedLessons === "object") {
    const mastered = Object.entries(completedLessons)
      .filter(([_, v]) => v?.status === "MASTERED" || v?.status === "PRACTICED" || v === true)
      .map(([k]) => k);
    completedSet = new Set(mastered);
  } else {
    completedSet = new Set();
  }

  const firstUncompleted = lessons.find((l) => !completedSet.has(l));
  return firstUncompleted || null;
}

/**
 * Gating function: Topic at `topicIndex` is unlocked iff:
 * - `topicIndex === 0`, OR
 * - ALL previous topics (0 to topicIndex - 1) have been completed.
 */
export function isLessonUnlocked(
  topicIndex: number,
  lessons: string[],
  completedLessons: Set<string> | string[] | Record<string, any>
): boolean {
  if (topicIndex <= 0) return true;
  if (!lessons || topicIndex >= lessons.length) return false;

  let completedSet: Set<string>;
  if (completedLessons instanceof Set) {
    completedSet = completedLessons;
  } else if (Array.isArray(completedLessons)) {
    completedSet = new Set(completedLessons);
  } else if (completedLessons && typeof completedLessons === "object") {
    const mastered = Object.entries(completedLessons)
      .filter(([_, v]) => v?.status === "MASTERED" || v?.status === "PRACTICED" || v === true)
      .map(([k]) => k);
    completedSet = new Set(mastered);
  } else {
    completedSet = new Set();
  }

  for (let i = 0; i < topicIndex; i++) {
    const prev = lessons[i];
    if (prev === "Quiz Assessment") continue;
    if (!completedSet.has(prev)) {
      return false;
    }
  }

  return true;
}
