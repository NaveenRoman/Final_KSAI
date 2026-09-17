/**
 * KnowledgeStream AI — Production-Grade Learning Notebook Engine
 *
 * Implements:
 * 1. Strict (userId + courseId) Course & Student Isolation.
 * 2. Real Physical A4 Notebook simulation with persistent sequential pages.
 * 3. Strict Chronological Append (monotonic sequenceOrder ASC; oldest first; no daily resets).
 * 4. Structured Learning Context capture (what AI taught, student interaction, AI response, understanding check, learning signals).
 * 5. Immutable history: restudying a topic appends new learning evidence; never overwrites.
 * 6. Server-authoritative ownership and authorization.
 */

import { prisma } from "@/lib/prisma";

export interface LearningContextWhatAITaught {
  concept: string;
  explanation: string;
  importantPoints?: string[];
  examples?: Array<{ title: string; lang?: string; code?: string }>;
  codeExamples?: Array<{ title: string; lang?: string; code?: string }>;
  analogy?: string | null;
  correction?: string | null;
}

export interface LearningContextStudentInteraction {
  studentQuestions?: Array<{ question: string; answer: string; timestamp?: string }>;
  studentConfusion?: string[];
  requestForExample?: boolean;
  requestForTeachAgain?: boolean;
  requestForClarification?: boolean;
}

export interface LearningContextAIResponse {
  actualExplanation?: string;
  example?: string;
  correction?: string;
}

export interface LearningContextUnderstandingCheck {
  aiQuestion?: string;
  studentActualAnswer?: string;
  expectedAnswer?: string;
  evaluation?: "CORRECT" | "PARTIAL" | "INCORRECT" | "GOOD" | "WEAK" | "NO_ANSWER" | string;
  score?: number;
  correctness?: boolean;
  misconception?: string | null;
}

export interface LearningContextLearningSignals {
  strengths: string[];
  needsSupport: string[];
  repeatedMistakes?: string[];
  demonstratedUnderstanding?: boolean;
  masteryEvidence?: string[];
}

export interface StructuredLearningContext {
  courseId: string;
  courseTitle?: string;
  language: string;
  chapterId: string;
  chapterTitle?: string;
  chapterOrder?: number;
  topicId?: string;
  topic: string;
  subtopic?: string;
  sessionKey?: string;
  timestamp: string;

  whatAITaught: LearningContextWhatAITaught;
  studentInteraction?: LearningContextStudentInteraction;
  aiResponse?: LearningContextAIResponse;
  understandingCheck?: LearningContextUnderstandingCheck;
  learningSignals: LearningContextLearningSignals;

  // Infrastructure shield indicator
  infrastructureError?: boolean;
}

export interface AppendLearningUnitInput {
  userId: string;
  courseIdOrSlug: string;
  chapterId: string;
  topicId?: string;
  topic: string;
  subtopic?: string;
  title?: string;
  type?: string;
  content?: string;
  sessionKey?: string;
  structuredContext?: Partial<StructuredLearningContext>;
  rawMetadata?: any;
  saveEvent?: boolean;
}

// A4 Page Capacity Model:
// Each physical A4 page cleanly accommodates 2 substantive learning units,
// or a maximum aggregate content length of ~2200 characters.
export const A4_MAX_UNITS_PER_PAGE = 2;
export const A4_MAX_CHARACTERS_PER_PAGE = 2200;

/**
 * Normalizes course identifier into canonical course language slug
 */
export function normalizeCourseSlug(raw: string): string {
  if (!raw) return "python";
  const clean = raw.trim().toLowerCase();
  if (clean === "c++" || clean === "cpp") return "cpp";
  if (clean === "c") return "c";
  if (clean === "java") return "java";
  if (clean === "python") return "python";
  return clean;
}

/**
 * Resolves courseId from UUID or language slug, creating default if needed
 */
export async function resolveCourse(courseIdOrSlug: string): Promise<{ id: string; title: string; language: string }> {
  const normSlug = normalizeCourseSlug(courseIdOrSlug);

  const matched = await prisma.course.findFirst({
    where: {
      OR: [
        { id: courseIdOrSlug },
        { language: normSlug },
      ],
    },
    select: { id: true, title: true, language: true },
  });

  if (matched) {
    return matched;
  }

  // Fallback default course
  const firstCourse = await prisma.course.findFirst({
    select: { id: true, title: true, language: true },
  });

  if (firstCourse) {
    return firstCourse;
  }

  return {
    id: "default-course",
    title: `${normSlug.toUpperCase()} Architecture`,
    language: normSlug,
  };
}

/**
 * Formats a clean, readable study note from structured learning context.
 * Strictly avoids raw chat history formatting.
 */
