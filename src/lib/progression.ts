import { db } from "@/lib/db";
import { XP_CONFIG } from "@/lib/xp-config";
import { awardXpAndStreak } from "@/lib/xp-service";
import { extractLessonTitles } from "@/lib/curriculum-parser";

/**
 * Standard Python & Java Chapter Section Maps
 */
export const DEFAULT_CHAPTER_SECTIONS: Record<string, Record<number, string[]>> = {
  python: {
    0: [
      "1. What is Programming?",
      "2. What is Python?",
      "3. Where Python is Used",
      "4. How Python Executes Code",
      "5. Interpreted vs Compiled Languages",
      "6. Installing Python & Setting Up VS Code",
      "7. Writing Your Very First Python Program",
    ],
    1: [
      "1. Installing Python, Running Scripts, and Using an IDE/REPL",
      "2. Variables, Naming Conventions & Dynamic Typing",
      "3. Numeric Data Types, Arithmetic Operations, and Precision",
      "4. Strings, Immutability, Indexing, Slicing, and String Methods",
      "5. Type Conversion, Booleans, and Truthiness",
    ],
    2: [
      "1. if, elif, else Statements, Nested Conditions, and Ternary Operator",
      "2. Logical Operators, Short-Circuit Evaluation, and Comparison Chaining",
      "3. while Loops, Infinite Loops, and Break/Continue Flow Control",
      "4. for Loops, the range() Function, and Iterating Over Sequences",
      "5. Nested Loops, Loop-Else Clauses, and the pass Statement",
    ],
    3: [
      "1. Function Definition, Return Values, and Scope",
      "2. Positional, Keyword, Default, and Arbitrary Arguments (*args, **kwargs)",
      "3. Lambda Functions, First-Class Functions, and Higher-Order Functions",
      "4. Recursion, Base Cases, and the Call Stack",
      "5. Docstrings, Type Hints, and Function Annotations",
    ],
    4: [
      "1. Lists: Creation, Indexing, Slicing, and In-Place Mutations",
      "2. List Methods, Comprehensions, and Multi-Dimensional Lists",
      "3. Tuples: Immutability, Packing, Unpacking, and Named Tuples",
      "4. Sets: Hashability, Mathematical Set Operations, and Frozensets",
      "5. Dictionaries: Key-Value Architecture, Hashing, and Dict Comprehensions",
    ],
  },
  c: {
    0: [
      "1. What is C, and Where is it Used?",
      "2. Installing a Compiler and Editor/IDE",
      "3. Writing, Compiling, and Running a Program",
      "4. Understanding Errors and Warnings",
      "5. Your First Program: \"Hello, World!\"",
    ],
    1: [
      "1.1 Structure of a C Program",
      "1.2 Variables, Data Types, and Constants",
      "1.3 Input and Output",
      "1.4 Operators and Expressions",
    ],
    2: [
      "2.1 Conditional Statements",
      "2.2 Loops",
      "2.3 Basic Problem Solving",
      "2.4 Real-World Applications & Interview Corner",
    ],
    3: [
      "3.1 Function Basics",
      "3.2 Scope",
      "3.3 Recursion",
    ],
    4: [
      "4.1 One-Dimensional Arrays",
      "4.2 Two-Dimensional Arrays",
      "4.3 Strings",
    ],
    5: [
      "5.1 Pointer Fundamentals",
      "5.2 Pointers and Arrays",
      "5.3 Pointers and Functions",
    ],
    6: [
      "6.1 Understanding Memory (RAM)",
      "6.2 Dynamic Memory Allocation (DMA)",
      "6.3 Memory Leaks & Dangling Pointers",
    ],
    7: [
      "7.1 Structures",
      "7.2 Unions",
      "7.3 Enumerations",
    ],
    8: [
      "8.1 File Basics",
      "8.2 Text File I/O",
      "8.3 Binary File I/O",
      "8.4 Visual Learning - Diagrams",
    ],
    9: [
      "9.1 The C Compilation Process",
      "9.2 The C Preprocessor",
      "9.3 Conditional Compilation",
      "9.4 Header Files",
      "9.5 Multi-file Programs",
      "9.6 Storage Classes (Deep Dive)",
      "9.7 Bitwise Operators",
      "9.8 Error Handling & Defensive Programming",
    ],
    10: [
      "10.1 Complete C Revision",
      "10.2 Frequently Asked Interview Questions",
      "10.3 Common Coding Patterns",
      "10.4 Common Bugs and Debugging",
      "10.5 Debugging Techniques",
      "10.6 Coding Best Practices",
    ],
  },
  cpp: {
    1: [
      "1. C++ Origins, Ecosystem, and Use Cases",
      "2. The Compilation Pipeline (Preprocessing, Compiling, Assembling, Linking)",
      "3. Anatomy of a C++ Program and Entry Points",
      "4. Build Systems and Modern Toolchains",
    ],
    2: [
      "1. Fundamental Types and Literal Representations",
      "2. Variables, Scope, and Const Qualifier",
      "3. Operators, Expressions, and Type Conversions",
      "4. Conditional Branching and Switch Statements",
      "5. Iteration Constructs and Loop Optimization",
    ],
    3: [
      "1. Function Declarations, Definitions, and Inlining",
      "2. Pass-by-Value vs Pass-by-Reference",
      "3. Function Overloading and Name Mangling",
      "4. Default Arguments and Recursive Functions",
      "5. Lambdas and Trailing Return Types",
    ],
    4: [
      "1. Address-of and Dereference Operators",
      "2. Pointer Arithmetic and Array Decay",
      "3. Null Pointers and Void Pointers",
      "4. Pointers to Pointers and Const Pointers",
      "5. Function Pointers and Type Aliases",
    ],
    5: [
      "1. Heap vs Stack Memory Allocation",
      "2. new and delete Operators",
      "3. Dynamically Allocated Arrays and delete[]",
      "4. Dangling Pointers, Memory Leaks, and std::nothrow",
      "5. C++ Reference Semantics and Binding Rules",
    ],
    6: [
      "1. Class Definitions, Encapsulation, and Struct Comparison",
      "2. Access Specifiers: Private, Public, Protected",
      "3. Constructors, Destructors, and Member Initializer Lists",
      "4. this Pointer and Const Member Functions",
      "5. Static Members and Friend Functions",
    ],
    7: [
      "1. Single, Multiple, and Hierarchical Inheritance",
      "2. Access Specifier Adjustments in Derived Classes",
      "3. Virtual Functions, Dynamic Binding, and VTable Mechanism",
      "4. Pure Virtual Functions and Abstract Classes",
      "5. Virtual Destructors and Dynamic Casting",
    ],
    8: [
      "1. Arithmetic, Comparison, and Stream Operator Overloading",
      "2. Subscript [] and Function Call () Operators",
      "3. The Rule of Three vs Rule of Five",
      "4. Move Semantics and Rvalue References (&&)",
      "5. Copy-and-Swap Idiom",
    ],
    9: [
      "1. Function Templates and Type Deductions",
      "2. Class Templates and Template Specialization",
      "3. Non-Type Template Parameters",
      "4. SFINAE and C++20 Concepts",
      "5. Variadic Templates and Fold Expressions",
    ],
    10: [
      "1. STL Architecture: Containers, Iterators, and Algorithms",
      "2. Sequence Containers: std::vector, std::deque, std::list",
      "3. Associative Containers: std::set, std::map, and Multi-Variants",
      "4. Unordered Containers and Hash Table Mechanics",
      "5. Container Adapters: std::stack, std::queue, std::priority_queue",
    ],
    11: [
      "1. Iterator Categories and Iterator Invalidation",
      "2. Sorting, Searching, and Partitioning Algorithms",
      "3. Modifying and Non-Modifying Sequence Operations",
      "4. Functors, std::function, and Predicate Lambdas",
      "5. Modern C++20 Ranges and Views Pipeline",
    ],
    12: [
      "1. Exception Mechanics: throw, try, and catch",
      "2. Standard Exception Hierarchy (<stdexcept>)",
      "3. RAII (Resource Acquisition Is Initialization)",
      "4. Smart Pointers: std::unique_ptr, std::shared_ptr, std::weak_ptr",
      "5. Exception Safety Guarantees and noexcept Specifier",
    ],
    13: [
      "1. Stream Classes Architecture (iostream, fstream, sstream)",
      "2. Formatted Output and Stream Manipulators",
      "3. File Reading, Writing, and State Flags",
      "4. Binary File Operations and Serialization",
      "5. String Streams and Custom Stream Operators",
    ],
    14: [
      "1. Threads and Concurrency: std::thread and std::jthread",
      "2. Mutexes, Locks, and Race Conditions",
      "3. Condition Variables and Thread Synchronization",
      "4. Atomic Operations and Memory Models",
      "5. Asynchronous Tasks with std::async and std::future",
    ],
    15: [
      "1. C++11/14/17/20 Modern Feature Evolution",
      "2. Auto Type Deduction and decltype",
      "3. Structured Binding and If-Init Statements",
      "4. Modules and Coroutines in C++20",
      "5. Performance Profiling, Cache Locality, and Best Practices",
    ],
  },
  java: {
    0: [
      "1. Introduction to Java and JVM Architecture",
      "2. Java Syntax & First Program",
      "3. Variables and Primitive Data Types",
      "4. Operators & Expressions",
    ],
    1: [
      "1. Control Flow: If-Else and Switch",
      "2. Loops in Java: For, While, Do-While",
      "3. Methods and Scope",
      "4. Arrays and String Manipulation",
    ],
  },
};

