import { ProgrammingChallenge } from "./types";
import { JAVA_CHALLENGES } from "./java-challenges";
import { C_CHALLENGES } from "./c-challenges";
import { CPP_CHALLENGES } from "./cpp-challenges";
import { PYTHON_CHALLENGES } from "./python-challenges";

export * from "./types";

export const ALL_CHALLENGES: ProgrammingChallenge[] = [
  ...JAVA_CHALLENGES,
  ...C_CHALLENGES,
  ...CPP_CHALLENGES,
  ...PYTHON_CHALLENGES,
];

export function normalizeCourseSlug(course: string): "java" | "c" | "cpp" | "python" {
  const norm = (course || "").toLowerCase().trim();
  if (norm.includes("python") || norm === "py") return "python";
  if (norm.includes("cpp") || norm.includes("c++")) return "cpp";
  if (norm === "c" || norm.startsWith("c_") || norm.startsWith("c-")) return "c";
  if (norm.includes("java")) return "java";
  return "java";
}


/**
 * Returns all challenges defined for a given course and chapter order,
 * sorted sequentially by programIndex (Program A -> Program B -> Program C).
 */
export function getChallengesForChapter(
  course: string,
  chapterOrder: number
): ProgrammingChallenge[] {
  const normalized = normalizeCourseSlug(course);
  return ALL_CHALLENGES.filter(
    (c) => c.course === normalized && c.chapterOrder === chapterOrder
  ).sort((a, b) => a.programIndex - b.programIndex);
}

/**
 * Finds a specific challenge by its unique ID.
 */
export function getChallengeById(challengeId: string): ProgrammingChallenge | undefined {
  return ALL_CHALLENGES.find((c) => c.id === challengeId);
}

/**
 * Returns all challenges for a course track.
 */
export function getAllChallengesForCourse(course: string): ProgrammingChallenge[] {
  const normalized = normalizeCourseSlug(course);
  return ALL_CHALLENGES.filter((c) => c.course === normalized).sort(
    (a, b) => a.chapterOrder - b.chapterOrder || a.programIndex - b.programIndex
  );
}

/**
 * Returns the count of programming challenges in a specific chapter.
 */
export function getChapterChallengeCount(course: string, chapterOrder: number): number {
  return getChallengesForChapter(course, chapterOrder).length;
}

/**
 * Returns true if the chapter defines one or more programming challenges.
 */
export function hasChapterChallenges(course: string, chapterOrder: number): boolean {
  return getChapterChallengeCount(course, chapterOrder) > 0;
}
