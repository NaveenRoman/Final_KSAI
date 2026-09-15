/**
 * KnowledgeStream AI — Adaptive Evaluation & Student Profile Engine Test Suite
 *
 * Verifies:
 * 1. Student A (Strong): High signals -> STRONG/ADVANCED, Recommended: ADVANCED
 * 2. Student B (Intermediate): Moderate signals -> DEVELOPING, Recommended: INTERMEDIATE
 * 3. Student C (Needs Support): Low signals with misconceptions -> NEEDS_SUPPORT, Recommended: BEGINNER
 * 4. Student D (Cross-Language Isolation): Java Loops vs Python Loops vs C Pointers remain isolated
 * 5. Edge Cases:
 *    - Cold start (0 events) -> NOT_ENOUGH_DATA
 *    - Anti-spike dampening (single 100% score) -> dampening prevents premature mastery
 *    - Infrastructure/compiler errors -> ignored without penalty
 *    - Fluff/irrelevant answers -> rejected, zero or low score
 *    - Language ethics: Zero derogatory terms (DULL, WEAK, BAD, POOR)
 */

import { calculateTopicMastery } from "../src/lib/adaptive/mastery-engine";
import { recordCodingEvidence, recordStudentEvidence, getStudentFullProfile, getTopicLearningProfile } from "../src/lib/adaptive/profile-service";
import { evaluateStudentAnswer } from "../src/lib/adaptive/evaluator";
import { buildAdaptiveReteachPrompt } from "../src/lib/adaptive/teaching-adapter";
import { prisma } from "../src/lib/prisma";

const DEROGATORY_TERMS = ["dull", "weak", "bad", "poor", "stupid", "idiot", "slow learner", "failure"];

function assert(condition: boolean, message: string) {
  if (!condition) {
    console.error(`❌ FAILED: ${message}`);
    throw new Error(`Assertion failed: ${message}`);
  }
  console.log(`✅ PASSED: ${message}`);
}

