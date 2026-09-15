/**
 * KnowledgeStream AI — Adaptive Teaching Strategy & Reteach Adapter
 *
 * Implements:
 * - Silent, positive pedagogical adaptation based on student's dynamic profile
 * - Misconception-targeted Teach Again generation
 * - Professional, non-derogatory educational encouragement
 */

import { AdaptiveTeachingStrategy, StudentMasteryLevel, TopicLearningProfile } from "./types";

export function getAdaptiveTeachingStrategy(
  profile: TopicLearningProfile | null
): AdaptiveTeachingStrategy {
  const level: StudentMasteryLevel = profile?.level || "NOT_ENOUGH_DATA";

  switch (level) {
    case "NEEDS_SUPPORT":
      return {
        level,
        recommendedDifficulty: "BEGINNER",
        teachingInstruction: `Explain this concept using a clear, everyday real-world analogy. Keep sentences short and conversational. Avoid complex technical jargon. Provide one concrete 2-line visual code example and step-by-step intuition. Check in gently.`,
        pedagogicalTone: "Warm, highly intuitive, encouraging, and step-by-step.",
        exampleComplexity: "TINY_ANALOGY",
        questionComplexity: "INTUITIVE",
        encouragePhrase: "Let's strengthen this concept step-by-step with a simple analogy.",
      };

    case "DEVELOPING":
    case "NOT_ENOUGH_DATA":
      return {
        level,
        recommendedDifficulty: "INTERMEDIATE",
        teachingInstruction: `Provide a balanced, structured explanation connecting the 'why' and 'how'. Include a realistic practical code example. Explain the sequence of execution and common usage patterns clearly.`,
        pedagogicalTone: "Clear, practical, focused, and interactive.",
        exampleComplexity: "MODERATE_STANDARD",
        questionComplexity: "APPLIED",
        encouragePhrase: "Let's build on this concept with practical, real-world examples.",
      };

    case "STRONG":
    case "ADVANCED":
      return {
        level,
        recommendedDifficulty: "ADVANCED",
        teachingInstruction: `Provide deep architectural and conceptual insights. Focus on edge cases, memory and runtime complexity tradeoffs, design choices, and subtle pitfalls in real systems. Provide a challenging, realistic example.`,
        pedagogicalTone: "Analytical, rigorous, stimulating, and advanced.",
        exampleComplexity: "DEEP_EDGE_CASES",
        questionComplexity: "ARCHITECTURAL",
        encouragePhrase: "You have a solid foundation here. Let's explore the deeper edge cases and optimization tradeoffs.",
      };
  }
}

/**
 * Constructs a targeted, misconception-addressing prompt for Teach Again
 */
export function buildAdaptiveReteachPrompt(params: {
  topic: string;
  attemptNumber: number;
  misconceptions?: string[];
  missingConcepts?: string[];
  studentPreviousAnswer?: string;
}): string {
  const { topic, attemptNumber, misconceptions = [], missingConcepts = [], studentPreviousAnswer } = params;

  let base = "";
  if (attemptNumber === 2) {
    base = `Explain ${topic} in much simpler terms with a vivid real-world analogy and short, accessible sentences. Focus purely on the core intuition.`;
  } else if (attemptNumber === 3) {
    base = `Explain ${topic} using a concrete, 2-line code example and a variable-by-variable trace. Make it impossible to misunderstand.`;
  } else {
    base = `Provide the simplest, most direct explanation possible for ${topic}, breaking the single core idea down into two crystal-clear steps.`;
  }

  // Address Specific Misconceptions
  if (misconceptions.length > 0) {
    base += `\n\nCRUCIAL CLARIFICATION:\nThe student had this specific misconception: "${misconceptions[0]}". Gently clarify this exact point without shaming the student or mentioning test results.`;
  } else if (missingConcepts.length > 0) {
    base += `\n\nFOCUS AREA:\nMake sure to explicitly explain: "${missingConcepts[0]}".`;
  }

  if (studentPreviousAnswer) {
    base += `\nStudent previously wrote: "${studentPreviousAnswer}". Help them see the correct perspective naturally.`;
  }

  return base;
}

/**
 * Builds an adaptive Quick Recap for the student's last meaningful lesson.
 * Tailors explanation to student's level and directly addresses any active misconceptions.
 */
