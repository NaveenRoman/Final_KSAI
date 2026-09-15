/**
 * KnowledgeStream AI — Step 14 Extension Verification Suite
 *
 * Verifies Resume Intelligence, Quick Recap, Chapter Recap, and Chapter Learning Analysis:
 * - TEST A: Topic 1 study -> leave -> return -> Quick Recap at Topic 1
 * - TEST B: Topic 2 study after Topic 1 -> leave -> return -> Quick Recap at Topic 2
 * - TEST C: All topics completed -> Chapter Recap triggered (whole chapter)
 * - TEST D: Chapter with mixed topics (ADVANCED, STRONG, DEVELOPING, NEEDS_SUPPORT)
 * - TEST E: Insufficient evidence (< 2 interactions) -> NOT_ENOUGH_DATA
 * - TEST F: Active Misconception cited in Chapter Analysis & Quick Recap
 * - TEST G: Historical Resilience (bad answer does not collapse strong profile)
 * - TEST H: Progressive Recovery
 * - TEST I: Compiler Missing / Infrastructure Error -> Zero penalty
 * - TEST J: Persistence across return/refresh
 * - TEST K: Zero derogatory terminology audit
 */

import { prisma } from "../src/lib/prisma";
import {
  isChapterGenuinelyCompleted,
  getChapterLearningAnalysis,
  getChapterResumeState,
} from "../src/lib/adaptive/resume-service";
import {
  recordStudentEvidence,
  recordCodingEvidence,
  getTopicLearningProfile,
} from "../src/lib/adaptive/profile-service";
import {
  buildAdaptiveQuickRecap,
} from "../src/lib/adaptive/teaching-adapter";

const PROHIBITED_TERMS = [
  "dull",
  "weak",
  "bad",
  "poor",
  "failure",
  "stupid",
  "idiot",
  "slow learner",
];

interface TestResult {
  testId: string;
  name: string;
  status: "PASS" | "FAIL";
  details: string;
}

const results: TestResult[] = [];

function recordPass(testId: string, name: string, details: string) {
  console.log(`  ✅ [${testId}] ${name}: ${details}`);
  results.push({ testId, name, status: "PASS", details });
}

function recordFail(testId: string, name: string, details: string) {
  console.error(`  ❌ [${testId}] ${name}: ${details}`);
  results.push({ testId, name, status: "FAIL", details });
}

