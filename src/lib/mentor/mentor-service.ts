import { prisma } from "../prisma";
import { MentorActionSuggestion, MentorContext, MentorKnowledgeSummary } from "./types";
import { getStudentKnowledgeState } from "../knowledge-graph/graph-service";
import { getPersonalizedLearningPath } from "../learning-path/path-engine";
import { SupportedCourse } from "../knowledge-graph/types";

const ALL_COURSES: SupportedCourse[] = ["python", "c", "cpp", "java"];

const COURSE_TITLES: Record<SupportedCourse, string> = {
  python: "Python Programming",
  c: "C Programming",
  cpp: "C++ Object-Oriented Programming",
  java: "Java Enterprise Development",
};

/**
 * Build a compact, comprehensive mentor context for an authenticated student
 */
export async function buildMentorContext(
  userId: string,
  preferredCourse?: SupportedCourse
): Promise<MentorContext> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      email: true,
      name: true,
      xp: true,
      currentStreak: true,
    },
  });

  if (!user) {
    throw new Error("Student not found.");
  }

  const activeCourse: SupportedCourse = preferredCourse || "python";

  // 1. Gather Knowledge Summaries across enrolled/active courses
  const summaries: MentorKnowledgeSummary[] = [];

  for (const course of ALL_COURSES) {
    const knowledgeState = await getStudentKnowledgeState(user.id, course);
    const path = await getPersonalizedLearningPath(user.id, course);

    summaries.push({
      course,
      courseTitle: COURSE_TITLES[course],
      overallMastery: knowledgeState.overallMasteryPercentage,
      strongConcepts: knowledgeState.strongConcepts.map((c) => ({ slug: c.slug, name: c.name })),
      developingConcepts: knowledgeState.developingConcepts.map((c) => ({ slug: c.slug, name: c.name })),
      weakConcepts: knowledgeState.weakConcepts.map((c) => ({ slug: c.slug, name: c.name })),
      prerequisiteGaps: knowledgeState.prerequisiteGaps.map((g) => ({
        conceptName: g.concept.name,
        missingPrerequisites: g.missingPrerequisites.map((p) => p.name),
      })),
      recentMistakes: knowledgeState.recentMistakes,
      focusTopic: path.currentFocusTopic,
      recommendedAction: path.recommendedNextAction,
      educationalRationale: path.educationalRationale,
    });
  }

  // 2. Fetch recent learning events (capped at 5 to keep context lightweight)
  const events = await prisma.learningEvent.findMany({
    where: { userId: user.id },
    orderBy: { createdAt: "desc" },
    take: 5,
    select: {
      topic: true,
      eventType: true,
      content: true,
      createdAt: true,
    },
  });

  // 3. Fetch recent pinned or important learning notes (capped at 3)
  const notes = await prisma.learningNote.findMany({
    where: { userId: user.id },
    orderBy: [{ isPinned: "desc" }, { createdAt: "desc" }],
    take: 3,
    select: {
      title: true,
      topic: true,
      content: true,
    },
  });

  return {
    student: {
      id: user.id,
      email: user.email,
      name: user.name || "Student",
      xp: user.xp,
      currentStreak: user.currentStreak,
    },
    activeCourse,
    knowledgeSummaries: summaries,
    recentEvents: events.map((e) => ({
      topic: e.topic,
      eventType: e.eventType,
      summary: e.content,
      timestamp: e.createdAt.toISOString(),
    })),
    recentNotes: notes.map((n) => ({
      title: n.title,
      topic: n.topic,
      content: n.content.slice(0, 200),
    })),
  };
}

/**
 * Generate empathetic, tailored guidance from the AI Mentor based on verified evidence
 */