function safeReadFile(targetPath: string): string | null {
  if (typeof window !== "undefined") return null;
  try {
    const fsMod = eval("require")("fs");
    const pathMod = eval("require")("path");
    const fullPath = pathMod.isAbsolute(targetPath) ? targetPath : pathMod.join(process.cwd(), targetPath);
    if (fsMod.existsSync(fullPath)) {
      return fsMod.readFileSync(fullPath, "utf8");
    }
  } catch {
    return null;
  }
  return null;
}

/**
 * Extract topic headings from chapter markdown or default section maps
 */
export function extractChapterTopics(
  courseSlug: string,
  chapterOrder: number,
  markdownContent?: string | null
): string[] {
  const normSlug = courseSlug.toLowerCase();

  // 1. If markdown content or file path provided, resolve and extract
  if (markdownContent && typeof markdownContent === "string") {
    let content = markdownContent;
    if (content.endsWith(".md") || content.includes("/") || content.includes("\\")) {
      const diskContent = safeReadFile(content);
      if (diskContent) {
        content = diskContent;
      }
    }
    const extracted = extractLessonTitles(content, chapterOrder);
    if (extracted.length > 0) return extracted;
  }

  // 2. Check predefined fallback maps
  const predefined = DEFAULT_CHAPTER_SECTIONS[normSlug]?.[chapterOrder];
  if (predefined && predefined.length > 0) {
    return predefined;
  }

  // 3. Fallback: check standard markdown path on disk
  const candidateDirs: Record<string, string> = {
    python: "content/python",
    c: "content/c",
    cpp: "cpp",
    java: "java",
  };
  const dir = candidateDirs[normSlug];
  if (dir) {
    const diskContent = safeReadFile(`${dir}/chapter${chapterOrder}.md`);
    if (diskContent) {
      const extracted = extractLessonTitles(diskContent, chapterOrder);
      if (extracted.length > 0) return extracted;
    }
  }

  return [
    "1. Introduction & Overview",
    "2. Core Concepts & Syntax",
    "3. Practical Applications & Examples",
    "4. Advanced Considerations & Best Practices",
  ];
}