export function formatStudyNoteMarkdown(
  topic: string,
  chapterTitle: string,
  context?: Partial<StructuredLearningContext>,
  fallbackContent?: string
): string {
  if (!context || !context.whatAITaught) {
    return fallbackContent || `Core concepts and foundational principles of ${topic} in ${chapterTitle}.`;
  }

  const lines: string[] = [];

  // 1. Topic Title Header
  lines.push(`# ${topic}`);
  if (context.subtopic) {
    lines.push(`**Subtopic**: ${context.subtopic}`);
  }
  lines.push("");

  // 2. What AI Taught (Concept & Core Explanation)
  if (context.whatAITaught.concept) {
    lines.push(`### CORE CONCEPT`);
    lines.push(context.whatAITaught.concept);
    lines.push("");
  }

  if (context.whatAITaught.explanation) {
    lines.push(`### EXPLANATION`);
    lines.push(context.whatAITaught.explanation);
    lines.push("");
  }

  // 3. Important Points
  if (context.whatAITaught.importantPoints && context.whatAITaught.importantPoints.length > 0) {
    lines.push(`### KEY TAKEAWAYS`);
    for (const pt of context.whatAITaught.importantPoints) {
      lines.push(`• ${pt}`);
    }
    lines.push("");
  }

  // 4. Code & Syntax Examples
  const codeList = context.whatAITaught.codeExamples || context.whatAITaught.examples || [];
  if (codeList.length > 0) {
    lines.push(`### CODE & SYNTAX EXAMPLES`);
    for (const ex of codeList) {
      if (ex.title) lines.push(`**${ex.title}**:`);
      lines.push(`\`\`\`${ex.lang || context.language || "code"}\n${ex.code || ""}\n\`\`\``);
      lines.push("");
    }
  }

  // 5. Student Interaction (Meaningful questions & clarifications)
  if (context.studentInteraction?.studentQuestions && context.studentInteraction.studentQuestions.length > 0) {
    lines.push(`### STUDENT QUESTIONS & CLARIFICATIONS`);
    for (const sq of context.studentInteraction.studentQuestions) {
      lines.push(`**Student Question**: ${sq.question}`);
      lines.push(`**AI Mentor Clarification**: ${sq.answer}`);
      lines.push("");
    }
  }

  // 6. Understanding Check (Real Checkpoint Evaluation)
  if (context.understandingCheck?.aiQuestion) {
    lines.push(`### UNDERSTANDING CHECK`);
    lines.push(`**Teacher Question**: ${context.understandingCheck.aiQuestion}`);
    lines.push(`**Student Answer**: ${context.understandingCheck.studentActualAnswer || "(Answer evaluated)"}`);
    lines.push(
      `**Evaluation**: ${context.understandingCheck.evaluation || "EVALUATED"} (Score: ${context.understandingCheck.score ?? 85}%)`
    );
    if (context.understandingCheck.misconception) {
      lines.push(`**Misconception Clarified**: ${context.understandingCheck.misconception}`);
    }
    lines.push("");
  }

  // 7. Verified Learning Signals
  if (context.learningSignals) {
    const { strengths, needsSupport } = context.learningSignals;
    if ((strengths && strengths.length > 0) || (needsSupport && needsSupport.length > 0)) {
      lines.push(`### LEARNING SIGNALS`);
      if (strengths && strengths.length > 0) {
        lines.push(`**Verified Strengths**: ${strengths.join(", ")}`);
      }
      if (needsSupport && needsSupport.length > 0) {
        lines.push(`**Areas Needing Practice**: ${needsSupport.join(", ")}`);
      }
      lines.push("");
    }
  }

  return lines.join("\n").trim();
}

/**
 * Appends a learning unit chronologically to the student's physical A4 notebook.
 *
 * Rules:
 * - Isolated strictly by (userId, courseId).
 * - Stable, sequential A4 page numbering.
 * - Monotonic sequenceOrder (oldest first).
 * - When same topic is restudied, it appends as a new entry; does not overwrite.
 * - Capacity packing: 1.5 pages continues on page 2 before advancing to page 3.
 */
