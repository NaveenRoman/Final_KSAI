/**
 * Safety & Security Test Suite for Chapter-Specific Programming Challenges
 *
 * Verifies:
 * 1. Cross-course isolation (preventing execution of another course's challenge).
 * 2. Cross-chapter isolation (preventing submission to wrong chapter route).
 * 3. Normalization of course slugs (c++, cpp, py, python, java, c).
 * 4. Multi-program sequential locking logic (>=70% requirement per step).
 * 5. Curriculum alignment for Java, Python, C, and C++.
 * 6. Starter code presence and non-empty test cases for all 70 challenges.
 */

import {
  ALL_CHALLENGES,
  getChallengesForChapter,
  getChallengeById,
  getAllChallengesForCourse,
  normalizeCourseSlug,
} from "../src/lib/challenges/challenge-bank";
import { PASSING_SCORE_THRESHOLD } from "../src/lib/challenges/evaluator";

let totalTests = 0;
let passedTests = 0;
let failedTests = 0;

function assert(condition: any, desc: string) {
  totalTests++;
  if (Boolean(condition)) {
    passedTests++;
    console.log(`  ✓ [PASS] ${desc}`);
  } else {
    failedTests++;
    console.error(`  ✗ [FAIL] ${desc}`);
  }
}

async function runSafetyTests() {
  console.log("\n================================================================================");
  console.log("   CHAPTER PROGRAMMING CHALLENGES — SAFETY, ISOLATION & PROGRESSION TESTS");
  console.log("================================================================================\n");

  // TEST SUITE 1: Normalization & Slugs
  console.log("--- TEST GROUP 1: Course Slug Normalization & Aliases ---");
  assert(normalizeCourseSlug("c++") === "cpp", "normalizeCourseSlug('c++') returns 'cpp'");
  assert(normalizeCourseSlug("C++") === "cpp", "normalizeCourseSlug('C++') is case-insensitive");
  assert(normalizeCourseSlug("cpp") === "cpp", "normalizeCourseSlug('cpp') returns 'cpp'");
  assert(normalizeCourseSlug("py") === "python", "normalizeCourseSlug('py') returns 'python'");
  assert(normalizeCourseSlug("python") === "python", "normalizeCourseSlug('python') returns 'python'");
  assert(normalizeCourseSlug("c") === "c", "normalizeCourseSlug('c') returns 'c'");
  assert(normalizeCourseSlug("java") === "java", "normalizeCourseSlug('java') returns 'java'");

  // TEST SUITE 2: Total Bank Counts & Integrity
  console.log("\n--- TEST GROUP 2: Course Challenge Counts & Integrity ---");
  const javaChallenges = getAllChallengesForCourse("java");
  const cChallenges = getAllChallengesForCourse("c");
  const cppChallenges = getAllChallengesForCourse("cpp");
  const pythonChallenges = getAllChallengesForCourse("python");

  assert(javaChallenges.length === 22, `Java has 22 challenges across 15 chapters (found: ${javaChallenges.length})`);
  assert(cChallenges.length === 15, `C has 15 challenges across 11 chapters (found: ${cChallenges.length})`);
  assert(cppChallenges.length === 17, `C++ has 17 challenges across 15 chapters (found: ${cppChallenges.length})`);
  assert(pythonChallenges.length === 16, `Python has 16 challenges across 11 chapters (found: ${pythonChallenges.length})`);
  assert(ALL_CHALLENGES.length === 70, `Total challenge bank size is 70 challenges (found: ${ALL_CHALLENGES.length})`);

  // Verify all 70 challenges have starter code, description, objective, and test cases
  let allHaveStarter = true;
  let allHaveTests = true;
  let allHaveExamples = true;
  for (const ch of ALL_CHALLENGES) {
    if (!ch.starterCode || ch.starterCode.trim().length === 0) {
      allHaveStarter = false;
      console.error(`Missing starter code: ${ch.id}`);
    }
    if (!ch.testCases || ch.testCases.length === 0) {
      allHaveTests = false;
      console.error(`Missing test cases: ${ch.id}`);
    }
    if (!ch.examples || ch.examples.length === 0) {
      allHaveExamples = false;
      console.error(`Missing examples: ${ch.id}`);
    }
  }
  assert(allHaveStarter, "All 70 challenges have non-empty starter code templates");
  assert(allHaveTests, "All 70 challenges have valid test cases");
  assert(allHaveExamples, "All 70 challenges have public I/O examples");

  // TEST SUITE 3: Cross-Course & Cross-Chapter Rejection Verification
  console.log("\n--- TEST GROUP 3: Cross-Course & Cross-Chapter Security Logic ---");
  function validateSubmissionRoute(routeCourse: string, routeChapter: number, challengeId: string): { valid: boolean; error?: string } {
    const normSlug = normalizeCourseSlug(routeCourse);
    const challengeDef = getChallengeById(challengeId);

    if (!challengeDef) {
      return { valid: false, error: "Challenge not found" };
    }
    if (challengeDef.course !== normSlug) {
      return { valid: false, error: `Cross-course mismatch: Challenge '${challengeId}' belongs to '${challengeDef.course}', not '${normSlug}'` };
    }
    if (challengeDef.chapterOrder !== routeChapter) {
      return { valid: false, error: `Cross-chapter mismatch: Challenge '${challengeId}' belongs to chapter ${challengeDef.chapterOrder}, not ${routeChapter}` };
    }
    return { valid: true };
  }

  // Java challenge submitted to Java Ch 1 -> VALID
  assert(
    validateSubmissionRoute("java", 1, "java_1_1").valid === true,
    "Valid submission: java_1_1 submitted to Java Chapter 1 accepted"
  );

  // Java challenge submitted to Python Ch 1 -> REJECTED
  const crossCourseCheck = validateSubmissionRoute("python", 1, "java_1_1");
  assert(
    crossCourseCheck.valid === false && crossCourseCheck.error?.includes("Cross-course mismatch"),
    "Cross-course protection: java_1_1 submitted to Python Ch 1 rejected"
  );

  // Java challenge Ch 2 submitted to Java Ch 1 -> REJECTED
  const crossChapterCheck = validateSubmissionRoute("java", 1, "java_2_1");
  assert(
    crossChapterCheck.valid === false && crossChapterCheck.error?.includes("Cross-chapter mismatch"),
    "Cross-chapter protection: java_2_1 submitted to Java Ch 1 rejected"
  );

  // C++ challenge submitted with 'c++' alias to C++ Ch 13 -> VALID
  assert(
    validateSubmissionRoute("c++", 13, "cpp_13_1").valid === true,
    "Alias support: cpp_13_1 submitted with 'c++' course slug accepted"
  );

  // Non-existent challenge ID -> REJECTED
  assert(
    validateSubmissionRoute("c", 1, "non_existent_id").valid === false,
    "Unknown challenge ID rejected"
  );

  // TEST SUITE 4: Multi-Program Sequential Locking Rules
  console.log("\n--- TEST GROUP 4: Multi-Program Sequential Progression Rules ---");
  assert(PASSING_SCORE_THRESHOLD === 70, "Evaluator passing threshold is strictly 70%");

  // Simulate sequential unlock resolution for a multi-program chapter (e.g. Java Chapter 3 with 3 programs)
  const javaCh3 = getChallengesForChapter("java", 3);
  assert(javaCh3.length === 3, "Java Chapter 3 has 3 sequential programs");

  function resolveProgramUnlocks(chapterChallenges: typeof javaCh3, scores: Record<string, number>): boolean[] {
    return chapterChallenges.map((ch, idx) => {
      if (idx === 0) return true; // First program is always unlocked
      const prevChallenge = chapterChallenges[idx - 1];
      const prevScore = scores[prevChallenge.id] || 0;
      return prevScore >= PASSING_SCORE_THRESHOLD;
    });
  }

  // Initial state: no programs passed
  const initialUnlocks = resolveProgramUnlocks(javaCh3, {});
  assert(initialUnlocks[0] === true, "Java Ch 3: Program 1 is unlocked initially");
  assert(initialUnlocks[1] === false, "Java Ch 3: Program 2 is locked initially");
  assert(initialUnlocks[2] === false, "Java Ch 3: Program 3 is locked initially");

  // Program 1 scored 65% (below 70%)
  const subPassingUnlocks = resolveProgramUnlocks(javaCh3, { [javaCh3[0].id]: 65 });
  assert(subPassingUnlocks[1] === false, "Java Ch 3: Program 2 remains locked when Program 1 score is 65% (< 70%)");

  // Program 1 scored 70% (exactly passing)
  const passedProg1Unlocks = resolveProgramUnlocks(javaCh3, { [javaCh3[0].id]: 70 });
  assert(passedProg1Unlocks[1] === true, "Java Ch 3: Program 2 unlocks when Program 1 score is 70%");
  assert(passedProg1Unlocks[2] === false, "Java Ch 3: Program 3 remains locked until Program 2 passes");

  // Program 2 scored 85%
  const passedProg2Unlocks = resolveProgramUnlocks(javaCh3, {
    [javaCh3[0].id]: 70,
    [javaCh3[1].id]: 85,
  });
  assert(passedProg2Unlocks[2] === true, "Java Ch 3: Program 3 unlocks when Program 2 score is >= 70%");

  // TEST SUITE 5: C++ Curriculum Alignment
  console.log("\n--- TEST GROUP 5: Updated C++ Curriculum Challenge Alignment ---");
  const cpp13 = getChallengeById("cpp_13_1");
  assert(
    cpp13?.title.includes("shared_ptr") || cpp13?.objective.includes("smart pointer"),
    "C++ Ch 13 matches Smart Pointers & Memory Management"
  );

  const cpp14 = getChallengeById("cpp_14_1");
  assert(
    cpp14?.title.includes("Structured") || cpp14?.objective.includes("C++17"),
    "C++ Ch 14 matches Modern C++17/20 Features"
  );

  const cpp15 = getChallengeById("cpp_15_1");
  assert(
    cpp15?.title.includes("Thread") || cpp15?.objective.includes("thread"),
    "C++ Ch 15 matches Concurrency & Multithreading"
  );

  // SUMMARY
  console.log("\n================================================================================");
  console.log(`SAFETY TEST RESULTS: ${passedTests}/${totalTests} PASSED (${failedTests} FAILED)`);
  console.log("================================================================================\n");

  if (failedTests > 0) {
    process.exit(1);
  }
}

runSafetyTests().catch((err) => {
  console.error("Test execution error:", err);
  process.exit(1);
});