export interface TopicProgressionState {
  index: number;
  title: string;
  status: "NOT_STARTED" | "LEARNING" | "PRACTICED" | "NEEDS_REVIEW" | "MASTERED";
  isUnlocked: boolean;
  isMastered: boolean;
  score: number;
  attempts: number;
}

export interface ChapterProgressionState {
  id: string;
  orderNumber: number;
  title: string;
  isUnlocked: boolean;
  isCompleted: boolean;
  quizScore: number;
  topics: TopicProgressionState[];
  masteredTopicsCount: number;
  totalTopicsCount: number;
  quizEligibility: {
    isEligible: boolean;
    reason?: string;
    passed: boolean;
    bestScore: number;
    minPassingScore: number; // 75%
  };
}

export interface CourseProgressionSummary {
  courseId: string;
  courseTitle: string;
  courseSlug: string;
  isEnrolled: boolean;
  totalChapters: number;
  completedChapters: number;
  progressPercentage: number;
  currentActiveChapterOrder: number;
  chapters: Array<{
    id: string;
    orderNumber: number;
    title: string;
    isUnlocked: boolean;
    isCompleted: boolean;
    quizScore: number;
  }>;
  projectEligibility: {
    isEligible: boolean;
    isCompleted: boolean;
    title: string;
  };
  finalTestEligibility: {
    isEligible: boolean;
    isCompleted: boolean;
    minPassingScore: number; // 75%
  };
  certificateEligibility: {
    isEligible: boolean;
    certificateId: string;
    status: "LOCKED" | "ISSUED";
  };
}