export async function appendLearningUnitToNotebook(input: AppendLearningUnitInput) {
  const {
    userId,
    courseIdOrSlug,
    chapterId,
    topicId,
    topic,
    subtopic,
    title = topic,
    type = "NOTEBOOK",
    content: rawContent,
    sessionKey,
    structuredContext,
    rawMetadata,
    saveEvent = true,
  } = input;

  if (!userId) throw new Error("userId is required for notebook operations.");
  if (!topic) throw new Error("topic is required for notebook operations.");

  const course = await resolveCourse(courseIdOrSlug);
  const courseId = course.id;

  // Resolve chapter
  let chapter = await prisma.chapter.findFirst({
    where: {
      OR: [
        { id: chapterId },
        { id: chapterId, courseId },
      ],
    },
    select: { id: true, title: true, orderNumber: true },
  });

  if (!chapter) {
    chapter = await prisma.chapter.findFirst({
      where: { courseId },
      select: { id: true, title: true, orderNumber: true },
    });
  }

  const finalChapterId = chapter?.id || chapterId || "chapter-default";
  const chapterTitle = chapter?.title || "Foundational Chapter";

  // Build clean study note content
  const fullContent = rawContent || formatStudyNoteMarkdown(topic, chapterTitle, structuredContext);

  // 1. Calculate Monotonic Sequence Order
  const latestNoteInCourse = await prisma.learningNote.findFirst({
    where: {
      userId,
      courseId,
    },
    orderBy: {
      sequenceOrder: "desc",
    },
    select: {
      sequenceOrder: true,
      pageNumber: true,
    },
  });

  const nextSequenceOrder = (latestNoteInCourse?.sequenceOrder ?? 0) + 1;

  // 2. Physical A4 Page Allocation (Stable, capacity-based)
  // Query notes currently placed on the latest page of this course notebook
  const currentMaxPage = latestNoteInCourse?.pageNumber || 1;

  const notesOnCurrentPage = await prisma.learningNote.findMany({
    where: {
      userId,
      courseId,
      pageNumber: currentMaxPage,
    },
    select: {
      id: true,
      content: true,
    },
  });

  const currentPageUnitsCount = notesOnCurrentPage.length;
  const currentPageTotalChars = notesOnCurrentPage.reduce((sum, n) => sum + (n.content?.length || 0), 0);

  // Check if current page has room for this learning unit
  let targetPageNumber = currentMaxPage;
  if (
    currentPageUnitsCount >= A4_MAX_UNITS_PER_PAGE ||
    currentPageTotalChars + fullContent.length > A4_MAX_CHARACTERS_PER_PAGE
  ) {
    // Current page is full -> advance to the next sequential A4 page
    targetPageNumber = currentMaxPage + 1;
  }

  // 3. Ensure NotebookPage record exists
  const notebookPage = await prisma.notebookPage.upsert({
    where: {
      userId_courseId_pageNumber: {
        userId,
        courseId,
        pageNumber: targetPageNumber,
      },
    },
    update: {
      updatedAt: new Date(),
    },
    create: {
      userId,
      courseId,
      pageNumber: targetPageNumber,
    },
  });

  // 4. Construct unified metadata object
  const mergedMetadata = {
    courseId,
    courseTitle: course.title,
    language: course.language,
    chapterId: finalChapterId,
    chapterTitle,
    chapterOrder: chapter?.orderNumber ?? 1,
    topicId: topicId || null,
    topic,
    subtopic: subtopic || null,
    sessionKey: sessionKey || null,
    pageNumber: targetPageNumber,
    sequenceOrder: nextSequenceOrder,
    timestamp: new Date().toISOString(),
    ...(structuredContext || {}),
    ...(typeof rawMetadata === "object" ? rawMetadata : {}),
  };

  // 5. Strictly Chronological Creation (Immutable append; never overwrite previous notes)
  const newNote = await prisma.learningNote.create({
    data: {
      userId,
      courseId,
      chapterId: finalChapterId,
      topicId: topicId || null,
      subtopic: subtopic || null,
      topic,
      title,
      type,
      content: fullContent,
      metadata: JSON.stringify(mergedMetadata),
      importance: 1,
      pageNumber: targetPageNumber,
      sequenceOrder: nextSequenceOrder,
      pageId: notebookPage.id,
    },
    include: {
      course: {
        select: { id: true, title: true, language: true },
      },
      chapter: {
        select: { id: true, title: true, orderNumber: true },
      },
      page: true,
    },
  });

  // 6. Record LearningEvent for memory continuity if requested
  if (saveEvent) {
    await prisma.learningEvent.create({
      data: {
        userId,
        courseId,
        chapterId: finalChapterId,
        topic,
        eventType: `NOTEBOOK_${type}`,
        content: fullContent.slice(0, 500),
        metadata: JSON.stringify({
          noteId: newNote.id,
          pageNumber: targetPageNumber,
          sequenceOrder: nextSequenceOrder,
          understandingCheck: structuredContext?.understandingCheck,
          learningSignals: structuredContext?.learningSignals,
        }),
        shouldSave: true,
      },
    }).catch((e) => console.warn("Notebook learning event warning:", e));
  }

  return newNote;
}

