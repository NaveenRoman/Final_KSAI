import { NextResponse } from "next/server";
import { cookies, headers } from "next/headers";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { parseSessionToken } from "@/lib/auth-cookie";
import fs from "fs/promises";
import path from "path";
import {
  normalizeQuestionText,
  getQuestionHash,
  isDuplicateQuestion,
  getQuestionMarks,
} from "@/lib/practice-utils";
import { DSA_PROBLEM_BANK, DsaCodingQuestion } from "@/lib/dsa-questions-bank";

type GenConfig = {
  difficulty?: string;
  count?: number;
  types?: string[];
  timer?: number | null;
  retryMode?: string;
};

function shuffleArray<T>(items: T[]): T[] {
  const copy = [...items];
  for (let i = copy.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

async function safeReadMarkdown(relPath: string): Promise<string> {
  try {
    const base = process.cwd();
    const safe = path.normalize(relPath).replace(/^(\.\.(\/|\\|$))+/, "");
    const abs = path.join(/*turbopackIgnore: true*/ base, safe);
    if (!abs.startsWith(base)) return "";
    return await fs.readFile(abs, "utf-8");
  } catch {
    return "";
  }
}

function extractTopicsFromMarkdown(md: string): string[] {
  const topics = new Set<string>();
  const headingRe = /^#{1,3}\s+(.*)$/gm;
  let m: RegExpExecArray | null;

  while ((m = headingRe.exec(md))) {
    const t = m[1].trim();
    if (t) topics.add(t.replace(/[`*[\]()]/g, ""));
  }

  const sentences = md
    .split(/\n|\./)
    .map((s) => s.trim())
    .filter(Boolean);

  for (const s of sentences.slice(0, 30)) {
    if (s.length > 10 && s.length < 80) {
      topics.add(s.split(" ").slice(0, 6).join(" "));
    }
  }

  return Array.from(topics).filter(Boolean);
}

function shuffleMcqOptions(question: any) {
  if (
    question.type !== "mcq" ||
    !Array.isArray(question.options) ||
    question.options.length < 2
  ) {
    return question;
  }

  const originalOptions = [...question.options];
  let correctValue: any;

  if (
    typeof question.correctAnswer === "number" &&
    question.correctAnswer >= 0 &&
    question.correctAnswer < originalOptions.length
  ) {
    correctValue = originalOptions[question.correctAnswer];
  } else if (
    typeof question.answer === "number" &&
    question.answer >= 0 &&
    question.answer < originalOptions.length
  ) {
    correctValue = originalOptions[question.answer];
  } else {
    correctValue = question.correctAnswer ?? question.answer;
  }

  const shuffledOptions = shuffleArray(originalOptions);
  let newCorrectIndex = shuffledOptions.findIndex(
    (opt) => String(opt).trim() === String(correctValue).trim()
  );

  if (newCorrectIndex === -1 && typeof correctValue === "string") {
    newCorrectIndex = shuffledOptions.findIndex(
      (opt) =>
        String(opt).trim().toLowerCase() === String(correctValue).trim().toLowerCase()
    );
  }

  if (newCorrectIndex === -1) {
    newCorrectIndex = 0;
  }

  return {
    ...question,
    options: shuffledOptions,
    correctAnswer: newCorrectIndex,
    answer: newCorrectIndex,
  };
}

async function callOpenAI(messages: any, apiKey: string) {
  try {
    const res = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: process.env.OPENAI_MODEL || "gpt-4o-mini",
        messages,
        temperature: 0.7,
        max_tokens: 2500,
      }),
    });

    if (!res.ok) {
      const text = await res.text();
      console.error("OpenAI API call failed with response:", text);
      return null;
    }

    return await res.json();
  } catch (e) {
    console.error("OpenAI exception:", e);
    return null;
  }
}

function parseJsonArrayFromAI(text: string): any[] | null {
  if (!text || !String(text).trim()) return null;

  const raw = String(text).trim();
  const fenced = raw.match(/```(?:json)?\s*([\s\S]*?)\s*```/i)?.[1] || raw;
  const compact = fenced.replace(/```/g, "").trim();
  const start = compact.indexOf("[");
  const end = compact.lastIndexOf("]");

  if (start >= 0 && end >= 0 && end > start) {
    return JSON.parse(compact.slice(start, end + 1));
  }

  return JSON.parse(compact);
}

function validateAndCleanQuestion(
  question: any,
  idx: number,
  topicsPool: string[],
  existingHashes: Set<string>
): any | null {
  if (!question || typeof question !== "object") return null;

  const questionText = String(question.question ?? "").trim();
  if (!questionText) return null;

  // Strict deduplication check
  if (isDuplicateQuestion(questionText, existingHashes)) {
    return null;
  }

  const id = String(question.id ?? `q_${Date.now()}_${idx}_${Math.floor(Math.random() * 10000)}`).trim();

  const rawType = String(question.type ?? "mcq").toLowerCase();
  const type =
    rawType === "code" || rawType === "coding"
      ? "coding"
      : rawType === "short" || rawType === "conceptual" || rawType === "theory"
      ? "conceptual"
      : "mcq";

  const difficulty = String(question.difficulty ?? "medium").toLowerCase();
  const normalizedDifficulty = ["easy", "medium", "hard"].includes(difficulty) ? difficulty : "medium";
  const marks = getQuestionMarks(normalizedDifficulty, type);
  const topic = String(question.topic || topicsPool[idx % Math.max(1, topicsPool.length)] || "General").trim();

  if (type === "mcq") {
    const options = Array.isArray(question.options) ? question.options.map(String) : [];
    if (options.length < 2) return null;
    const answer = question.correctAnswer ?? question.answer ?? 0;

    existingHashes.add(getQuestionHash(questionText));
    return {
      id,
      question: questionText,
      type: "mcq",
      difficulty: normalizedDifficulty,
      topic,
      marks,
      options,
      correctAnswer: answer,
      answer,
      explanation: String(question.explanation || "Review the course materials to understand this concept."),
    };
  }

  if (type === "coding") {
    const starterCode = String(question.starterCode || "// Write your code solution here\n");
    const testCases = Array.isArray(question.testCases) ? question.testCases : [];
    const expectedOutput = String(question.expectedOutput ?? question.correctAnswer ?? question.answer ?? "Expected Output");

    existingHashes.add(getQuestionHash(questionText));
    return {
      id,
      question: questionText,
      type: "coding",
      difficulty: normalizedDifficulty,
      topic,
      marks: 5,
      starterCode,
      testCases,
      expectedOutput,
      correctAnswer: expectedOutput,
      answer: expectedOutput,
      explanation: String(question.explanation || "Implement optimal logic considering time and space complexity."),
    };
  }

  // Conceptual
  const answer = String(question.correctAnswer ?? question.answer ?? "Clear analytical solution.");
  existingHashes.add(getQuestionHash(questionText));
  return {
    id,
    question: questionText,
    type: "conceptual",
    difficulty: normalizedDifficulty,
    topic,
    marks,
    options: [],
    correctAnswer: answer,
    answer,
    explanation: String(question.explanation || "Ensure a comprehensive explanation of theoretical concepts."),
  };
}

/**
 * MANDATORY INTELLIGENT FALLBACK GENERATOR
 * Uses real course topics and concrete DSA problem bank.
 * Strictly guarantees ZERO repetition via normalized text hashes.
 */
function buildIntelligentLocalFallback({
  courseTitle,
  topicsPool,
  count,
  requestedTypes,
  existingHashes,
}: {
  courseTitle: string;
  topicsPool: string[];
  count: number;
  requestedTypes: string[];
  existingHashes: Set<string>;
}): any[] {
  const safeTopics = shuffleArray(
    topicsPool.length > 0 ? topicsPool : ["Arrays", "Strings", "HashMaps", "Algorithms", "Logic & Control"]
  );

  const includesCoding = requestedTypes.includes("coding") || requestedTypes.includes("code") || requestedTypes.length === 0;
  const includesConceptual = requestedTypes.includes("conceptual") || requestedTypes.includes("short") || requestedTypes.includes("theory") || requestedTypes.length === 0;
  const includesMcq = requestedTypes.includes("mcq") || requestedTypes.length === 0;

  const fallbackQuestions: any[] = [];
  const shuffledDsaBank = shuffleArray([...DSA_PROBLEM_BANK]);
  let dsaIndex = 0;

  // Target Distribution Ratio: 50% MCQ, 30% Conceptual, 20% Coding
  const codingSlots = includesCoding ? Math.max(1, Math.round(count * 0.20)) : 0;
  const conceptualSlots = includesConceptual ? Math.round(count * 0.30) : 0;

  for (let i = 0; i < count; i++) {
    const topic = safeTopics[i % safeTopics.length] || "General Concepts";
    const difficulty = i % 4 === 0 ? "hard" : i % 3 === 0 ? "easy" : "medium";
    const uniqueId = `fb_${Date.now()}_${i}_${Math.floor(Math.random() * 100000)}`;

    let qType: "mcq" | "conceptual" | "coding" = "mcq";
    if (i < codingSlots && includesCoding) {
      qType = "coding";
    } else if (i < codingSlots + conceptualSlots && includesConceptual) {
      qType = "conceptual";
    } else if (includesMcq) {
      qType = "mcq";
    }

    if (qType === "coding") {
      // Pick concrete DSA problem from problem bank if available
      const dsaProblem = shuffledDsaBank[dsaIndex % shuffledDsaBank.length];
      dsaIndex++;

      const questionText = dsaProblem
        ? `${dsaProblem.question}\n\n[Topic Context: ${topic} in ${courseTitle}]`
        : `[DSA Challenge] Implement ${topic} Algorithm in ${courseTitle}\n\nGiven an array/sequence of elements, implement an optimal O(N) solution for ${topic}.\n\nConstraints:\n- Time: O(N), Space: O(1)\n- Input Format: Array/Sequence\n- Output Format: Processed Result`;

      if (!isDuplicateQuestion(questionText, existingHashes)) {
        existingHashes.add(getQuestionHash(questionText));
        fallbackQuestions.push({
          id: uniqueId,
          type: "coding",
          difficulty: dsaProblem?.difficulty || difficulty,
          topic: dsaProblem?.topic || topic,
          marks: 5,
          question: questionText,
          starterCode: dsaProblem?.starterCode || `function solve(input) {\n  // Implement O(N) ${topic} solution\n  return input;\n}`,
          testCases: dsaProblem?.testCases || [
            { input: "Sample input 1", expected: "Expected result 1" },
            { input: "Sample input 2", expected: "Expected result 2" },
          ],
          expectedOutput: dsaProblem?.expectedOutput || "Expected Output",
          correctAnswer: dsaProblem?.correctAnswer || "Expected Output",
          answer: dsaProblem?.correctAnswer || "Expected Output",
          explanation: dsaProblem?.explanation || `Implement optimal logic for ${topic} handling edge conditions.`,
        });
      }
    } else if (qType === "conceptual") {
      const questionText = `[Conceptual Assessment] Describe the foundational principles of "${topic}" in ${courseTitle} and explain a real-world scenario where it is best applied.`;

      if (!isDuplicateQuestion(questionText, existingHashes)) {
        existingHashes.add(getQuestionHash(questionText));
        fallbackQuestions.push({
          id: uniqueId,
          type: "conceptual",
          difficulty,
          topic,
          marks: getQuestionMarks(difficulty, "conceptual"),
          question: questionText,
          options: [],
          correctAnswer: `The topic "${topic}" defines core rules in ${courseTitle}. It is applied when processing structured input streams and maintaining algorithmic stability.`,
          answer: `The topic "${topic}" defines core rules in ${courseTitle}. It is applied when processing structured input streams and maintaining algorithmic stability.`,
          explanation: `Understanding "${topic}" in ${courseTitle} enables clean architecture and proper exception handling.`,
        });
      }
    } else {
      // MCQ
      const questionText = `Which of the following represents the optimal approach for handling "${topic}" when building applications in ${courseTitle}?`;

      if (!isDuplicateQuestion(questionText, existingHashes)) {
        existingHashes.add(getQuestionHash(questionText));
        fallbackQuestions.push({
          id: uniqueId,
          type: "mcq",
          difficulty,
          topic,
          marks: getQuestionMarks(difficulty, "mcq"),
          question: questionText,
          options: [
            `Validate state mutations and handle input boundaries correctly for ${topic}`,
            `Bypass type validation and suppress runtime exception logging`,
            `Hardcode static parameters and expose internal private scopes`,
            `Ignore edge cases and rely on default global state mutation`,
          ],
          correctAnswer: 0,
          answer: 0,
          explanation: `In ${courseTitle}, managing "${topic}" requires input validation, maintaining predictable scope, and handling error conditions.`,
        });
      }
    }
  }

  return fallbackQuestions.map((q) => shuffleMcqOptions(q));
}

export async function POST(req: Request) {
  const existingHashes = new Set<string>();

  try {
    let sessionData = null;
    try {
      sessionData = await auth.api.getSession({ headers: req.headers });
    } catch {
      try {
        sessionData = await auth.api.getSession({ headers: await headers() });
      } catch {
        // ignore
      }
    }

    let user = sessionData?.user as any;

    if (!user) {
      const cookieStore = await cookies();
      const sessionTokenRaw =
        cookieStore.get("better-auth.session_token")?.value ||
        cookieStore.get("__Secure-better-auth.session_token")?.value ||
        cookieStore.get("sessionToken")?.value;

      if (sessionTokenRaw) {
        const rawToken = parseSessionToken(sessionTokenRaw);
        const dbSession = await db.session.findUnique({
          where: { token: rawToken },
          include: { user: true },
        });
        if (dbSession && new Date() < dbSession.expiresAt) {
          user = dbSession.user;
        }
      }
    }

    if (!user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json().catch(() => ({}));
    const {
      courseId,
      chapters = [],
      topics = [],
      config = {} as GenConfig,
      proctored = false,
      retryQuestions = [],
      weakTopics = [],
      retryMode,
    } = body;

    if (!courseId) {
      return NextResponse.json({ error: "Missing courseId" }, { status: 400 });
    }

    const isRetryMode = retryMode === "wrong" || (Array.isArray(retryQuestions) && retryQuestions.length > 0);

    const enrollment = await db.enrollment.findFirst({
      where: { userId: user.id, courseId },
    });

    if (!enrollment) {
      return NextResponse.json({ error: "Not enrolled in course" }, { status: 403 });
    }

    const course = await db.course.findUnique({
      where: { id: courseId },
      include: { chapters: true },
    });

    if (!course) {
      return NextResponse.json({ error: "Course not found" }, { status: 404 });
    }

    const selectedChapters = course.chapters.filter((c: any) =>
      chapters.length > 0 ? chapters.includes(c.id) : true
    );

    const contents: string[] = [];
    for (const ch of selectedChapters) {
      if (ch.explanation) {
        const md = await safeReadMarkdown(ch.explanation);
        if (md) contents.push(`# Chapter: ${ch.title}\n${md}`);
      }
      if (ch.quizData) {
        try {
          const qd = JSON.parse(ch.quizData);
          contents.push(`Chapter Quiz Context: ${JSON.stringify(qd.slice(0, 3))}`);
        } catch {}
      }
    }

    const combinedContent = contents.join("\n\n").slice(0, 16000);
    const extractedTopics = extractTopicsFromMarkdown(combinedContent);
    const allCourseTopics = Array.from(
      new Set([
        ...extractedTopics,
        ...topics,
        ...selectedChapters.map((c: any) => c.title.replace(/Chapter \d+:?\s*/i, "")),
      ])
    ).filter(Boolean);

    // Fetch user's previous practice attempts to enforce strict anti-repetition
    const pastPractices = await db.practice.findMany({
      where: { userEmail: user.email, courseId },
      orderBy: { createdAt: "desc" },
      take: 25,
    });

    let historicalWeakTopics: string[] = [];

    for (const row of pastPractices) {
      try {
        const meta = row.meta ? JSON.parse(row.meta) : {};
        if (Array.isArray(meta.quiz)) {
          meta.quiz.forEach((q: any) => {
            if (q.question) {
              existingHashes.add(getQuestionHash(q.question));
            }
          });
        }
        if (Array.isArray(meta.weakTopics)) {
          historicalWeakTopics.push(...meta.weakTopics);
        }
      } catch {}
    }

    historicalWeakTopics = Array.from(new Set(historicalWeakTopics));

    const count = Math.max(1, Math.min(Number(config.count) || 10, 50));
    const requestedDifficulty = String(config.difficulty || "mixed").toLowerCase();
    const requestedTypes = Array.isArray(config.types) && config.types.length > 0
      ? config.types.map((t: string) => String(t).toLowerCase())
      : ["mcq", "coding", "conceptual"];

    // Target topics focus
    let targetTopics: string[] = [];
    if (isRetryMode) {
      const activeWeakPool = Array.from(new Set([...weakTopics, ...historicalWeakTopics]));
      targetTopics = activeWeakPool.length > 0 ? activeWeakPool : allCourseTopics;
    } else if (topics.length > 0) {
      targetTopics = topics;
    } else {
      targetTopics = shuffleArray(allCourseTopics);
    }

    if (targetTopics.length === 0) {
      targetTopics = [course.title, "Core Concepts", "Implementation", "Algorithms", "Logic Check"];
    }

    let generatedQuiz: any[] = [];
    let generationSource: "ai" | "fallback" = "fallback";

    const openAiKey = process.env.OPENAI_API_KEY || process.env.OPENAI_KEY;

    // AI Generation Attempt (Up to 3 Retries with Strict Deduplication)
    if (openAiKey) {
      const MAX_AI_ATTEMPTS = 3;

      const retryFocusPrompt = isRetryMode
        ? `RETRY MODE: Focus 100% of questions on these weak topics: ${targetTopics.join(", ")}. Generate NEW distinct question variations.`
        : "";

      for (let attempt = 1; attempt <= MAX_AI_ATTEMPTS; attempt++) {
        try {
          const systemPrompt = `You are a computer science professor creating a rigorous, non-repetitive practice exam for ${course.title}.
Return ONLY a valid JSON array of question objects matching the schema. No markdown wrappers outside the JSON array.
Strict Rules:
1. ZERO REPETITION: Every question must have unique problem phrasing and novel scenario.
2. CODING QUESTIONS MUST BE REAL DSA PROBLEMS (Arrays, Strings, HashMaps, Stack, Binary Search, Kadane's Algorithm). Include problem description, constraints, starter code, and test cases.
3. MCQs must have 4 clear options and correct answer index (0-3).
4. Respect question mix: Include MCQs, Conceptual, and Coding questions.`;

          const userPrompt = `
Course: ${course.title}
Target Difficulty: ${requestedDifficulty} (Marks: Easy=2, Medium=3, Hard=5, Coding=5)
Question Count: ${count}
Allowed Types: ${requestedTypes.join(", ")}
Topics Focus: ${targetTopics.join(", ")}
${retryFocusPrompt}

Context:
${combinedContent}

JSON Schema Required:
[
  {
    "id": "q_string",
    "type": "mcq" | "coding" | "conceptual",
    "difficulty": "easy" | "medium" | "hard",
    "topic": "Topic Name",
    "question": "Detailed question text / DSA problem description",
    "options": ["A", "B", "C", "D"], // for mcq
    "correctAnswer": 0,
    "explanation": "Clear explanation",
    "marks": 2 | 3 | 5,
    "starterCode": "code snippet",
    "testCases": [{"input": "nums=[1,2]", "expected": "[1,2]"}],
    "expectedOutput": "expected string output"
  }
]
`.trim();

          const aiResponse = await callOpenAI(
            [
              { role: "system", content: systemPrompt },
              { role: "user", content: userPrompt },
            ],
            openAiKey
          );

          const textOutput = aiResponse?.choices?.[0]?.message?.content;
          if (textOutput) {
            const parsed = parseJsonArrayFromAI(textOutput);
            if (Array.isArray(parsed) && parsed.length > 0) {
              const validatedList: any[] = [];
              for (let i = 0; i < parsed.length; i++) {
                const cleaned = validateAndCleanQuestion(parsed[i], i, targetTopics, existingHashes);
                if (cleaned) {
                  validatedList.push(cleaned);
                }
              }

              if (validatedList.length > 0) {
                generatedQuiz = validatedList;
                generationSource = "ai";
                break;
              }
            }
          }
        } catch (aiErr) {
          console.error(`AI attempt ${attempt} error:`, aiErr);
        }
      }
    }

    // MANDATORY FALLBACK: If AI failed or returned empty quiz, invoke Intelligent Local Generator
    if (generatedQuiz.length === 0) {
      console.log(`[Practice Generation] Generating fallback quiz locally for course "${course.title}".`);
      generatedQuiz = buildIntelligentLocalFallback({
        courseTitle: course.title,
        topicsPool: targetTopics,
        count,
        requestedTypes,
        existingHashes,
      });
      generationSource = "fallback";
    }

    // Fill remaining slots if fewer than requested count
    if (generatedQuiz.length < count) {
      const extraNeeded = count - generatedQuiz.length;
      const extraFallback = buildIntelligentLocalFallback({
        courseTitle: course.title,
        topicsPool: targetTopics,
        count: extraNeeded,
        requestedTypes,
        existingHashes,
      });
      generatedQuiz = [...generatedQuiz, ...extraFallback];
    }

    // Final quiz truncation, option shuffling, and remapping
    const finalQuiz = shuffleArray(generatedQuiz.slice(0, count)).map((q) => shuffleMcqOptions(q));

    const now = new Date();
    const newAttemptedHashes = Array.from(existingHashes);

    // Create practice session record in Prisma
    const record = await db.practice.create({
      data: {
        userEmail: user.email,
        courseId,
        meta: JSON.stringify({
          source: generationSource,
          generationSource: generationSource === "ai" ? "AI" : "fallback",
          chapters,
          topics: targetTopics,
          topicsUsed: Array.from(new Set(finalQuiz.map((q) => q.topic))),
          difficultyMix: requestedDifficulty,
          questionTypes: requestedTypes,
          quiz: finalQuiz,
          history: newAttemptedHashes,
          createdAt: now.toISOString(),
          challengeMode: proctored || false,
          courseTitle: course.title,
          retryMode: isRetryMode ? "wrong" : "standard",
        }),
      },
    });

    return NextResponse.json({
      success: true,
      sessionId: record.id,
      quiz: finalQuiz,
      questions: finalQuiz,
      meta: {
        source: generationSource,
        generationSource: generationSource === "ai" ? "AI" : "fallback",
        courseTitle: course.title,
        questionCount: finalQuiz.length,
        topicsUsed: Array.from(new Set(finalQuiz.map((q) => q.topic))),
        difficultyMix: requestedDifficulty,
      },
    });
  } catch (err) {
    console.error("Critical practice generation catch block:", err);

    try {
      const fallbackQuiz = buildIntelligentLocalFallback({
        courseTitle: "AI Practice Lab",
        topicsPool: ["Arrays", "Strings", "HashMaps", "Algorithms"],
        count: 10,
        requestedTypes: ["mcq", "coding", "conceptual"],
        existingHashes,
      });

      return NextResponse.json({
        success: true,
        sessionId: `fallback_session_${Date.now()}`,
        quiz: fallbackQuiz,
        questions: fallbackQuiz,
        meta: {
          source: "fallback",
          generationSource: "fallback",
          courseTitle: "AI Practice Lab",
          questionCount: fallbackQuiz.length,
        },
      });
    } catch {
      return NextResponse.json({ error: "Failed to generate practice session" }, { status: 500 });
    }
  }
}