/**
 * Authoritative Backend Course Progression & Mastery Calculator
 */
export async function getAuthoritativeProgression(
  userId: string,
  courseSlug: string,
  targetChapterOrder?: number
): Promise<{
  summary: CourseProgressionSummary;
  currentChapter?: ChapterProgressionState;
}> {
  const normSlug = courseSlug.toLowerCase();

  // 1. Find Course
  const course = await db.course.findFirst({
    where: { language: normSlug },
    include: {
      chapters: {
        orderBy: { orderNumber: "asc" },
      },
    },
  });

  if (!course) {
    throw new Error(`Course not found for slug: ${courseSlug}`);
  }

  // 2. Check Enrollment
  const enrollment = await db.enrollment.findFirst({
    where: {
      userId,
      courseId: course.id,
    },
  });
  const isEnrolled = !!enrollment;

  // 3. Load all chapter progresses for user
  const chapterProgresses = await db.chapterProgress.findMany({
    where: {
      userId,
      chapter: { courseId: course.id },
    },
  });
  const progressMap = new Map(chapterProgresses.map((p) => [p.chapterId, p]));

  // 4. Calculate Chapter Unlock Hierarchy
  // Chapter 0 is free preview. Chapter k is unlocked if Chapter k-1 is completed (quiz score >= 75%)
  const chaptersSummary = course.chapters.map((ch, idx) => {
    const prog = progressMap.get(ch.id);
    const isCompleted = !!prog?.isCompleted && (prog?.quizScore ?? 0) >= 75;
    const quizScore = prog?.quizScore ?? 0;

    let isUnlocked = false;
    if (ch.orderNumber === 0) {
      isUnlocked = true;
    } else if (idx === 0) {
      isUnlocked = isEnrolled;
    } else {
      const prevCh = course.chapters[idx - 1];
      const prevProg = progressMap.get(prevCh.id);
      const prevCompleted = !!prevProg?.isCompleted && (prevProg?.quizScore ?? 0) >= 75;
      isUnlocked = isEnrolled && prevCompleted;
    }

    return {
      id: ch.id,
      orderNumber: ch.orderNumber,
      title: ch.title,
      isUnlocked,
      isCompleted,
      quizScore,
    };
  });

  const completedChaptersCount = chaptersSummary.filter((c) => c.isCompleted).length;
  const totalChaptersCount = course.chapters.length || 1;
  const progressPercentage = Math.round((completedChaptersCount / totalChaptersCount) * 100);

  // Determine current active chapter
  const firstUncompleted = chaptersSummary.find((c) => !c.isCompleted && c.isUnlocked);
  const currentActiveChapterOrder = firstUncompleted?.orderNumber ?? (chaptersSummary[0]?.orderNumber ?? 0);

  // 5. Capstone Project & Final Test & Certificate Eligibility
  const allChaptersCompleted = completedChaptersCount >= totalChaptersCount && totalChaptersCount > 0;
  
  // Project is unlocked when all chapters are completed
  const projectEligible = allChaptersCompleted;
  const projectCompleted = allChaptersCompleted; // Connected to capstone submissions when present

  // Final Test is unlocked when project is completed
  const finalTestEligible = projectCompleted;
  const finalTestCompleted = allChaptersCompleted && progressPercentage >= 100;

  // Certificate is issued only when 100% complete
  const certHash = Buffer.from(`${userId}-${course.id}`).toString("hex").substring(0, 10).toUpperCase();
  const certificateId = `KSAI-CERT-${course.language.toUpperCase()}-${certHash}`;
  const certificateEligible = finalTestCompleted;

  const summary: CourseProgressionSummary = {
    courseId: course.id,
    courseTitle: course.title,
    courseSlug: course.language,
    isEnrolled,
    totalChapters: totalChaptersCount,
    completedChapters: completedChaptersCount,
    progressPercentage,
    currentActiveChapterOrder,
    chapters: chaptersSummary,
    projectEligibility: {
      isEligible: projectEligible,
      isCompleted: projectCompleted,
      title: `${course.title} Capstone Project`,
    },
    finalTestEligibility: {
      isEligible: finalTestEligible,
      isCompleted: finalTestCompleted,
      minPassingScore: 75,
    },
    certificateEligibility: {
      isEligible: certificateEligible,
      certificateId,
      status: certificateEligible ? "ISSUED" : "LOCKED",
    },
  };

  // 6. Compute Target Chapter Detailed Topic Progression
  let currentChapterDetails: ChapterProgressionState | undefined;
  const targetOrder = targetChapterOrder !== undefined ? targetChapterOrder : currentActiveChapterOrder;
  const selectedChapter = course.chapters.find((c) => c.orderNumber === targetOrder) || course.chapters[0];

  if (selectedChapter) {
    const chapterProg = progressMap.get(selectedChapter.id);
    const chapterSummaryItem = chaptersSummary.find((c) => c.id === selectedChapter.id);
    const isChapterUnlocked = chapterSummaryItem?.isUnlocked ?? false;
    const isChapterCompleted = chapterSummaryItem?.isCompleted ?? false;
    const quizScore = chapterProg?.quizScore ?? 0;

    // Load lesson progresses for this chapter
    const lessonProgresses = await db.lessonProgress.findMany({
      where: {
        userId,
        chapterId: selectedChapter.id,
      },
    });
    const lessonMap = new Map(lessonProgresses.map((lp) => [lp.lesson.toLowerCase().trim(), lp]));

    // Extract chapter topics
    const rawTopics = extractChapterTopics(normSlug, selectedChapter.orderNumber, selectedChapter.explanation);

    // Compute Topic-by-Topic Unlocks
    // Topic 0 is always unlocked if the chapter is unlocked.
    // Topic i is unlocked iff Topic i-1 has status === "MASTERED"
    let prevMastered = true;
    const topics: TopicProgressionState[] = rawTopics.map((topicTitle, index) => {
      const normKey = topicTitle.toLowerCase().trim();
      const directMatch = lessonMap.get(normKey);
      
      // Also check stripped numerical prefix
      const strippedKey = topicTitle.replace(/^[\d\.\-\s:]+/, "").trim().toLowerCase();
      const strippedMatch = Array.from(lessonMap.entries()).find(([k]) =>
        k.includes(strippedKey) || strippedKey.includes(k)
      )?.[1];

      const record = directMatch || strippedMatch;
      const status = (record?.status as TopicProgressionState["status"]) || "NOT_STARTED";
      const isMastered = status === "MASTERED";

      const isUnlocked = isChapterUnlocked && (index === 0 || prevMastered);

      // Carry forward mastery requirement for next topic
      prevMastered = isMastered;

      return {
        index,
        title: topicTitle,
        status,
        isUnlocked,
        isMastered,
        score: record?.lastScore ?? (isMastered ? 100 : 0),
        attempts: record?.attempts ?? 0,
      };
    });

    const masteredTopicsCount = topics.filter((t) => t.isMastered).length;
    const totalTopicsCount = topics.length;
    const allTopicsMastered = totalTopicsCount > 0 && masteredTopicsCount >= totalTopicsCount;

    currentChapterDetails = {
      id: selectedChapter.id,
      orderNumber: selectedChapter.orderNumber,
      title: selectedChapter.title,
      isUnlocked: isChapterUnlocked,
      isCompleted: isChapterCompleted,
      quizScore,
      topics,
      masteredTopicsCount,
      totalTopicsCount,
      quizEligibility: {
        isEligible: isChapterUnlocked && allTopicsMastered,
        reason: !isChapterUnlocked
          ? "Chapter is locked."
          : !allTopicsMastered
          ? `Please master all ${totalTopicsCount} topics before taking the Chapter Assessment (${masteredTopicsCount}/${totalTopicsCount} completed).`
          : undefined,
        passed: isChapterCompleted || quizScore >= 75,
        bestScore: quizScore,
        minPassingScore: 75,
      },
    };
  }

  return {
    summary,
    currentChapter: currentChapterDetails,
  };
}