export async function generateMentorGuidance(
  context: MentorContext,
  studentQuery: string
): Promise<{ text: string; actions: MentorActionSuggestion[] }> {
  const activeSummary =
    context.knowledgeSummaries.find((s) => s.course === context.activeCourse) ||
    context.knowledgeSummaries[0];

  const actions: MentorActionSuggestion[] = [];

  // Generate appropriate action suggestions based on personalized path & query
  if (activeSummary.recommendedAction === "RETEACH" || activeSummary.recommendedAction === "REVIEW") {
    actions.push({
      type: "REVIEW_PREREQUISITE",
      label: `Review ${activeSummary.focusTopic}`,
      topic: activeSummary.focusTopic,
      courseSlug: activeSummary.course,
      reason: activeSummary.educationalRationale,
    });
  } else if (activeSummary.recommendedAction === "PRACTICE") {
    actions.push({
      type: "START_ASSESSMENT",
      label: `Practice ${activeSummary.focusTopic}`,
      topic: activeSummary.focusTopic,
      courseSlug: activeSummary.course,
      reason: "Reinforce understanding with adaptive questions",
    });
  } else {
    actions.push({
      type: "NAVIGATE_TOPIC",
      label: `Continue to ${activeSummary.focusTopic}`,
      topic: activeSummary.focusTopic,
      courseSlug: activeSummary.course,
      reason: activeSummary.educationalRationale,
    });
  }

  // Attempt backend AI generation with persona constraints
  try {
    const prompt = `
You are the AI Mentor for KnowledgeStream AI.
You provide long-term learning guidance, encouragement, and strategic learning advice.
You are NOT Ask AI (which is only for a specific paragraph/note). You understand the student's broader journey.

STUDENT PROFILE:
Name: ${context.student.name}
XP: ${context.student.xp}
Streak: ${context.student.currentStreak} days

CURRENT COURSE: ${activeSummary.courseTitle} (${activeSummary.course.toUpperCase()})
Overall Mastery: ${activeSummary.overallMastery}%
Current Focus: ${activeSummary.focusTopic}
Recommended Action: ${activeSummary.recommendedAction}
Rationale: ${activeSummary.educationalRationale}

KNOWLEDGE SUMMARY:
Strong Concepts (${activeSummary.strongConcepts.length}): ${activeSummary.strongConcepts.map((c) => c.name).join(", ") || "None yet"}
Developing Concepts (${activeSummary.developingConcepts.length}): ${activeSummary.developingConcepts.map((c) => c.name).join(", ") || "None yet"}
Weak Concepts (${activeSummary.weakConcepts.length}): ${activeSummary.weakConcepts.map((c) => c.name).join(", ") || "None yet"}
Recent Mistakes / Notes: ${activeSummary.recentMistakes.join("; ") || "None recorded"}

STUDENT QUESTION:
"${studentQuery}"

INSTRUCTIONS:
1. Speak directly, warmly, and constructively.
2. Ground your advice in their REAL progress data above. NEVER invent fake scores or fake mastery.
3. If they ask what to do next, align with the recommended action: ${activeSummary.recommendedAction} on "${activeSummary.focusTopic}".
4. If they struggle, encourage them and explain the concept prerequisite connection clearly.
5. Keep your response concise, actionable, and structured with clean markdown.
`;

    const teachUrl = process.env.DJANGO_TEACH_URL || "http://127.0.0.1:8000/api/ai/teach/";
    const headers: Record<string, string> = { "Content-Type": "application/json" };
    if (process.env.INTERNAL_API_SECRET) {
      headers["X-Internal-Secret"] = process.env.INTERNAL_API_SECRET;
    }
    const response = await fetch(teachUrl, {
      method: "POST",
      headers,
      body: JSON.stringify({
        course: activeSummary.courseTitle,
        chapter: activeSummary.focusTopic,
        topic: "AI Mentor Guidance",
        content: prompt,
        question: studentQuery,
        mode: "chat",
      }),
    });

    const data = await response.json();
    const aiText = data.data?.response ?? data.response ?? "";

    if (aiText) {
      return { text: aiText, actions };
    }
  } catch (error) {
    console.error("Mentor backend AI call failed, providing grounded fallback:", error);
  }

  // Grounded pedagogical fallback when backend is unreachable
  let fallbackText = `Hi ${context.student.name}! Based on your current progress in **${activeSummary.courseTitle}** (Mastery: ${activeSummary.overallMastery}%):\n\n`;

  if (activeSummary.weakConcepts.length > 0) {
    fallbackText += `🎯 **Target Focus Area**: I noticed you're currently working through **${activeSummary.weakConcepts[0].name}**. ${activeSummary.educationalRationale}\n\n`;
    fallbackText += `I recommend reviewing the foundational lessons and taking an adaptive assessment to build confidence.`;
  } else if (activeSummary.developingConcepts.length > 0) {
    fallbackText += `🚀 **Great Progress**: You're developing solid grasp in **${activeSummary.developingConcepts[0].name}**!\n\n`;
    fallbackText += `Let's tackle targeted practice exercises on **${activeSummary.focusTopic}** next to cement mastery.`;
  } else {
    fallbackText += `✨ **Ready to Learn**: You're doing great with a **${context.student.currentStreak}-day streak**!\n\n`;
    fallbackText += `Your next scheduled topic is **${activeSummary.focusTopic}**. ${activeSummary.educationalRationale}`;
  }

  return { text: fallbackText, actions };
}