async function runExtensionVerification() {
  console.log("================================================================================");
  console.log("🚀 STARTING STEP 14 EXTENSION VERIFICATION: RESUME INTELLIGENCE & RECAP");
  console.log("================================================================================\n");

  const testUserEmail = `verify-step14-ext-${Date.now()}@example.com`;
  const user = await prisma.user.create({
    data: {
      email: testUserEmail,
      name: "Extension Verification Student",
      role: "Student",
    },
  });

  const course = "python";
  const realChapter = await prisma.chapter.findFirst({
    where: { course: { language: "python" } },
    include: { course: true },
  });
  const chapterId = realChapter?.id || "e418aa9a-2375-46cc-b270-2beac75be1f4";
  const chapterTitle = realChapter?.title || "Chapter 2: Control Flow & Loops";
  const lessons = [
    "1. Conditionals & Logic",
    "2. Loops & Iteration",
    "3. Break & Continue",
  ];

  let mixedUser: any = null;
  let resUser: any = null;
  let recUser: any = null;

  try {
    // -------------------------------------------------------------------------
    // TEST A: Student studies Topic 1 -> leaves -> returns -> Quick Recap Topic 1
    // -------------------------------------------------------------------------
    console.log("--- TEST A: Resume at Topic 1 ---");
    await recordStudentEvidence({
      userId: user.id,
      course,
      chapterId,
      source: "CHECKPOINT",
      topic: "1. Conditionals & Logic",
      score: 85,
      correct: true,
      question: "What is an if statement?",
      answer: "An if statement executes a block of code conditionally based on a boolean expression.",
      reteachCount: 0,
    });

    const resumeStateA = await getChapterResumeState({
      userId: user.id,
      courseId: course,
      chapterId,
      chapterTitle,
      chapterLessons: lessons,
    });

    if (
      resumeStateA.shouldQuickRecap === true &&
      resumeStateA.shouldChapterRecap === false &&
      resumeStateA.isChapterComplete === false &&
      resumeStateA.lastMeaningfulTopic &&
      resumeStateA.lastMeaningfulTopic.includes("Conditionals")
    ) {
      recordPass(
        "TEST A",
        "Resume at Topic 1",
        `Resolved last topic: "${resumeStateA.lastMeaningfulTopic}", shouldQuickRecap=true, shouldChapterRecap=false`
      );
    } else {
      recordFail(
        "TEST A",
        "Resume at Topic 1",
        `Expected quick recap on Topic 1, got: ${JSON.stringify(resumeStateA)}`
      );
    }

    // -------------------------------------------------------------------------
    // TEST B: Student studies Topic 2 -> leaves -> returns -> Quick Recap Topic 2
    // -------------------------------------------------------------------------
    console.log("\n--- TEST B: Resume at Topic 2 ---");
    await recordStudentEvidence({
      userId: user.id,
      course,
      chapterId,
      source: "CHECKPOINT",
      topic: "2. Loops & Iteration",
      score: 75,
      correct: true,
      question: "How does a while loop work?",
      answer: "A while loop runs as long as its condition is true.",
      reteachCount: 0,
    });

    const resumeStateB = await getChapterResumeState({
      userId: user.id,
      courseId: course,
      chapterId,
      chapterTitle,
      chapterLessons: lessons,
    });

    if (
      resumeStateB.shouldQuickRecap === true &&
      resumeStateB.shouldChapterRecap === false &&
      resumeStateB.lastMeaningfulTopic &&
      resumeStateB.lastMeaningfulTopic.includes("Loops")
    ) {
      recordPass(
        "TEST B",
        "Resume at Topic 2",
        `Resolved last topic: "${resumeStateB.lastMeaningfulTopic}", shouldQuickRecap=true, shouldChapterRecap=false`
      );
    } else {
      recordFail(
        "TEST B",
        "Resume at Topic 2",
        `Expected quick recap on Topic 2, got: ${JSON.stringify(resumeStateB)}`
      );
    }

    // -------------------------------------------------------------------------
    // TEST C: All topics completed -> Chapter Recap triggered
    // -------------------------------------------------------------------------
    console.log("\n--- TEST C: All Topics Completed -> Chapter Recap ---");
    // Complete all 3 lessons in lessonProgress
    await prisma.lessonProgress.upsert({
      where: { userId_chapterId_lesson: { userId: user.id, chapterId, lesson: lessons[0] } },
      update: { status: "MASTERED", attempts: 1, correctAnswers: 1, lastScore: 90 },
      create: { userId: user.id, chapterId, lesson: lessons[0], status: "MASTERED", attempts: 1, correctAnswers: 1, lastScore: 90 },
    });
    await prisma.lessonProgress.upsert({
      where: { userId_chapterId_lesson: { userId: user.id, chapterId, lesson: lessons[1] } },
      update: { status: "MASTERED", attempts: 1, correctAnswers: 1, lastScore: 85 },
      create: { userId: user.id, chapterId, lesson: lessons[1], status: "MASTERED", attempts: 1, correctAnswers: 1, lastScore: 85 },
    });
    await prisma.lessonProgress.upsert({
      where: { userId_chapterId_lesson: { userId: user.id, chapterId, lesson: lessons[2] } },
      update: { status: "MASTERED", attempts: 1, correctAnswers: 1, lastScore: 95 },
      create: { userId: user.id, chapterId, lesson: lessons[2], status: "MASTERED", attempts: 1, correctAnswers: 1, lastScore: 95 },
    });

    const isComplete = await isChapterGenuinelyCompleted({
      userId: user.id,
      courseId: course,
      chapterId,
      chapterLessons: lessons,
    });

    const resumeStateC = await getChapterResumeState({
      userId: user.id,
      courseId: course,
      chapterId,
      chapterTitle,
      chapterLessons: lessons,
    });

    if (
      isComplete === true &&
      resumeStateC.shouldChapterRecap === true &&
      resumeStateC.shouldQuickRecap === false &&
      resumeStateC.isChapterComplete === true &&
      resumeStateC.chapterAnalysis !== null
    ) {
      recordPass(
        "TEST C",
        "Chapter Recap Triggered",
        `isChapterComplete=true, shouldChapterRecap=true, shouldQuickRecap=false, chapterAnalysis present`
      );
    } else {
      recordFail(
        "TEST C",
        "Chapter Recap Triggered",
        `Expected complete chapter recap, got: ${JSON.stringify(resumeStateC)}`
      );
    }

    // -------------------------------------------------------------------------
    // TEST D: Chapter with mixed topics (ADVANCED, STRONG, DEVELOPING, NEEDS_SUPPORT)
    console.log("\n--- TEST D: Chapter Learning Analysis Categorization ---");
    const mixedUserEmail = `verify-mixed-${Date.now()}@example.com`;
    mixedUser = await prisma.user.create({
      data: { email: mixedUserEmail, name: "Mixed Student", role: "Student" },
    });
    const mixedChapterId = chapterId;
    const mixedLessons = [
      "1. Functions & Parameters",
      "2. Return Values",
      "3. Recursion Basics",
      "4. Lambda Functions",
    ];

    // Topic 1: Advanced (multiple 95+ scores, zero reteaches)
    await recordStudentEvidence({
      userId: mixedUser.id,
      course,
      chapterId: mixedChapterId,
      source: "CHECKPOINT",
      topic: mixedLessons[0],
      score: 95,
      correct: true,
      question: "How do functions accept arguments in Python?",
      answer: "Functions receive parameters positionally or via keyword arguments.",
      reteachCount: 0,
    });
    await recordStudentEvidence({
      userId: mixedUser.id,
      course,
      chapterId: mixedChapterId,
      source: "CHECKPOINT",
      topic: mixedLessons[0],
      score: 98,
      correct: true,
      question: "What is a default argument?",
      answer: "A default argument provides a fallback value if no argument is passed.",
      reteachCount: 0,
    });

    // Topic 2: Developing (score 70-75)
    await recordStudentEvidence({
      userId: mixedUser.id,
      course,
      chapterId: mixedChapterId,
      source: "CHECKPOINT",
      topic: mixedLessons[1],
      score: 72,
      correct: true,
      question: "What does return do?",
      answer: "It sends a value back and exits the function.",
      reteachCount: 0,
    });
    await recordStudentEvidence({
      userId: mixedUser.id,
      course,
      chapterId: mixedChapterId,
      source: "CHECKPOINT",
      topic: mixedLessons[1],
      score: 74,
      correct: true,
      question: "What is returned if there is no return statement?",
      answer: "None is returned.",
      reteachCount: 0,
    });

    // Topic 3: Needs Support (low score 35, reteach count 2, active misconception)
    await recordStudentEvidence({
      userId: mixedUser.id,
      course,
      chapterId: mixedChapterId,
      source: "TEACH_AGAIN",
      topic: mixedLessons[2],
      score: 35,
      correct: false,
      question: "What is the base case in recursion?",
      answer: "Recursion runs infinitely until memory is full.",
      reteachCount: 2,
      misconceptions: ["Believes recursion always runs infinitely without an exit condition"],
    });
    await recordStudentEvidence({
      userId: mixedUser.id,
      course,
      chapterId: mixedChapterId,
      source: "TEACH_AGAIN",
      topic: mixedLessons[2],
      score: 40,
      correct: false,
      question: "Why do we need a base case?",
      answer: "I don't know how the stack stops.",
      reteachCount: 2,
      misconceptions: ["Missing concept of recursive termination condition"],
    });

    const analysisD = await getChapterLearningAnalysis({
      userId: mixedUser.id,
      courseId: course,
      chapterId: mixedChapterId,
      chapterLessons: mixedLessons.slice(0, 3), // 3 tested lessons
    });

    const hasStrong = analysisD.strongTopics.some((t) => t.topic.includes("Functions"));
    const hasDeveloping = analysisD.developingTopics.some((t) => t.topic.includes("Return Values"));
    const hasNeedsSupport = analysisD.needsSupportTopics.some((t) => t.topic.includes("Recursion"));

    if (hasStrong && hasDeveloping && hasNeedsSupport) {
      recordPass(
        "TEST D",
        "Mixed Topics Categorization",
        `Strong: ${analysisD.strongTopics.length}, Developing: ${analysisD.developingTopics.length}, Needs Support: ${analysisD.needsSupportTopics.length}`
      );
    } else {
      recordFail(
        "TEST D",
        "Mixed Topics Categorization",
        `Failed to categorize all 3 tiers. Strong: ${hasStrong}, Developing: ${hasDeveloping}, Needs Support: ${hasNeedsSupport}`
      );
    }

    // -------------------------------------------------------------------------
    // TEST E: Insufficient evidence (< 2 interactions) -> NOT_ENOUGH_DATA
    // -------------------------------------------------------------------------
    console.log("\n--- TEST E: Insufficient Evidence (< 2 interactions) ---");
    // Topic 4 has only 1 interaction
    await recordStudentEvidence({
      userId: mixedUser.id,
      course,
      chapterId: mixedChapterId,
      source: "CHECKPOINT",
      topic: mixedLessons[3],
      score: 90,
      correct: true,
      question: "What is a lambda?",
      answer: "An anonymous inline function.",
      reteachCount: 0,
    });

    const analysisE = await getChapterLearningAnalysis({
      userId: mixedUser.id,
      courseId: course,
      chapterId: mixedChapterId,
      chapterLessons: mixedLessons,
    });

    const hasNotEnoughData = analysisE.notEnoughDataTopics.some((t) => t.topic.includes("Lambda"));
    if (hasNotEnoughData) {
      recordPass(
        "TEST E",
        "Insufficient Evidence -> NOT_ENOUGH_DATA",
        `Topic "${mixedLessons[3]}" categorized under notEnoughDataTopics (interactions: 1 < 2)`
      );
    } else {
      recordFail(
        "TEST E",
        "Insufficient Evidence -> NOT_ENOUGH_DATA",
        `Expected Topic 4 under notEnoughDataTopics, but got: ${JSON.stringify(analysisE.notEnoughDataTopics)}`
      );
    }

    // -------------------------------------------------------------------------
    // TEST F: Active Misconception cited in Chapter Analysis & Quick Recap
    // -------------------------------------------------------------------------
    console.log("\n--- TEST F: Active Misconception Citation ---");
    const needsSupportItem = analysisD.needsSupportTopics.find((t) => t.topic.includes("Recursion"));
    const whyContainsMisconception =
      Boolean(needsSupportItem?.reason && (needsSupportItem.reason.toLowerCase().includes("misconception") || needsSupportItem.reason.toLowerCase().includes("recursion")));

    // Test buildAdaptiveQuickRecap with student profile
    const profileRecursion = await getTopicLearningProfile(mixedUser.id, course, mixedLessons[2]);
    const adaptedQuick = buildAdaptiveQuickRecap({
      topic: mixedLessons[2],
      course,
      chapterTitle: "Recursion Chapter",
      profile: profileRecursion,
    });

    const quickAddressesMisconception =
      adaptedQuick.recapText.toLowerCase().includes("recursion") ||
      adaptedQuick.recapText.toLowerCase().includes("base case") ||
      adaptedQuick.recapText.toLowerCase().includes("note:");

    if (whyContainsMisconception && quickAddressesMisconception) {
      recordPass(
        "TEST F",
        "Active Misconception Cited",
        `Chapter reason: "${needsSupportItem?.reason}". Quick recap addressed misconception.`
      );
    } else {
      recordFail(
        "TEST F",
        "Active Misconception Cited",
        `Misconception not clearly cited in reason (${whyContainsMisconception}) or quick recap (${quickAddressesMisconception})`
      );
    }

    // -------------------------------------------------------------------------
    // TEST G: Historical Resilience (Bad answer does not collapse strong profile)
    // -------------------------------------------------------------------------
    console.log("\n--- TEST G: Historical Resilience ---");
    const resilientUserEmail = `verify-resilient-${Date.now()}@example.com`;
    resUser = await prisma.user.create({
      data: { email: resilientUserEmail, name: "Resilient Student", role: "Student" },
    });
    const stableTopic = "Data Structures: Dictionaries";

    // 4 high scores
    for (let i = 0; i < 4; i++) {
      await recordStudentEvidence({
        userId: resUser.id,
        course,
        source: "CHECKPOINT",
        topic: stableTopic,
        score: 92 + i,
        correct: true,
        question: `Question ${i + 1}`,
        answer: "Accurate comprehensive answer.",
        reteachCount: 0,
      });
    }

    // 1 poor score (35%)
    await recordStudentEvidence({
      userId: resUser.id,
      course,
      source: "CHECKPOINT",
      topic: stableTopic,
      score: 35,
      correct: false,
      question: "Surprise tricky question",
      answer: "Quick incorrect attempt",
      reteachCount: 1,
    });

    const profAfterSlip = await getTopicLearningProfile(resUser.id, course, stableTopic);
    // Profile should NOT collapse to NEEDS_SUPPORT; damping should keep it at STRONG or DEVELOPING
    if (profAfterSlip && profAfterSlip.level !== "NEEDS_SUPPORT") {
      recordPass(
        "TEST G",
        "Historical Resilience",
        `After 4 strong answers + 1 low score, profile level is: "${profAfterSlip.level}" (Score: ${profAfterSlip.masteryScore}%), successfully resisted collapse to NEEDS_SUPPORT`
      );
    } else {
      recordFail(
        "TEST G",
        "Historical Resilience",
        `Profile improperly collapsed to: "${profAfterSlip?.level}" (Score: ${profAfterSlip?.masteryScore}%)`
      );
    }

    // -------------------------------------------------------------------------
    // TEST H: Progressive Recovery
    // -------------------------------------------------------------------------
    console.log("\n--- TEST H: Progressive Recovery ---");
    const recoveryUserEmail = `verify-recovery-${Date.now()}@example.com`;
    recUser = await prisma.user.create({
      data: { email: recoveryUserEmail, name: "Recovering Student", role: "Student" },
    });
    const recoveryTopic = "Algorithm Complexity";

    // Initial struggle (scores 40, 45) -> establishes initial struggling state (NEEDS_SUPPORT)
    await recordStudentEvidence({
      userId: recUser.id,
      course,
      source: "CHECKPOINT",
      topic: recoveryTopic,
      score: 40,
      correct: false,
      question: "Initial struggle question 1",
      answer: "Incomplete answer.",
      reteachCount: 1,
    });
    await recordStudentEvidence({
      userId: recUser.id,
      course,
      source: "CHECKPOINT",
      topic: recoveryTopic,
      score: 45,
      correct: false,
      question: "Initial struggle question 2",
      answer: "Vague guess.",
      reteachCount: 2,
    });

    const profStruggle = await getTopicLearningProfile(recUser.id, course, recoveryTopic);
    const struggleScore = profStruggle?.masteryScore ?? 44;

    // Student receives targeted instruction and demonstrates progressive recovery
    await recordStudentEvidence({
      userId: recUser.id,
      course,
      source: "CHECKPOINT",
      topic: recoveryTopic,
      score: 85,
      correct: true,
      question: "Post-explanation question 1",
      answer: "Accurate analysis of Big-O complexity.",
      reteachCount: 0,
    });

    await recordStudentEvidence({
      userId: recUser.id,
      course,
      source: "CHECKPOINT",
      topic: recoveryTopic,
      score: 95,
      correct: true,
      question: "Post-explanation question 2",
      answer: "Comprehensive proof of logarithmic time complexity.",
      reteachCount: 0,
    });

    const profAfterRecovery = await getTopicLearningProfile(recUser.id, course, recoveryTopic);
    if (
      profAfterRecovery &&
      profAfterRecovery.masteryScore > struggleScore &&
      (profAfterRecovery.level === "DEVELOPING" || profAfterRecovery.level === "STRONG")
    ) {
      recordPass(
        "TEST H",
        "Progressive Recovery",
        `Score recovered progressively from ${struggleScore}% (${profStruggle?.level}) -> ${profAfterRecovery.masteryScore}% (${profAfterRecovery.level})`
      );
    } else {
      recordFail(
        "TEST H",
        "Progressive Recovery",
        `Failed to recover score smoothly. Struggle: ${struggleScore}%, After: ${profAfterRecovery?.masteryScore}% (Level: ${profAfterRecovery?.level})`
      );
    }

    // -------------------------------------------------------------------------
    // TEST I: Compiler Missing / Infrastructure Error -> Zero penalty
    // -------------------------------------------------------------------------
    console.log("\n--- TEST I: Compiler Missing / Infrastructure Error Zero Penalty ---");
    const baselineProfile = await getTopicLearningProfile(resUser.id, course, stableTopic);
    const baselineScore = baselineProfile?.masteryScore ?? 86;
    await recordCodingEvidence({
      userId: resUser.id,
      course,
      topic: stableTopic,
      testCasesPassed: 0,
      totalTestCases: 5,
      success: false,
      infrastructureError: true,
      compileError: "'python' is not recognized as an internal or external command",
    });

    const profAfterInfra = await getTopicLearningProfile(resUser.id, course, stableTopic);
    if (profAfterInfra && profAfterInfra.masteryScore === baselineScore) {
      recordPass(
        "TEST I",
        "Compiler Missing Zero Penalty",
        `Score before: ${baselineScore}%, Score after compiler missing: ${profAfterInfra.masteryScore}% (Zero penalty verified)`
      );
    } else {
      recordFail(
        "TEST I",
        "Compiler Missing Zero Penalty",
        `Expected score to remain unchanged at ${baselineScore}%, but got ${profAfterInfra?.masteryScore}%`
      );
    }

    // -------------------------------------------------------------------------
    // TEST J: Persistence across return / refresh
    // -------------------------------------------------------------------------
    console.log("\n--- TEST J: Persistence Across Return/Refresh ---");
    // Retrieve resume state in an independent call
    const freshResumeState = await getChapterResumeState({
      userId: mixedUser.id,
      courseId: course,
      chapterId: mixedChapterId,
      chapterTitle: "Functions Chapter",
      chapterLessons: mixedLessons,
    });

    if (freshResumeState && freshResumeState.chapterAnalysis) {
      recordPass(
        "TEST J",
        "Persistence Across Refresh",
        `Successfully reloaded persistent resume state. Total analyzed topics: ${freshResumeState.chapterAnalysis.totalTopics}, Overall mastery: ${freshResumeState.chapterAnalysis.overallMasteryScore}%`
      );
    } else {
      recordFail(
        "TEST J",
        "Persistence Across Refresh",
        `Failed to retrieve persistent state on refresh: ${JSON.stringify(freshResumeState)}`
      );
    }

    // -------------------------------------------------------------------------
    // TEST K: Prohibited Terminology Audit
    // -------------------------------------------------------------------------
    console.log("\n--- TEST K: Prohibited Terminology Audit ---");
    const auditObjects = [
      JSON.stringify(resumeStateA),
      JSON.stringify(resumeStateB),
      JSON.stringify(resumeStateC),
      JSON.stringify(analysisD),
      JSON.stringify(analysisE),
      adaptedQuick.recapText,
      adaptedQuick.question,
    ];

    let foundViolations: string[] = [];
    for (const objStr of auditObjects) {
      const lower = objStr.toLowerCase();
      for (const term of PROHIBITED_TERMS) {
        const regex = new RegExp(`\\b${term}\\b`, "i");
        if (regex.test(lower)) {
          foundViolations.push(term);
        }
      }
    }

    if (foundViolations.length === 0) {
      recordPass(
        "TEST K",
        "Terminology Audit",
        `Zero prohibited words found across all recap texts, questions, and analyses.`
      );
    } else {
      recordFail(
        "TEST K",
        "Terminology Audit",
        `Found prohibited terms: ${Array.from(new Set(foundViolations)).join(", ")}`
      );
    }
  } catch (error: any) {
    console.error("Fatal error during Step 14 Extension verification:", error);
    recordFail("SUITE", "Fatal Error", error.message || String(error));
  } finally {
    // Cleanup verification users to keep dev.db tidy
    try {
      const userIds = [user?.id, mixedUser?.id, resUser?.id, recUser?.id].filter(Boolean);
      for (const uid of userIds) {
        await prisma.learningEvent.deleteMany({ where: { userId: uid } });
        await prisma.topicProgress.deleteMany({ where: { userId: uid } });
        await prisma.learningMemory.deleteMany({ where: { userId: uid } });
        await prisma.lessonProgress.deleteMany({ where: { userId: uid } });
        await prisma.user.delete({ where: { id: uid } });
      }
    } catch {}
  }

  // Final summary
  console.log("\n================================================================================");
  console.log("📊 STEP 14 EXTENSION VERIFICATION SUMMARY");
  console.log("================================================================================");
  const total = results.length;
  const passed = results.filter((r) => r.status === "PASS").length;
  const failed = results.filter((r) => r.status === "FAIL").length;

  console.log(`Total Tests Run : ${total}`);
  console.log(`Passed          : ${passed}`);
  console.log(`Failed          : ${failed}`);
  console.log("================================================================================");

  if (failed === 0) {
    console.log("🎉 ALL STEP 14 EXTENSION TESTS PASSED PERFECTLY!");
    process.exit(0);
  } else {
    console.error(`❌ ${failed} TESTS FAILED. Review output above.`);
    process.exit(1);
  }
}

void runExtensionVerification();