/**
 * Logs a user activity in the database, awards XP, handles leveling up,
 * and creates corresponding notifications.
 */
export async function logUserActivity(userId: string, actionType: string, metadata?: any) {
  try {
    // 1. Log the activity
    await db.activityLog.create({
      data: {
        userId,
        actionType,
        metadata: metadata ? JSON.stringify(metadata) : null,
      },
    });

    // 2. Award XP based on activity type
    let xpToAdd = 0;
    let notificationTitle = "";
    let notificationMessage = "";

    if (actionType === "CHAPTER_COMPLETE") {
      xpToAdd = XP_CONFIG.CHAPTER_COMPLETE || 100;
      notificationTitle = "Chapter Completed! 📚";
      const chapterTitle = metadata?.chapterTitle || "a chapter";
      notificationMessage = `You completed "${chapterTitle}" and earned ${xpToAdd} XP!`;
    } else if (actionType === "QUIZ_SUBMIT") {
      if (metadata?.passed) {
        xpToAdd = XP_CONFIG.QUIZ_PASS || 150;
        notificationTitle = "Quiz Passed! 🎯";
        notificationMessage = `Scored ${metadata.score}% on the quiz and earned ${xpToAdd} XP!`;
      } else {
        xpToAdd = 30; // participation XP
        notificationTitle = "Quiz Attempted 📝";
        notificationMessage = `Attempted the quiz (Scored ${metadata?.score || 0}%). Earned 30 participation XP. Keep practicing!`;
      }
    } else if (actionType === "AI_CHAT") {
      xpToAdd = 10;
    } else if (actionType === "COURSE_ENROLL") {
      xpToAdd = 200;
      notificationTitle = "Enrolled in Course 🎓";
      const courseTitle = metadata?.courseTitle || "a new course";
      notificationMessage = `Successfully enrolled in "${courseTitle}". Earned 200 XP!`;
    }

    // 3. Create notification if applicable
    if (notificationTitle && notificationMessage) {
      await db.notification.create({
        data: {
          userId,
          title: notificationTitle,
          message: notificationMessage,
          read: false,
        },
      });
    }

    // 4. Update User XP and Level
    if (xpToAdd > 0) {
      const mappedSource =
        actionType.toLowerCase() === "chapter_complete"
          ? "chapter_complete"
          : actionType.toLowerCase() === "quiz_submit"
          ? "quiz_pass"
          : "quiz_pass";

      await awardXpAndStreak({
        userId,
        amount: xpToAdd,
        source: mappedSource,
      });
    }
  } catch (error) {
    console.error("Failed to log activity or award XP:", error);
  }
}