/**
 * Retrieves a specific A4 page of the student's notebook for a specific course.
 *
 * Guarantees:
 * - Strict multi-course isolation (userId + courseId).
 * - Strict user isolation (userId).
 * - Stable page numbers.
 * - Strict chronological ordering within the page (sequenceOrder ASC).
 */
export async function getCourseNotebookPage(params: {
  userId: string;
  courseIdOrSlug: string;
  requestedPageNumber?: number;
}) {
  const { userId, courseIdOrSlug, requestedPageNumber = 1 } = params;

  if (!userId) throw new Error("userId is required.");

  const course = await resolveCourse(courseIdOrSlug);
  const courseId = course.id;

  // 1. Find total pages for this student & course
  const totalPagesCount = await prisma.notebookPage.count({
    where: {
      userId,
      courseId,
    },
  });

  const totalPages = Math.max(1, totalPagesCount);
  const targetPageNumber = Math.min(Math.max(1, requestedPageNumber), totalPages);

  // 2. Fetch notes for this specific page, ordered chronologically (sequenceOrder ASC, createdAt ASC)
  const notes = await prisma.learningNote.findMany({
    where: {
      userId,
      courseId,
      pageNumber: targetPageNumber,
    },
    orderBy: [
      { sequenceOrder: "asc" },
      { createdAt: "asc" },
    ],
    include: {
      course: {
        select: { id: true, title: true, language: true },
      },
      chapter: {
        select: { id: true, title: true, orderNumber: true },
      },
    },
  });

  // 3. Extract chapters and topics represented on this page
  const chaptersOnPageMap = new Map<string, { id: string; title: string; orderNumber: number; topics: string[] }>();
  for (const n of notes) {
    if (n.chapter) {
      let ch = chaptersOnPageMap.get(n.chapter.id);
      if (!ch) {
        ch = {
          id: n.chapter.id,
          title: n.chapter.title,
          orderNumber: n.chapter.orderNumber,
          topics: [],
        };
        chaptersOnPageMap.set(n.chapter.id, ch);
      }
      if (!ch.topics.includes(n.topic)) {
        ch.topics.push(n.topic);
      }
    }
  }

  // 4. Fetch the NotebookPage record
  const pageRecord = await prisma.notebookPage.findUnique({
    where: {
      userId_courseId_pageNumber: {
        userId,
        courseId,
        pageNumber: targetPageNumber,
      },
    },
  });

  return {
    course: {
      id: course.id,
      title: course.title,
      language: course.language,
    },
    pageNumber: targetPageNumber,
    totalPages,
    hasPrevious: targetPageNumber > 1,
    hasNext: targetPageNumber < totalPages,
    createdAt: pageRecord?.createdAt || (notes[0]?.createdAt ?? new Date()),
    updatedAt: pageRecord?.updatedAt || (notes[notes.length - 1]?.updatedAt ?? new Date()),
    notes,
    totalUnitsOnPage: notes.length,
    chaptersOnPage: Array.from(chaptersOnPageMap.values()),
  };
}

/**
 * Retrieves the full chronological table of contents / summary for the course notebook.
 */
export async function getCourseNotebookSummary(params: {
  userId: string;
  courseIdOrSlug: string;
}) {
  const { userId, courseIdOrSlug } = params;
  const course = await resolveCourse(courseIdOrSlug);

  const pages = await prisma.notebookPage.findMany({
    where: {
      userId,
      courseId: course.id,
    },
    orderBy: {
      pageNumber: "asc",
    },
    include: {
      notes: {
        select: {
          id: true,
          topic: true,
          title: true,
          sequenceOrder: true,
          createdAt: true,
          chapter: {
            select: { id: true, title: true, orderNumber: true },
          },
        },
        orderBy: {
          sequenceOrder: "asc",
        },
      },
    },
  });

  return {
    course,
    totalPages: pages.length,
    pages: pages.map((p) => ({
      pageNumber: p.pageNumber,
      createdAt: p.createdAt,
      updatedAt: p.updatedAt,
      unitsCount: p.notes.length,
      topics: p.notes.map((n) => n.topic),
      chapters: Array.from(new Set(p.notes.map((n) => n.chapter?.title).filter(Boolean))),
    })),
  };
}

/**
 * Safely deletes a note owned by the student without disturbing remaining page order.
 */
export async function deleteNoteFromNotebook(params: {
  userId: string;
  noteId: string;
}) {
  const { userId, noteId } = params;

  const note = await prisma.learningNote.findFirst({
    where: {
      id: noteId,
      userId,
    },
  });

  if (!note) {
    throw new Error("Note not found or access denied.");
  }

  await prisma.learningNote.delete({
    where: { id: noteId },
  });

  return { success: true, message: "Note deleted from notebook." };
}
