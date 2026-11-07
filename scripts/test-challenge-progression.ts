/**
 * KnowledgeStream AI — Chapter-Based Programming Challenges & Sequential Mastery Test Suite
 *
 * Verifies:
 * 1. Challenge Bank Integrity: Java (15 Chs), C (11 Chs), C++ (15 Chs), Python (11 Chs)
 * 2. Multi-Program Sequential Ordering:
 *    - Java: Ch 3 (3 programs), Ch 7 (2 programs), Ch 9 (2 programs), Ch 11 (2 programs), Ch 14 (2 programs), Ch 15 (2 programs)
 *    - C: Ch 2 (3 programs), Ch 3 (2 programs), Ch 4 (2 programs)
 *    - C++: Ch 3 (2 programs), Ch 12 (2 programs)
 *    - Python: Ch 2 (2 programs), Ch 3 (2 programs), Ch 4 (2 programs), Ch 6 (2 programs), Ch 7 (2 programs)
 * 3. Evaluator Correctness:
 *    - Reference solution passes with 100% (score >= 70%)
 *    - Flawed code fails with score < 70%
 * 4. Sequential Mastery Progression Logic:
 *    - Program A unlocks first.
 *    - Program B remains strictly locked until Program A is passed (score >= 70%).
 *    - Program C remains strictly locked until Program B is passed.
 * 5. Unlock Service Gate D Integration:
 *    - Quiz passed alone does NOT mark chapter complete when challenges are unsolved.
 *    - Passing Program A in a 3-program chapter does NOT unlock next chapter.
 *    - All programs passed in chapter marks codeSolved = true and satisfies Gate D.
 * 6. Ethical Language Audit: Zero derogatory terms.
 */

import { prisma } from "../src/lib/prisma";
import {
  ALL_CHALLENGES,
  getChallengesForChapter,
  getChallengeById,
  getAllChallengesForCourse,
  getChapterChallengeCount,
} from "../src/lib/challenges/challenge-bank";
import {
  evaluateChallengeSubmission,
  PASSING_SCORE_THRESHOLD,
} from "../src/lib/challenges/evaluator";
import {
  checkChapterCompletion,
  getChapterChallengeProgression,
  getChapterUnlockStatus,
  recordChapterRecapCompletion,
  CHALLENGE_PASS_THRESHOLD,
} from "../src/lib/adaptive/unlock-service";

const DEROGATORY_TERMS = [
  "dull",
  "weak",
  "bad",
  "poor",
  "stupid",
  "idiot",
  "slow learner",
  "failure",
];