export function buildAdaptiveQuickRecap(params: {
  topic: string;
  course: string;
  chapterTitle?: string;
  profile: TopicLearningProfile | null;
}): { recapText: string; question: string } {
  const { topic, course, chapterTitle, profile } = params;
  const level = profile?.level || "DEVELOPING";
  const misconceptions = profile?.misconceptions || [];
  const weaknesses = profile?.weaknesses || [];

  let recapText = `Welcome back! Last time, you studied ${topic}.`;

  // Explicit Misconception Correction
  if (misconceptions.length > 0) {
    recapText += `\n\nKey clarification to remember: ${misconceptions[0]}. Remember how the core logic actually operates step-by-step.`;
  } else if (weaknesses.length > 0) {
    recapText += `\n\nFocus reminder: Pay close attention to ${weaknesses[0]}.`;
  }

  // Level-tailored explanation
  if (level === "ADVANCED" || level === "STRONG") {
    recapText += `\nYou demonstrated solid understanding of the primary mechanics. Keep in mind how ${topic} impacts execution order, state management, and real-world system patterns in ${course.toUpperCase()}.`;
  } else if (level === "NEEDS_SUPPORT") {
    recapText += `\nLet's keep it super intuitive: think of ${topic} like a predictable step-by-step routine where every action directly follows the rules we established.`;
  } else {
    recapText += `\nYou learned the fundamental structure of ${topic} and how its conditions control program flow.`;
  }

  // Adaptive Question Generation
  let question = `In your own words, what is the most important rule to remember about ${topic}?`;
  if (misconceptions.length > 0) {
    question = `How does ${topic} actually decide when and how to execute, and why is "${misconceptions[0]}" incorrect?`;
  } else if (level === "ADVANCED" || level === "STRONG") {
    question = `How does ${topic} behave in edge cases or when dealing with varying inputs?`;
  } else if (level === "NEEDS_SUPPORT") {
    question = `What is the simple purpose of ${topic} in a program?`;
  }

  return { recapText, question };
}

/**
 * Builds a structured, cross-concept Chapter Recap synthesizing the entire chapter.
 */
export function buildAdaptiveChapterRecap(params: {
  chapterTitle: string;
  course: string;
  analysis: import("./types").ChapterLearningAnalysis;
}): { recapText: string; question: string } {
  const { chapterTitle, course, analysis } = params;

  let recapText = `🎓 Welcome to the Chapter Recap for ${chapterTitle} in ${course.toUpperCase()}!`;
  recapText += `\n\nYou have completed every core section in this chapter. Let's look at how all these concepts connect together:`;

  if (analysis.strongTopics.length > 0) {
    const strongList = analysis.strongTopics.map((t) => t.topic).join(", ");
    recapText += `\n\n⭐ Your Strongest Concepts: You demonstrated outstanding mastery in ${strongList}.`;
  }

  if (analysis.developingTopics.length > 0) {
    const devList = analysis.developingTopics.map((t) => t.topic).join(", ");
    recapText += `\n\n📈 Progressing Well: ${devList} are coming together nicely.`;
  }

  if (analysis.needsSupportTopics.length > 0) {
    const weakList = analysis.needsSupportTopics.map((t) => t.topic).join(", ");
    recapText += `\n\n🎯 Targeted Review: Spend extra attention on ${weakList}.`;

    const allMisconceptions = analysis.needsSupportTopics
      .flatMap((t) => t.misconceptions)
      .filter(Boolean);
    if (allMisconceptions.length > 0) {
      recapText += ` Specifically remember: ${allMisconceptions[0]}.`;
    }
  }

  recapText += `\n\nIn real software engineering, these individual concepts are never used in isolation—they work together as a cohesive system.`;

  // Cross-concept synthesis question
  const topicA = analysis.strongTopics[0]?.topic || analysis.developingTopics[0]?.topic || "the first concept";
  const topicB = analysis.needsSupportTopics[0]?.topic || analysis.developingTopics[0]?.topic || "the next concept";

  const question =
    analysis.totalTopics >= 2
      ? `Explain how ${topicA} and ${topicB} connect together to solve a practical problem in ${course.toUpperCase()}.`
      : `How do the core ideas in ${chapterTitle} connect together to write clean, reliable ${course.toUpperCase()} code?`;

  return { recapText, question };
}

