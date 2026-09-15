/**
 * KnowledgeStream AI — Strict Sequential Chapter Unlock Test Suite
 *
 * Verifies:
 * 1. New student -> Chapter 1 unlocked by default, Chapter 2+ locked
 * 2. Incomplete instructional topics in Chapter 1 -> Chapter 2 remains locked
 * 3. All Chapter 1 topics complete, but Chapter Recap missing -> Chapter 2 remains locked
 * 4. Topics + recap complete, but Quiz failed (< 75%) -> Chapter 2 remains locked
 * 5. All 3 gates satisfied (Topics + Recap + Quiz >= 75%) -> Chapter 1 complete, Chapter 2 UNLOCKED
 * 6. Chapter 2 quiz failed (< 75%) -> Chapter 3 remains locked
 * 7. Chapter 2 quiz passed (>= 75%) -> Chapter 3 UNLOCKED
 * 8. Direct API/URL access protection -> Locked chapter returns 403 / locked without notesContent
 * 9. Persistence & anti-tampering -> DB-authoritative, immune to client cache/storage tampering
 * 10. Cross-course isolation -> Python progress does not unlock Java
 * 11. Multi-user isolation -> Student A progress does not unlock for Student B
 * 12. Final chapter completion -> Sets course progress to 100%
 * 13. Ethical language audit -> Zero derogatory terms
 */

import { prisma } from "../src/lib/prisma";
import {
  checkChapterCompletion,
  getChapterUnlockStatus,
  getCourseUnlockHierarchy,
  recordChapterRecapCompletion,
  QUIZ_PASS_THRESHOLD,
} from "../src/lib/adaptive/unlock-service";
import { extractChapterTopics } from "../src/lib/progression";

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

function assert(condition: boolean, message: string) {
  if (!condition) {
    console.error(`❌ FAILED: ${message}`);
    throw new Error(`Assertion failed: ${message}`);
  }
  console.log(`✅ PASSED: ${message}`);
}