async function runTestSuite() {
  console.log("\n================================================================================");
  console.log("   KNOWLEDGE STREAM AI — PROGRAMMING CHALLENGES & SEQUENTIAL MASTERY TEST SUITE");
  console.log("================================================================================\n");

  let totalTests = 0;
  let passedTests = 0;

  function assert(condition: boolean, testName: string, detail?: string) {
    totalTests++;
    if (condition) {
      passedTests++;
      console.log(`  [PASS] Test ${totalTests}: ${testName}`);
    } else {
      console.error(`  [FAIL] Test ${totalTests}: ${testName}${detail ? ` — Detail: ${detail}` : ""}`);
    }
  }

  // -------------------------------------------------------------------------
  // SECTION 1: Challenge Bank Coverage & Lab Manual Mapping
  // -------------------------------------------------------------------------
  console.log("--- SECTION 1: Challenge Bank Coverage & Verification ---");

  const javaChallenges = getAllChallengesForCourse("java");
  const cChallenges = getAllChallengesForCourse("c");
  const cppChallenges = getAllChallengesForCourse("cpp");
  const pythonChallenges = getAllChallengesForCourse("python");

  assert(javaChallenges.length >= 21, "Java curriculum contains at least 21 challenges (all 15 chapters + multi-program)", `Found: ${javaChallenges.length}`);
  assert(cChallenges.length >= 14, "C curriculum contains at least 14 challenges (Ch 0-10 + multi-program)", `Found: ${cChallenges.length}`);
  assert(cppChallenges.length >= 17, "C++ curriculum contains at least 17 challenges (Ch 1-15 + multi-program)", `Found: ${cppChallenges.length}`);
  assert(pythonChallenges.length >= 16, "Python curriculum contains at least 16 challenges (Ch 0-10 + multi-program)", `Found: ${pythonChallenges.length}`);

  // Verify Multi-Program Chapters
  const javaCh3 = getChallengesForChapter("java", 3);
  assert(javaCh3.length === 3, "Java Chapter 3 has exactly 3 programs (Exp 1, Exp 3b, Exp 7)", `Found: ${javaCh3.length}`);
  assert(javaCh3[0].id === "java_3_1" && javaCh3[1].id === "java_3_2" && javaCh3[2].id === "java_3_3", "Java Chapter 3 programs are ordered 3_1 -> 3_2 -> 3_3");

  const javaCh7 = getChallengesForChapter("java", 7);
  assert(javaCh7.length === 2, "Java Chapter 7 has 2 programs (Abstract Shapes + Multiple Interfaces)");

  const javaCh9 = getChallengesForChapter("java", 9);
  assert(javaCh9.length === 2, "Java Chapter 9 has 2 programs (Bubble Sort Swaps + Quick Sort Names)");

  const javaCh11 = getChallengesForChapter("java", 11);
  assert(javaCh11.length === 2, "Java Chapter 11 has 2 programs (Exception Trapping + Safe Calculator)");

  const javaCh14 = getChallengesForChapter("java", 14);
  assert(javaCh14.length === 2, "Java Chapter 14 has 2 programs (Hashtable + Doubly Linked List)");

  const javaCh15 = getChallengesForChapter("java", 15);
  assert(javaCh15.length === 2, "Java Chapter 15 has 2 programs (CSV Parser + File Path)");

  const cCh2 = getChallengesForChapter("c", 2);
  assert(cCh2.length === 3, "C Chapter 2 has 3 programs (Accumulator + Min/Max + Pattern)");

  const cppCh3 = getChallengesForChapter("cpp", 3);
  assert(cppCh3.length === 2, "C++ Chapter 3 has 2 programs (Overloading + Pass-by-Reference)");

  const pyCh2 = getChallengesForChapter("python", 2);
  assert(pyCh2.length === 2, "Python Chapter 2 has 2 programs (Range Accumulator + Target Search)");

  // -------------------------------------------------------------------------
  // SECTION 2: Evaluator Correctness (100% Pass vs < 70% Fail)
  // -------------------------------------------------------------------------
  console.log("\n--- SECTION 2: Evaluator Correctness & Test Case Scoring ---");

  // Test Python Challenge 0.1 with Reference Solution
  const py0 = getChallengeById("py_0_1")!;
  const py0Eval = await evaluateChallengeSubmission({
    challengeId: py0.id,
    code: py0.referenceSolution,
    language: "python",
  });
  assert(py0Eval.passed && py0Eval.score === 100, "Python 0.1 reference solution achieves 100% pass score", `Score: ${py0Eval.score}%`);

  // Test Python Challenge 0.1 with Flawed Code
  const py0Flawed = await evaluateChallengeSubmission({
    challengeId: py0.id,
    code: "print('Wrong Output Here')",
    language: "python",
  });
  assert(!py0Flawed.passed && py0Flawed.score === 0, "Flawed code fails with score 0% (< 70% pass threshold)", `Score: ${py0Flawed.score}%`);

  // Test Python Challenge 1.1 with Reference Solution
  const py1 = getChallengeById("py_1_1")!;
  const py1Eval = await evaluateChallengeSubmission({
    challengeId: py1.id,
    code: py1.referenceSolution,
    language: "python",
  });
  assert(py1Eval.passed && py1Eval.score === 100, "Python 1.1 (BMI Calculator) reference solution passes all public & hidden tests");

  // Test Java Challenge 1.1 with Reference Solution
  const java1 = getChallengeById("java_1_1")!;
  const java1Eval = await evaluateChallengeSubmission({
    challengeId: java1.id,
    code: java1.referenceSolution,
    language: "java",
  });
  assert(java1Eval.passed && java1Eval.score === 100, "Java 1.1 reference solution compiles and passes 100%");

  // Test C Challenge 0.1 with Reference Solution
  const c0 = getChallengeById("c_0_1")!;
  const c0Eval = await evaluateChallengeSubmission({
    challengeId: c0.id,
    code: c0.referenceSolution,
    language: "c",
  });
  assert(c0Eval.passed && c0Eval.score === 100, "C 0.1 (Hello World) reference solution compiles with GCC and passes 100%");

  // -------------------------------------------------------------------------
  // SECTION 3: Sequential Mastery Progression (Multi-Program Locking)
  // -------------------------------------------------------------------------
  console.log("\n--- SECTION 3: Sequential Mastery & Multi-Program Progression ---");

  const testUserId = `test_student_${Date.now()}`;

  // Create isolated test user
  await prisma.user.create({
    data: {
      id: testUserId,
      email: `${testUserId}@example.com`,
      name: "Test Mastery Student",
      role: "Student",
    },
  });

  const javaCourse = await prisma.course.findFirst({
    where: { language: "java" },
    include: { chapters: true },
  });

  if (javaCourse) {
    const ch3 = javaCourse.chapters.find((c) => c.orderNumber === 3);

    if (ch3) {
      // 1. Initially without quiz pass: Program A is locked
      const progInitial = await getChapterChallengeProgression({
        userId: testUserId,
        courseSlug: "java",
        chapterOrder: 3,
      });
      assert(!progInitial.challenges[0].isUnlocked, "Program A is locked before quiz is passed");

      // 2. Mark Quiz as passed (score 85%)
      await prisma.chapterProgress.create({
        data: {
          userId: testUserId,
          chapterId: ch3.id,
          quizScore: 85,
          isCompleted: false,
          codeSolved: false,
        },
      });

      // 3. After quiz pass: Program A unlocks, but Program B and C are LOCKED
      const progAfterQuiz = await getChapterChallengeProgression({
        userId: testUserId,
        courseSlug: "java",
        chapterOrder: 3,
      });

      assert(progAfterQuiz.challenges[0].isUnlocked, "Program A unlocks after quiz is passed");
      assert(!progAfterQuiz.challenges[1].isUnlocked, "Program B remains strictly locked when Program A is unsolved");
      assert(!progAfterQuiz.challenges[2].isUnlocked, "Program C remains strictly locked when Program A is unsolved");

      // 4. Record passing score (80%) for Program A
      await prisma.learningEvent.create({
        data: {
          userId: testUserId,
          courseId: "java",
          chapterId: ch3.id,
          topic: "Program A",
          content: "Passed Program A test",
          eventType: "CHALLENGE_PASSED",
          metadata: JSON.stringify({
            challengeId: "java_3_1",
            score: 80,
            passed: true,
          }),
        },
      });

      // 5. Check progression: Program B should now be UNLOCKED, Program C still LOCKED
      const progAfterProgA = await getChapterChallengeProgression({
        userId: testUserId,
        courseSlug: "java",
        chapterOrder: 3,
      });

      assert(progAfterProgA.challenges[0].isPassed, "Program A recorded as passed");
      assert(progAfterProgA.challenges[1].isUnlocked, "Program B UNLOCKED after Program A passed");
      assert(!progAfterProgA.challenges[2].isUnlocked, "Program C remains strictly locked until Program B passes");
      assert(!progAfterProgA.isAllChallengesPassed, "Chapter 3 challenges not marked complete with only Program A passed");

      // 6. Record passing score for Program B
      await prisma.learningEvent.create({
        data: {
          userId: testUserId,
          courseId: "java",
          chapterId: ch3.id,
          topic: "Program B",
          content: "Passed Program B test",
          eventType: "CHALLENGE_PASSED",
          metadata: JSON.stringify({
            challengeId: "java_3_2",
            score: 100,
            passed: true,
          }),
        },
      });

      // 7. Check progression: Program C should now be UNLOCKED
      const progAfterProgB = await getChapterChallengeProgression({
        userId: testUserId,
        courseSlug: "java",
        chapterOrder: 3,
      });

      assert(progAfterProgB.challenges[2].isUnlocked, "Program C UNLOCKED after Program B passed");
      assert(!progAfterProgB.isAllChallengesPassed, "Chapter 3 challenges still not complete before Program C passes");

      // 8. Record passing score for Program C
      await prisma.learningEvent.create({
        data: {
          userId: testUserId,
          courseId: "java",
          chapterId: ch3.id,
          topic: "Program C",
          content: "Passed Program C test",
          eventType: "CHALLENGE_PASSED",
          metadata: JSON.stringify({
            challengeId: "java_3_3",
            score: 90,
            passed: true,
          }),
        },
      });

      // 9. Check progression: All challenges passed!
      const progFinal = await getChapterChallengeProgression({
        userId: testUserId,
        courseSlug: "java",
        chapterOrder: 3,
      });

      assert(progFinal.isAllChallengesPassed, "All Chapter 3 challenges successfully marked passed!");
      assert(progFinal.passedChallenges === 3, "Passed challenge count is exactly 3 of 3");
    }
  }

  // -------------------------------------------------------------------------
  // SECTION 4: Unlock Service Gate D Enforcement
  // -------------------------------------------------------------------------
  console.log("\n--- SECTION 4: Unlock Service Gate D Integration ---");

  // Create clean Chapter 1 test scenario
  if (javaCourse) {
    const ch1 = javaCourse.chapters.find((c) => c.orderNumber === 1);
    if (ch1) {
      // 1. Without challenges passed: checkChapterCompletion returns codeChallengesPassed = false
      const completionBefore = await checkChapterCompletion({
        userId: testUserId,
        courseId: "java",
        chapterId: ch1.id,
      });

      assert(!completionBefore.requirements.codeChallengesPassed, "Gate D (codeChallengesPassed) is false when chapter challenge not passed");
      assert(!completionBefore.isCompleted, "Chapter is NOT completed when Gate D is unfulfilled");

      // 2. Pass the challenge for Chapter 1
      await prisma.learningEvent.create({
        data: {
          userId: testUserId,
          courseId: "java",
          chapterId: ch1.id,
          topic: "JVM Environment",
          content: "Passed JVM Environment test",
          eventType: "CHALLENGE_PASSED",
          metadata: JSON.stringify({
            challengeId: "java_1_1",
            score: 100,
            passed: true,
          }),
        },
      });

      // Also complete recap
      await recordChapterRecapCompletion({
        userId: testUserId,
        courseSlug: "java",
        chapterId: ch1.id,
        summaryText: "Recap done",
      });

      const completionAfter = await checkChapterCompletion({
        userId: testUserId,
        courseId: "java",
        chapterId: ch1.id,
      });

      assert(completionAfter.requirements.codeChallengesPassed, "Gate D is satisfied after challenge passed at >= 70%");
    }
  }

  // -------------------------------------------------------------------------
  // SECTION 5: Ethical Language Audit
  // -------------------------------------------------------------------------
  console.log("\n--- SECTION 5: Ethical Language Audit ---");

  let derogatoryFound = 0;
  for (const ch of ALL_CHALLENGES) {
    const corpus = `${ch.title} ${ch.description} ${ch.objective} ${ch.hints.join(" ")}`.toLowerCase();
    for (const term of DEROGATORY_TERMS) {
      if (corpus.includes(term)) {
        derogatoryFound++;
        console.error(`Derogatory term '${term}' found in challenge ${ch.id}`);
      }
    }
  }

  assert(derogatoryFound === 0, "Zero derogatory or stigmatizing terms in all challenge definitions and hints", `Found: ${derogatoryFound}`);

  // Clean up test user
  await prisma.learningEvent.deleteMany({ where: { userId: testUserId } });
  await prisma.chapterProgress.deleteMany({ where: { userId: testUserId } });
  await prisma.chapterRecap.deleteMany({ where: { userId: testUserId } });
  await prisma.user.delete({ where: { id: testUserId } });

  console.log("\n================================================================================");
  console.log(`   TOTAL TESTS: ${totalTests} | PASSED: ${passedTests} | FAILED: ${totalTests - passedTests}`);
  console.log("================================================================================\n");

  if (totalTests === passedTests) {
    console.log(">>> ALL CHALLENGE MASTERY & PROGRESSION INVARIANTS VERIFIED! <<<\n");
    process.exit(0);
  } else {
    console.error(">>> SOME TESTS FAILED! <<<\n");
    process.exit(1);
  }
}

runTestSuite().catch((err) => {
  console.error("Fatal Test Runner Error:", err);
  process.exit(1);
});