async function runTests() {
  console.log("\n=======================================================");
  console.log("🚀 STARTING ADAPTIVE EVALUATION ENGINE TEST SUITE");
  console.log("=======================================================\n");

  // -------------------------------------------------------------------------
  // Test 1: Cold Start Edge Case (0 events)
  // -------------------------------------------------------------------------
  console.log("--- TEST 1: Cold Start Edge Case ---");
  const coldStart = calculateTopicMastery({
    understandingScores: [],
    assessmentScores: [],
    codingScores: [],
    recentScores: [],
    teachAgainCount: 0,
    repeatedMistakesCount: 0,
  });
  assert(coldStart.level === "NOT_ENOUGH_DATA", `Cold start should be NOT_ENOUGH_DATA, got: ${coldStart.level}`);
  assert(coldStart.confidence === 0, `Cold start confidence should be 0, got: ${coldStart.confidence}`);
  assert(coldStart.recommendedDifficulty === "BEGINNER", `Cold start recommended difficulty should be BEGINNER, got: ${coldStart.recommendedDifficulty}`);

  // -------------------------------------------------------------------------
  // Test 2: Anti-Spike Dampening (Single 100% answer)
  // -------------------------------------------------------------------------
  console.log("\n--- TEST 2: Anti-Spike Dampening ---");
  const singleEvent = calculateTopicMastery({
    understandingScores: [100],
    assessmentScores: [],
    codingScores: [],
    recentScores: [100],
    teachAgainCount: 0,
    repeatedMistakesCount: 0,
  });
  assert(singleEvent.level === "NOT_ENOUGH_DATA", `1 event should still be NOT_ENOUGH_DATA (< 2 required), got: ${singleEvent.level}`);
  assert(singleEvent.confidence <= 0.35, `Single event confidence should be low (<= 0.35), got: ${singleEvent.confidence}`);

  // -------------------------------------------------------------------------
  // Test 3: Student A (Strong Persona)
  // -------------------------------------------------------------------------
  console.log("\n--- TEST 3: Student A (Strong Persona) ---");
  const studentA = calculateTopicMastery({
    understandingScores: [95, 92],
    assessmentScores: [90],
    codingScores: [100],
    recentScores: [95, 92, 90, 100],
    teachAgainCount: 0,
    repeatedMistakesCount: 0,
  });
  assert(studentA.level === "ADVANCED" || studentA.level === "STRONG", `Student A should be STRONG or ADVANCED, got: ${studentA.level}`);
  assert(studentA.masteryScore >= 85, `Student A overall score should be >= 85, got: ${studentA.masteryScore}`);
  assert(studentA.recommendedDifficulty === "ADVANCED", `Student A recommended difficulty should be ADVANCED, got: ${studentA.recommendedDifficulty}`);

  // -------------------------------------------------------------------------
  // Test 4: Student B (Intermediate Persona)
  // -------------------------------------------------------------------------
  console.log("\n--- TEST 4: Student B (Intermediate Persona) ---");
  const studentB = calculateTopicMastery({
    understandingScores: [65],
    assessmentScores: [70],
    codingScores: [60],
    recentScores: [65, 70, 60],
    teachAgainCount: 0,
    repeatedMistakesCount: 0,
  });
  assert(studentB.level === "DEVELOPING", `Student B should be DEVELOPING, got: ${studentB.level}`);
  assert(studentB.recommendedDifficulty === "INTERMEDIATE", `Student B recommended difficulty should be INTERMEDIATE, got: ${studentB.recommendedDifficulty}`);

  // -------------------------------------------------------------------------
  // Test 5: Student C (Needs Support + Misconceptions)
  // -------------------------------------------------------------------------
  console.log("\n--- TEST 5: Student C (Needs Support Persona) ---");
  const studentC = calculateTopicMastery({
    understandingScores: [35],
    assessmentScores: [40],
    codingScores: [20],
    recentScores: [35, 40, 20],
    teachAgainCount: 2,
    repeatedMistakesCount: 1,
  });
  assert(studentC.level === "NEEDS_SUPPORT", `Student C should be NEEDS_SUPPORT, got: ${studentC.level}`);
  assert(studentC.recommendedDifficulty === "BEGINNER", `Student C recommended difficulty should be BEGINNER, got: ${studentC.recommendedDifficulty}`);

  // Verify adaptive reteach prompt directly injects the student's misconceptions
  const reteachPrompt = buildAdaptiveReteachPrompt({
    topic: "Java Loops",
    attemptNumber: 2,
    misconceptions: ["Assumes for loop always executes 10 times regardless of condition"],
  });
  assert(reteachPrompt.includes("Assumes for loop always executes 10 times"), `Reteach prompt must address the detected misconception`);

  // -------------------------------------------------------------------------
  // Test 6: Compiler / Infrastructure Error Safety
  // -------------------------------------------------------------------------
  console.log("\n--- TEST 6: Infrastructure Error Safety ---");
  const testEmail = "test-adaptive-verification@example.com";
  let testUser = await prisma.user.findUnique({ where: { email: testEmail } });
  if (!testUser) {
    testUser = await prisma.user.create({
      data: {
        email: testEmail,
        name: "Adaptive Test Student",
      },
    });
  }

  const infraResult = await recordCodingEvidence({
    userId: testUser.id,
    course: "cpp",
    topic: "Pointers & Memory",
    testCasesPassed: 0,
    totalTestCases: 5,
    success: false,
    infrastructureError: true, // e.g. g++ missing
    compileError: "g++: command not found",
  });
  assert(infraResult.recorded === false, `Infrastructure/compiler errors must have recorded: false`);

  // -------------------------------------------------------------------------
  // Test 7: Multi-Language Topic Isolation (Student D)
  // -------------------------------------------------------------------------
  console.log("\n--- TEST 7: Multi-Language Isolation (Student D) ---");
  // Clean prior progress for this user
  await prisma.learningEvent.deleteMany({ where: { userId: testUser.id } });
  await prisma.learningMemory.deleteMany({ where: { userId: testUser.id } });
  await prisma.topicProgress.deleteMany({ where: { userId: testUser.id } });

  // Record high Java Loop score
  await recordStudentEvidence({
    userId: testUser.id,
    course: "java",
    topic: "Loops & Iteration",
    source: "CHECKPOINT",
    score: 95,
  });
  await recordStudentEvidence({
    userId: testUser.id,
    course: "java",
    topic: "Loops & Iteration",
    source: "QUIZ",
    score: 90,
  });

  // Record moderate Python Loop score
  await recordStudentEvidence({
    userId: testUser.id,
    course: "python",
    topic: "Loops & Iteration",
    source: "CHECKPOINT",
    score: 65,
  });
  await recordStudentEvidence({
    userId: testUser.id,
    course: "python",
    topic: "Loops & Iteration",
    source: "QUIZ",
    score: 60,
  });

  // Record low C Pointers score
  await recordStudentEvidence({
    userId: testUser.id,
    course: "c",
    topic: "Pointers & Memory",
    source: "CHECKPOINT",
    score: 30,
    misconceptions: ["Pointers contain the value rather than the address"],
  });
  await recordStudentEvidence({
    userId: testUser.id,
    course: "c",
    topic: "Pointers & Memory",
    source: "QUIZ",
    score: 40,
  });

  // Retrieve profiles
  const javaProfile = await getTopicLearningProfile(testUser.id, "java", "Loops & Iteration");
  const pythonProfile = await getTopicLearningProfile(testUser.id, "python", "Loops & Iteration");
  const cProfile = await getTopicLearningProfile(testUser.id, "c", "Pointers & Memory");

  assert(javaProfile !== null, "Java profile should exist");
  assert(pythonProfile !== null, "Python profile should exist");
  assert(cProfile !== null, "C profile should exist");

  assert(javaProfile!.level === "STRONG" || javaProfile!.level === "ADVANCED", `Java Loops should be STRONG/ADVANCED, got: ${javaProfile!.level}`);
  assert(pythonProfile!.level === "DEVELOPING", `Python Loops should be DEVELOPING, got: ${pythonProfile!.level}`);
  assert(cProfile!.level === "NEEDS_SUPPORT", `C Pointers should be NEEDS_SUPPORT, got: ${cProfile!.level}`);
  assert(javaProfile!.masteryScore > pythonProfile!.masteryScore, `Java score (${javaProfile!.masteryScore}) should be strictly higher than Python score (${pythonProfile!.masteryScore})`);
  assert(pythonProfile!.masteryScore > cProfile!.masteryScore, `Python score (${pythonProfile!.masteryScore}) should be strictly higher than C score (${cProfile!.masteryScore})`);

  // -------------------------------------------------------------------------
  // Test 8: Evaluator Quality & Irrelevant Answer Pre-screening
  // -------------------------------------------------------------------------
  console.log("\n--- TEST 8: Evaluator Quality Pre-screening ---");
  // Empty / "idk" answer
  const blankEval = await evaluateStudentAnswer({
    course: "c",
    topic: "Pointers",
    question: "What is the dereference operator in C?",
    studentAnswer: "idk",
    topicContent: "The dereference operator * is used to access the value at the address.",
  });
  assert(!blankEval.correct, `Empty or 'idk' answer must be marked incorrect`);
  assert(blankEval.score <= 10, `Empty or 'idk' score should be <= 10, got: ${blankEval.score}`);
  assert(blankEval.understandingLevel === "NEEDS_SUPPORT", `Understanding level should be NEEDS_SUPPORT`);

  // Irrelevant fluff answer
  const fluffEval = await evaluateStudentAnswer({
    course: "java",
    topic: "Loops & Iteration",
    question: "Explain how a for-loop condition determines when iteration stops.",
    studentAnswer: "Java was invented by James Douglas and Sun Microsystems in 1995 for internet applications.",
    topicContent: "In a for loop, the condition expression is checked before every iteration; when false, the loop terminates.",
  });
  assert(!fluffEval.correct, `Completely irrelevant history fluff must be marked incorrect`);
  assert(fluffEval.score <= 35, `Irrelevant fluff score should be <= 35, got: ${fluffEval.score}`);

  // -------------------------------------------------------------------------
  // Test 9: Zero Derogatory Vocabulary Audit
  // -------------------------------------------------------------------------
  console.log("\n--- TEST 9: Ethical Terminology Audit ---");
  const fullProfile = await getStudentFullProfile(testUser.id);
  const profileJson = JSON.stringify(fullProfile).toLowerCase();

  for (const term of DEROGATORY_TERMS) {
    const regex = new RegExp(`\\b${term}\\b`, "i");
    const found = regex.test(profileJson);
    assert(!found, `Forbidden derogatory term '${term}' must NEVER appear in student profiles or outputs`);
  }

  // Cleanup test user
  await prisma.learningEvent.deleteMany({ where: { userId: testUser.id } });
  await prisma.learningMemory.deleteMany({ where: { userId: testUser.id } });
  await prisma.topicProgress.deleteMany({ where: { userId: testUser.id } });
  await prisma.user.delete({ where: { id: testUser.id } });

  console.log("\n=======================================================");
  console.log("🎉 ALL ADAPTIVE ENGINE TESTS PASSED PERFECTLY!");
  console.log("=======================================================");
}

runTests().catch((err) => {
  console.error("Test Suite Fatal Error:", err);
  process.exit(1);
});