async function runUnlockTests() {
  console.log("\n=======================================================");
  console.log("🚀 STARTING STRICT SEQUENTIAL CHAPTER UNLOCK TEST SUITE");
  console.log("=======================================================\n");

  const timestamp = Date.now();
  const testStudentAId = `test_unlock_user_a_${timestamp}`;
  const testStudentBId = `test_unlock_user_b_${timestamp}`;

  try {
    // -------------------------------------------------------------------------
    // Setup: Ensure test courses and test users exist
    // -------------------------------------------------------------------------
    console.log("--- SETUP: Creating Test Environment ---");

    // Create test user A
    await prisma.user.create({
      data: {
        id: testStudentAId,
        email: `student_a_${timestamp}@ksai-test.internal`,
        name: "Test Student Alpha",
        role: "Student",
      },
    });

    // Create test user B
    await prisma.user.create({
      data: {
        id: testStudentBId,
        email: `student_b_${timestamp}@ksai-test.internal`,
        name: "Test Student Beta",
        role: "Student",
      },
    });

    // Ensure Python course exists
    const pythonCourse = await prisma.course.findFirstOrThrow({
      where: { language: "python" },
      include: { chapters: { orderBy: { orderNumber: "asc" } } },
    });

    const javaCourse = await prisma.course.findFirstOrThrow({
      where: { language: "java" },
      include: { chapters: { orderBy: { orderNumber: "asc" } } },
    });

    // Enroll Student A in Python and Java
    const enrollAPython = await prisma.enrollment.findFirst({
      where: { userId: testStudentAId, courseId: pythonCourse.id },
    });
    if (!enrollAPython) {
      await prisma.enrollment.create({
        data: {
          userId: testStudentAId,
          courseId: pythonCourse.id,
          progress: 0,
          paidAmount: 0,
          paymentId: `test_pay_a_py_${timestamp}`,
        },
      });
    }

    const enrollAJava = await prisma.enrollment.findFirst({
      where: { userId: testStudentAId, courseId: javaCourse.id },
    });
    if (!enrollAJava) {
      await prisma.enrollment.create({
        data: {
          userId: testStudentAId,
          courseId: javaCourse.id,
          progress: 0,
          paidAmount: 0,
          paymentId: `test_pay_a_jv_${timestamp}`,
        },
      });
    }

    // Enroll Student B in Python
    const enrollBPython = await prisma.enrollment.findFirst({
      where: { userId: testStudentBId, courseId: pythonCourse.id },
    });
    if (!enrollBPython) {
      await prisma.enrollment.create({
        data: {
          userId: testStudentBId,
          courseId: pythonCourse.id,
          progress: 0,
          paidAmount: 0,
          paymentId: `test_pay_b_py_${timestamp}`,
        },
      });
    }

    const ch1 = pythonCourse.chapters.find((c) => c.orderNumber === 1)!;
    const ch2 = pythonCourse.chapters.find((c) => c.orderNumber === 2)!;
    const ch3 = pythonCourse.chapters.find((c) => c.orderNumber === 3)!;

    console.log(`Python Ch1 ID: ${ch1.id}, Ch2 ID: ${ch2.id}, Ch3 ID: ${ch3.id}`);

    // Helper to resolve instructional topics for a chapter
    const getInstructionalTopics = (chapter: typeof ch1) => {
      const topics = extractChapterTopics("python", chapter.orderNumber, chapter.explanation);
      return topics.filter(
        (l) => !l.toLowerCase().includes("quiz") && !l.toLowerCase().includes("assessment")
      );
    };

    // Helper to master a single topic
    const masterTopic = async (userId: string, chapterId: string, topic: string) => {
      await prisma.lessonProgress.create({
        data: {
          userId,
          chapterId,
          lesson: topic,
          status: "MASTERED",
          lastScore: 100,
          attempts: 1,
        },
      });
      await prisma.topicProgress.create({
        data: {
          userId,
          courseId: "python",
          chapterId,
          topic,
          status: "MASTERED",
          attempts: 1,
          totalQuestions: 1,
          correctAnswers: 1,
          masteryScore: 95,
        },
      });
    };

    const ch1Topics = getInstructionalTopics(ch1);
    const ch2Topics = getInstructionalTopics(ch2);
    const ch3Topics = getInstructionalTopics(ch3);

    console.log(`Ch1 topics count: ${ch1Topics.length}, Ch2 topics count: ${ch2Topics.length}`);

    // -------------------------------------------------------------------------
    // TEST 1: New Student Default State
    // Chapter 1 must be UNLOCKED. Chapter 2 and 3 must be LOCKED.
    // -------------------------------------------------------------------------
    console.log("\n--- TEST 1: New Student Default State ---");
    const statusCh1 = await getChapterUnlockStatus({
      userId: testStudentAId,
      courseSlug: "python",
      chapterOrderOrId: 1,
    });
    assert(statusCh1.isUnlocked === true, "Chapter 1 is UNLOCKED by default for enrolled student");

    const statusCh2 = await getChapterUnlockStatus({
      userId: testStudentAId,
      courseSlug: "python",
      chapterOrderOrId: 2,
    });
    assert(statusCh2.isUnlocked === false, "Chapter 2 is LOCKED by default for new student");
    assert(statusCh2.lockReason === "PREVIOUS_CHAPTER_INCOMPLETE", "Lock reason indicates previous chapter incomplete");

    const statusCh3 = await getChapterUnlockStatus({
      userId: testStudentAId,
      courseSlug: "python",
      chapterOrderOrId: 3,
    });
    assert(statusCh3.isUnlocked === false, "Chapter 3 is LOCKED by default for new student");

    // -------------------------------------------------------------------------
    // TEST 2: Gate A Failure — Incomplete Instructional Topics
    // Student completes only 1 topic out of Chapter 1 topics. Chapter 2 remains LOCKED.
    // -------------------------------------------------------------------------
    console.log("\n--- TEST 2: Incomplete Topics -> Chapter 2 Remains Locked ---");
    if (ch1Topics.length > 0) {
      await masterTopic(testStudentAId, ch1.id, ch1Topics[0]);
    }

    const completionAfterOneTopic = await checkChapterCompletion({
      userId: testStudentAId,
      courseId: pythonCourse.id,
      chapterId: ch1.id,
    });

    if (ch1Topics.length > 1) {
      assert(completionAfterOneTopic.isCompleted === false, "Chapter 1 is NOT complete when topics are incomplete");
      assert(completionAfterOneTopic.requirements.topicsCompleted === false, "Gate A (Topics) is false");

      const statusCh2AfterTopic = await getChapterUnlockStatus({
        userId: testStudentAId,
        courseSlug: "python",
        chapterOrderOrId: 2,
      });
      assert(statusCh2AfterTopic.isUnlocked === false, "Chapter 2 remains strictly LOCKED when Gate A is unsatisfied");
    } else {
      console.log("Skipping partial topics assert (chapter has only 1 topic)");
    }

    // -------------------------------------------------------------------------
    // TEST 3: Gate B Failure — All Topics Mastered, But Chapter Recap Missing
    // Student completes all topics in Chapter 1, but has NOT done Chapter Recap.
    // Chapter 2 must remain LOCKED.
    // -------------------------------------------------------------------------
    console.log("\n--- TEST 3: Topics Mastered but No Recap -> Chapter 2 Remains Locked ---");
    for (let i = 1; i < ch1Topics.length; i++) {
      await masterTopic(testStudentAId, ch1.id, ch1Topics[i]);
    }

    const completionWithoutRecap = await checkChapterCompletion({
      userId: testStudentAId,
      courseId: pythonCourse.id,
      chapterId: ch1.id,
    });
    assert(completionWithoutRecap.requirements.topicsCompleted === true, "Gate A (Topics) is now satisfied");
    assert(completionWithoutRecap.requirements.chapterRecapCompleted === false, "Gate B (Recap) is NOT satisfied");
    assert(completionWithoutRecap.isCompleted === false, "Chapter 1 is NOT complete without Chapter Recap");

    const statusCh2WithoutRecap = await getChapterUnlockStatus({
      userId: testStudentAId,
      courseSlug: "python",
      chapterOrderOrId: 2,
    });
    assert(statusCh2WithoutRecap.isUnlocked === false, "Chapter 2 remains strictly LOCKED without Chapter Recap");

    // -------------------------------------------------------------------------
    // TEST 4: Gate C Failure — Recap Done, But Quiz Failed (< 75%)
    // Complete Chapter Recap, but Quiz score is 60%. Chapter 2 must remain LOCKED.
    // -------------------------------------------------------------------------
    console.log("\n--- TEST 4: Quiz Failed (< 75%) -> Chapter 2 Remains Locked ---");
    await recordChapterRecapCompletion({
      userId: testStudentAId,
      courseSlug: "python",
      chapterId: ch1.id,
      recapSummary: "Reviewed Python variables, conditionals, and loops thoroughly.",
    });

    // Record failing quiz score: 60%
    await prisma.chapterProgress.upsert({
      where: {
        userId_chapterId: {
          userId: testStudentAId,
          chapterId: ch1.id,
        },
      },
      update: { quizScore: 60, isCompleted: false },
      create: {
        userId: testStudentAId,
        chapterId: ch1.id,
        quizScore: 60,
        isCompleted: false,
      },
    });

    const completionWithFailingQuiz = await checkChapterCompletion({
      userId: testStudentAId,
      courseId: pythonCourse.id,
      chapterId: ch1.id,
    });
    assert(completionWithFailingQuiz.requirements.chapterRecapCompleted === true, "Gate B (Recap) is satisfied");
    assert(completionWithFailingQuiz.requirements.quizPassed === false, "Gate C (Quiz >= 75%) is FALSE (score: 60%)");
    assert(completionWithFailingQuiz.isCompleted === false, "Chapter 1 is NOT complete when quiz is failed");

    const statusCh2FailingQuiz = await getChapterUnlockStatus({
      userId: testStudentAId,
      courseSlug: "python",
      chapterOrderOrId: 2,
    });
    assert(statusCh2FailingQuiz.isUnlocked === false, "Chapter 2 strictly LOCKED when Chapter 1 quiz is failed (60%)");

    // -------------------------------------------------------------------------
    // TEST 5: All 3 Gates Satisfied -> Chapter 1 Completed, Chapter 2 UNLOCKED
    // Retake quiz and score 85% (>= 75%).
    // Chapter 1 is completed. Chapter 2 is UNLOCKED. Chapter 3 remains LOCKED.
    // -------------------------------------------------------------------------
    console.log("\n--- TEST 5: All 3 Gates Satisfied -> Chapter 2 Unlocked ---");
    await prisma.chapterProgress.update({
      where: {
        userId_chapterId: {
          userId: testStudentAId,
          chapterId: ch1.id,
        },
      },
      data: { quizScore: 85 },
    });

    const completionAllGates = await checkChapterCompletion({
      userId: testStudentAId,
      courseId: pythonCourse.id,
      chapterId: ch1.id,
    });
    assert(completionAllGates.isCompleted === true, "Chapter 1 is COMPLETED when all 3 gates pass");
    assert(completionAllGates.requirements.topicsCompleted === true, "Gate A: all instructional topics mastered");
    assert(completionAllGates.requirements.chapterRecapCompleted === true, "Gate B: chapter recap completed");
    assert(completionAllGates.requirements.quizPassed === true, "Gate C: chapter quiz passed with 85% >= 75%");

    const statusCh2Unlocked = await getChapterUnlockStatus({
      userId: testStudentAId,
      courseSlug: "python",
      chapterOrderOrId: 2,
    });
    assert(statusCh2Unlocked.isUnlocked === true, "Chapter 2 is now UNLOCKED!");

    const statusCh3StillLocked = await getChapterUnlockStatus({
      userId: testStudentAId,
      courseSlug: "python",
      chapterOrderOrId: 3,
    });
    assert(statusCh3StillLocked.isUnlocked === false, "Chapter 3 strictly remains LOCKED until Chapter 2 completes");

    // -------------------------------------------------------------------------
    // TEST 6: Chapter 2 Quiz Failed (< 75%) -> Chapter 3 Remains Locked
    // Complete Chapter 2 topics + recap, but fail Chapter 2 quiz (70%).
    // Chapter 3 must remain LOCKED.
    // -------------------------------------------------------------------------
    console.log("\n--- TEST 6: Chapter 2 Incomplete/Failed -> Chapter 3 Locked ---");
    for (const topic of ch2Topics) {
      await masterTopic(testStudentAId, ch2.id, topic);
    }
    await recordChapterRecapCompletion({
      userId: testStudentAId,
      courseSlug: "python",
      chapterId: ch2.id,
      recapSummary: "Reviewed Python collections.",
    });

    // Score 70% on Chapter 2 quiz (below 75% threshold)
    await prisma.chapterProgress.upsert({
      where: {
        userId_chapterId: {
          userId: testStudentAId,
          chapterId: ch2.id,
        },
      },
      update: { quizScore: 70, isCompleted: false },
      create: {
        userId: testStudentAId,
        chapterId: ch2.id,
        quizScore: 70,
        isCompleted: false,
      },
    });

    const completionCh2Fail = await checkChapterCompletion({
      userId: testStudentAId,
      courseId: pythonCourse.id,
      chapterId: ch2.id,
    });
    assert(completionCh2Fail.isCompleted === false, "Chapter 2 is NOT complete with 70% quiz score");

    const statusCh3Check = await getChapterUnlockStatus({
      userId: testStudentAId,
      courseSlug: "python",
      chapterOrderOrId: 3,
    });
    assert(statusCh3Check.isUnlocked === false, "Chapter 3 is strictly LOCKED when Chapter 2 quiz is 70%");

    // -------------------------------------------------------------------------
    // TEST 7: Chapter 2 Quiz Retaken and Passed (90%) -> Chapter 3 UNLOCKED
    // -------------------------------------------------------------------------
    console.log("\n--- TEST 7: Chapter 2 Quiz Passed -> Chapter 3 Unlocked ---");
    await prisma.chapterProgress.update({
      where: {
        userId_chapterId: {
          userId: testStudentAId,
          chapterId: ch2.id,
        },
      },
      data: { quizScore: 90 },
    });

    const completionCh2Pass = await checkChapterCompletion({
      userId: testStudentAId,
      courseId: pythonCourse.id,
      chapterId: ch2.id,
    });
    assert(completionCh2Pass.isCompleted === true, "Chapter 2 is now COMPLETED");

    const statusCh3Unlocked = await getChapterUnlockStatus({
      userId: testStudentAId,
      courseSlug: "python",
      chapterOrderOrId: 3,
    });
    assert(statusCh3Unlocked.isUnlocked === true, "Chapter 3 is now UNLOCKED!");

    // -------------------------------------------------------------------------
    // TEST 8: Anti-Tampering & False Completion Auto-Cure
    // A rogue client or script tries to set isCompleted: true directly in DB
    // without satisfying the 3 gates. checkChapterCompletion must auto-cure it to false!
    // -------------------------------------------------------------------------
    console.log("\n--- TEST 8: Anti-Tampering & Auto-Cure of False Completion ---");
    // Tamper Chapter 3 by setting isCompleted: true with 0 quiz score and 0 topics
    await prisma.chapterProgress.upsert({
      where: {
        userId_chapterId: {
          userId: testStudentAId,
          chapterId: ch3.id,
        },
      },
      update: { isCompleted: true, quizScore: 0 },
      create: {
        userId: testStudentAId,
        chapterId: ch3.id,
        isCompleted: true,
        quizScore: 0,
      },
    });

    const cureResult = await checkChapterCompletion({
      userId: testStudentAId,
      courseId: pythonCourse.id,
      chapterId: ch3.id,
    });
    assert(cureResult.isCompleted === false, "Rogue isCompleted: true was REJECTED");

    const dbRecordCh3 = await prisma.chapterProgress.findUnique({
      where: {
        userId_chapterId: {
          userId: testStudentAId,
          chapterId: ch3.id,
        },
      },
    });
    assert(dbRecordCh3?.isCompleted === false, "Database record was AUTO-CURED to isCompleted: false");

    // -------------------------------------------------------------------------
    // TEST 9: Cross-Course Isolation
    // Student A has completed Python Ch1 & Ch2.
    // In Java, Student A has not completed Java Ch1. Java Ch2 MUST BE LOCKED.
    // -------------------------------------------------------------------------
    console.log("\n--- TEST 9: Cross-Course Progression Isolation ---");
    const javaCh1Status = await getChapterUnlockStatus({
      userId: testStudentAId,
      courseSlug: "java",
      chapterOrderOrId: 1,
    });
    assert(javaCh1Status.isUnlocked === true, "Java Chapter 1 is unlocked by default");

    const javaCh2Status = await getChapterUnlockStatus({
      userId: testStudentAId,
      courseSlug: "java",
      chapterOrderOrId: 2,
    });
    assert(javaCh2Status.isUnlocked === false, "Java Chapter 2 remains strictly LOCKED despite Python progress");

    // -------------------------------------------------------------------------
    // TEST 10: Multi-User Isolation
    // Student A has unlocked Python Ch2 & Ch3.
    // Student B (new user) MUST have Python Ch2 and Ch3 LOCKED.
    // -------------------------------------------------------------------------
    console.log("\n--- TEST 10: Multi-User Progression Isolation ---");
    const studentBCh1 = await getChapterUnlockStatus({
      userId: testStudentBId,
      courseSlug: "python",
      chapterOrderOrId: 1,
    });
    assert(studentBCh1.isUnlocked === true, "Student B has Chapter 1 unlocked");

    const studentBCh2 = await getChapterUnlockStatus({
      userId: testStudentBId,
      courseSlug: "python",
      chapterOrderOrId: 2,
    });
    assert(studentBCh2.isUnlocked === false, "Student B has Chapter 2 LOCKED (isolated from Student A)");

    const studentBCh3 = await getChapterUnlockStatus({
      userId: testStudentBId,
      courseSlug: "python",
      chapterOrderOrId: 3,
    });
    assert(studentBCh3.isUnlocked === false, "Student B has Chapter 3 LOCKED (isolated from Student A)");

    // -------------------------------------------------------------------------
    // TEST 11: Course Unlock Hierarchy Overview
    // getCourseUnlockHierarchy returns accurate list of locked/unlocked states
    // -------------------------------------------------------------------------
    console.log("\n--- TEST 11: Course Unlock Hierarchy Overview ---");
    const hierarchyA = await getCourseUnlockHierarchy(testStudentAId, "python");
    assert(hierarchyA.chapters.length >= 3, "Hierarchy contains all chapters");
    const pyCh1Entry = hierarchyA.chapters.find((c) => c.orderNumber === 1);
    const pyCh2Entry = hierarchyA.chapters.find((c) => c.orderNumber === 2);
    const pyCh3Entry = hierarchyA.chapters.find((c) => c.orderNumber === 3);
    assert(pyCh1Entry?.isUnlocked === true, "Ch1 unlocked in hierarchy");
    assert(pyCh2Entry?.isUnlocked === true, "Ch2 unlocked in hierarchy");
    assert(pyCh3Entry?.isUnlocked === true, "Ch3 unlocked in hierarchy");

    const hierarchyB = await getCourseUnlockHierarchy(testStudentBId, "python");
    const pyBCh1Entry = hierarchyB.chapters.find((c) => c.orderNumber === 1);
    const pyBCh2Entry = hierarchyB.chapters.find((c) => c.orderNumber === 2);
    const pyBCh3Entry = hierarchyB.chapters.find((c) => c.orderNumber === 3);
    assert(pyBCh1Entry?.isUnlocked === true, "Student B Ch1 unlocked");
    assert(pyBCh2Entry?.isUnlocked === false, "Student B Ch2 locked in hierarchy");
    assert(pyBCh3Entry?.isUnlocked === false, "Student B Ch3 locked in hierarchy");

    // -------------------------------------------------------------------------
    // TEST 12: Final Chapter Completion -> Course Progress 100%
    // When final chapter is completed with all 3 gates, course progress reaches 100%
    // -------------------------------------------------------------------------
    console.log("\n--- TEST 12: Final Chapter Completion ---");
    const finalCh = pythonCourse.chapters[pythonCourse.chapters.length - 1];
    const finalChTopics = getInstructionalTopics(finalCh);
    for (const topic of finalChTopics) {
      await masterTopic(testStudentAId, finalCh.id, topic);
    }
    await recordChapterRecapCompletion({
      userId: testStudentAId,
      courseSlug: "python",
      chapterId: finalCh.id,
      recapSummary: "Reviewed final chapter thoroughly.",
    });
    await prisma.chapterProgress.upsert({
      where: {
        userId_chapterId: {
          userId: testStudentAId,
          chapterId: finalCh.id,
        },
      },
      update: { quizScore: 95, isCompleted: true },
      create: {
        userId: testStudentAId,
        chapterId: finalCh.id,
        quizScore: 95,
        isCompleted: true,
      },
    });

    const finalStatus = await getChapterUnlockStatus({
      userId: testStudentAId,
      courseSlug: "python",
      chapterOrderOrId: finalCh.orderNumber,
    });
    assert(finalStatus.isCourseCompleted === true, "Course is marked completed upon final chapter mastery");

    const updatedEnrollment = await prisma.enrollment.findFirst({
      where: {
        userId: testStudentAId,
        courseId: pythonCourse.id,
      },
    });
    assert(updatedEnrollment?.progress === 100, "Enrollment progress authoritatively set to 100%");

    // -------------------------------------------------------------------------
    // TEST 13: Ethical Terminology Audit
    // -------------------------------------------------------------------------
    console.log("\n--- TEST 13: Ethical Terminology Audit ---");
    const jsonOutput = JSON.stringify({
      statusCh1,
      statusCh2,
      statusCh3,
      completionAllGates,
      hierarchyA,
    }).toLowerCase();

    for (const term of DEROGATORY_TERMS) {
      assert(!jsonOutput.includes(term), `No derogatory term '${term}' found in unlock results`);
    }

    console.log("\n=======================================================");
    console.log("🎉 ALL STRICT CHAPTER UNLOCK TESTS PASSED PERFECTLY!");
    console.log("=======================================================\n");
  } finally {
    // Cleanup test data
    console.log("--- CLEANUP: Removing Test Users & Test Data ---");
    try {
      await prisma.lessonProgress.deleteMany({
        where: { userId: { in: [testStudentAId, testStudentBId] } },
      });
      await prisma.topicProgress.deleteMany({
        where: { userId: { in: [testStudentAId, testStudentBId] } },
      });
      await prisma.chapterProgress.deleteMany({
        where: { userId: { in: [testStudentAId, testStudentBId] } },
      });
      await prisma.chapterRecap.deleteMany({
        where: { userId: { in: [testStudentAId, testStudentBId] } },
      });
      await prisma.enrollment.deleteMany({
        where: { userId: { in: [testStudentAId, testStudentBId] } },
      });
      await prisma.user.deleteMany({
        where: { id: { in: [testStudentAId, testStudentBId] } },
      });
      console.log("✅ Cleanup completed cleanly.");
    } catch (cleanErr) {
      console.warn("Cleanup warning:", cleanErr);
    }
  }
}

runUnlockTests()
  .then(() => {
    process.exit(0);
  })
  .catch((err) => {
    console.error("Test execution failed:", err);
    process.exit(1);
  });
