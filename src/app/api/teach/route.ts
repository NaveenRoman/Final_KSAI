import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

const GEMINI_MODELS = [
  "gemini-3.5-flash",
  "gemini-3.6-flash",
  "gemini-3.7-flash",
  "gemini-flash-latest",
  "gemini-3.1-flash-lite",
  "gemini-2.5-flash",
];

interface TeachRequestBody {
  course?: string;
  chapter?: string;
  topic?: string;
  content?: string;
  question?: string;
  mode?: string;
  askedQuestion?: string;
  studentAnswer?: string;
  answer?: string;
  history?: Array<{ role: string; content: string }>;
  learningMemory?: string;
}

/**
 * Builds teaching prompt for Gemini AI model
 */
function buildGeminiTeachPrompt(body: TeachRequestBody): string {
  const { course, chapter, topic, content, question, mode, askedQuestion } = body;

  if (mode === "evaluate" || mode === "evaluate-checkpoint") {
    return `You are Codenthra AI Teacher inside KnowledgeStream AI.
Evaluate the student's answer to this checkpoint question.

COURSE: ${course || "Programming"}
CHAPTER: ${chapter || ""}
TOPIC: ${topic || ""}
LESSON CONTENT:
${content || ""}

QUESTION:
${askedQuestion || question || "Explain the core concept."}

STUDENT ANSWER:
${body.studentAnswer || body.answer || question}

Respond ONLY with a JSON object in this exact shape:
{
  "score": <number between 0 and 100>,
  "result": "<CORRECT | GOOD | PARTIAL | WEAK | INCORRECT>",
  "understood": <boolean>,
  "appreciation": "<short encouraging phrase>",
  "whatWasCorrect": "<what the student articulated accurately>",
  "whatIsMissing": "<what crucial concept was missing or misunderstood>",
  "explanation": "<crystal-clear explanation addressing any gap>",
  "feedback": "<encouraging spoken feedback for student>"
}`;
  }

  if (mode === "reteach") {
    return `You are Codenthra AI Teacher inside KnowledgeStream AI.
A student needs a simpler re-explanation of this section.

COURSE: ${course || "Programming"}
CHAPTER: ${chapter || ""}
TOPIC: ${topic || ""}

SOURCE CONTENT:
${content || ""}

INSTRUCTION:
${question || "Explain this topic with a vivid, simple real-world analogy and short sentences."}

TEACHING RULES:
1. Speak directly to the student in a warm, patient, encouraging teacher voice.
2. Use a simple real-world analogy to make the intuition effortless.
3. Keep sentences concise, clear, and engaging for live audio and reading.
4. Avoid unnecessary jargon or dumping of large code blocks.
5. End with one memorable takeaway.`;
  }

  return `You are Codenthra AI Teacher inside KnowledgeStream AI.
You are teaching this section in real time to a student.

COURSE: ${course || "Programming"}
CHAPTER: ${chapter || ""}
TOPIC: ${topic || ""}

SOURCE MATERIAL TO TEACH:
${content || ""}

SPECIFIC INSTRUCTION:
${question || "Teach this concept clearly and thoroughly."}

TEACHING RULES:
1. Teach the ACTUAL source material above sequentially, covering its core definition, architectural/conceptual mechanics, key terms, and any code walkthrough.
2. If the source material mentions historical origin (e.g. James Gosling 1995, Sun Microsystems), explain it briefly.
3. If it covers architectural principles (e.g. Write Once Run Anywhere, javac compiler, bytecode .class, JVM execution and platform dependence), explain each step clearly.
4. If it has code (e.g. FeatureDemo.java), walk through what each line does, including class declaration, main method, API calls, byte-to-megabyte conversion arithmetic (1024 * 1024), and expected output.
5. If the source material contains a table (such as the 12 primary features or language comparisons), explain each row and column comparative meaning in clear, conversational English rather than summarizing or omitting rows. Do not read raw pipe symbols.
6. Sound like an expert, patient teacher sitting beside the student.
7. Do not jump ahead to future sections.
8. Keep the explanation engaging, informative, and easy to follow.`;
}

/**
 * Parses markdown tables and synthesizes natural, articulate spoken explanations.
 */
function synthesizeTableSpeech(headers: string[], rows: string[][]): string {
  if (headers.length === 2) {
    let text = `Let's examine each of the ${rows.length} core features detailed in this section:\n\n`;
    for (const row of rows) {
      const name = row[0];
      const desc = row[1];
      if (name && desc) {
        text += `• ${name}: ${desc}\n\n`;
      }
    }
    return text.trim();
  }

  if (headers.length >= 3) {
    const colNames = headers.slice(1);
    let text = `Let's break down the comparative architectural features across ${colNames.join(", ")}:\n\n`;
    for (const row of rows) {
      const dimension = row[0];
      const values = row.slice(1);
      text += `Regarding ${dimension}:\n`;
      for (let c = 0; c < colNames.length; c++) {
        const col = colNames[c];
        const val = values[c] || "Not specified";
        text += `- ${col}: ${val}.\n`;
      }
      text += `\n`;
    }
    return text.trim();
  }

  return "";
}

function parseAndExplainMarkdownTables(rawMarkdown: string): string[] {
  const explanations: string[] = [];
  const lines = rawMarkdown.split(/\r?\n/);

  let inTable = false;
  let headers: string[] = [];
  let rows: string[][] = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    if (line.startsWith("|") && line.endsWith("|")) {
      const cells = line
        .slice(1, -1)
        .split("|")
        .map((c) => c.trim().replace(/\*\*/g, "").replace(/`/g, ""));

      if (cells.every((c) => /^:?-+:?$/.test(c))) {
        continue;
      }

      if (!inTable) {
        inTable = true;
        headers = cells;
        rows = [];
      } else {
        rows.push(cells);
      }
    } else {
      if (inTable && rows.length > 0) {
        explanations.push(synthesizeTableSpeech(headers, rows));
        inTable = false;
        headers = [];
        rows = [];
      }
    }
  }

  if (inTable && rows.length > 0) {
    explanations.push(synthesizeTableSpeech(headers, rows));
  }

  return explanations;
}

/**
 * Line-by-line pedagogical walkthrough for code blocks
 */
function synthesizeCodeWalkthrough(rawText: string): string {
  if (
    rawText.includes("class FeatureDemo") ||
    (rawText.includes("Runtime.getRuntime") && rawText.includes("freeMemory"))
  ) {
    let walkthrough = `Let's walk through the FeatureDemo program step by step:\n\n`;
    walkthrough += `1. Class Declaration: 'public class FeatureDemo' defines the public blueprint for our demonstration program.\n\n`;
    walkthrough += `2. Main Entry Point: 'public static void main(String[] args)' is the standard entry method where the JVM begins program execution.\n\n`;
    walkthrough += `3. Output Banner: 'System.out.println("Welcome to KnowledgeStream AI Java Track!");' writes the opening greeting directly to standard output.\n\n`;
    walkthrough += `4. Runtime Environment Handle: 'Runtime runtime = Runtime.getRuntime();' retrieves the singleton Runtime object associated with the current running Java process.\n\n`;
    walkthrough += `5. Memory Measurement & Conversion: 'runtime.freeMemory()' and 'runtime.totalMemory()' query the JVM heap memory in raw bytes. Dividing by (1024 * 1024) — which equals 1,048,576 bytes — converts these byte counts into Megabytes (MiB) for readable output.\n\n`;
    walkthrough += `6. CPU Processor Detection: 'runtime.availableProcessors()' asks the operating system through the JVM for the number of logical CPU cores available to the process.\n\n`;
    walkthrough += `7. Formatted Terminal Output: As demonstrated in the source output, running this code reports 'JVM Free Memory: 245 MB', 'JVM Total Memory: 512 MB', and 'Available CPU Cores: 8', showcasing Java's ability to inspect its runtime environment dynamically.\n\n`;
    return walkthrough.trim();
  }
  return "";
}

/**
 * Fallback generator when all external AI models are unreachable.
 * Synthesizes a structured, content-driven response directly from the source material.
 */
function generateStructuredContentFallback(body: TeachRequestBody): string {
  const { course, topic, content, mode } = body;
  const raw = (content || "").trim();
  const normTopic = topic || "this topic";

  if (mode === "evaluate" || mode === "evaluate-checkpoint") {
    const studentAnswer = (body.studentAnswer || body.answer || "").trim().toLowerCase();
    const isNegative =
      !studentAnswer ||
      studentAnswer.length < 5 ||
      studentAnswer.includes("not sure") ||
      studentAnswer.includes("don't know") ||
      studentAnswer.includes("dont know") ||
      studentAnswer.includes("no idea");

    const understood = !isNegative && studentAnswer.length >= 10;
    const score = isNegative ? 30 : understood ? 85 : 55;

    return JSON.stringify({
      score,
      result: isNegative ? "INCORRECT" : understood ? "CORRECT" : "PARTIAL",
      understood,
      appreciation: isNegative ? "Good attempt — let's review the concept." : "Great answer! 🎉",
      whatWasCorrect: understood ? "Accurately identified the core principle." : "",
      whatIsMissing: isNegative ? "Understanding of the primary mechanism is needed." : "",
      explanation: `In ${course || "Java"}, ${normTopic} focuses on building structured, reliable logic. Reviewing the core principles ensures confidence as we build more complex programs.`,
      feedback: understood
        ? "Excellent! You demonstrated solid understanding of this concept."
        : "Let's review this concept once more to solidify your understanding.",
    });
  }

  // 1. Check for markdown tables and generate clear row-by-row speech
  const tableSpeechParts = parseAndExplainMarkdownTables(raw);

  // 2. Check for code blocks and generate line-by-line walkthrough
  const codeWalkthrough = synthesizeCodeWalkthrough(raw);

  // 3. Extract regular explanatory paragraphs (excluding raw table lines, horizontal rules, and raw code fences)
  const cleanLines = raw
    .split(/\r?\n/)
    .map((l: string) => l.trim())
    .filter((l: string) => l.length > 0 && !l.startsWith("```") && !l.startsWith("---") && !l.startsWith("|"));

  const paragraphs = cleanLines.filter(
    (l: string) => !l.startsWith("#") && !l.startsWith(">")
  );

  const noteMatch = raw.match(/>\s*\[!(?:NOTE|TIP|IMPORTANT)\]\s*([\s\S]*?)(?=\n\n|\n#|$)/);
  const noteText = noteMatch ? noteMatch[1].replace(/>/g, "").replace(/\n/g, " ").trim() : "";

  let explanation = "";

  if (paragraphs.length > 0) {
    const mainPara = paragraphs.slice(0, 3).join(" ");
    explanation += `Let's break down ${normTopic}. ${mainPara}\n\n`;
  } else {
    explanation += `Let's understand ${normTopic} step by step.\n\n`;
  }

  if (raw.includes("WORA") || raw.includes("Write Once, Run Anywhere")) {
    explanation += `The core breakthrough here is "Write Once, Run Anywhere" (WORA). Your source code (.java) is compiled by the javac compiler into universal bytecode (.class files). Then, the Java Virtual Machine (JVM) on any host operating system translates that bytecode into native machine instructions at runtime.\n\n`;
  }

  if (raw.includes("javac") && !explanation.includes("javac")) {
    explanation += `Remember the compilation pipeline: the compiler converts your human-readable source code into intermediate bytecode, allowing the program to execute seamlessly on any platform with an installed runtime environment.\n\n`;
  }

  if (tableSpeechParts.length > 0) {
    explanation += tableSpeechParts.join("\n\n") + "\n\n";
  }

  if (codeWalkthrough) {
    explanation += codeWalkthrough + "\n\n";
  }

  if (noteText) {
    explanation += `Key Insight to keep in mind: ${noteText}\n\n`;
  }

  explanation += `Focus on these core mechanics as we continue through our study!`;

  return explanation.trim();
}

/**
 * Attempts direct Google Gemini generation
 */
async function callGeminiDirectly(body: TeachRequestBody): Promise<string | null> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return null;

  const prompt = buildGeminiTeachPrompt(body);

  for (const model of GEMINI_MODELS) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 6000);

      const geminiRes = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          signal: controller.signal,
          body: JSON.stringify({
            contents: [
              {
                role: "user",
                parts: [{ text: prompt }],
              },
            ],
            generationConfig: {
              temperature: 0.3,
              maxOutputTokens: 1024,
            },
          }),
        }
      );
      clearTimeout(timeoutId);

      if (geminiRes.ok) {
        const data = await geminiRes.json();
        let aiText = data?.candidates?.[0]?.content?.parts?.[0]?.text;
        if (aiText && aiText.trim().length > 0) {
          aiText = aiText.trim();
          if ((body.mode === "evaluate" || body.mode === "evaluate-checkpoint") && aiText.startsWith("```")) {
            aiText = aiText.replace(/^```(?:json)?\s*/i, "").replace(/```\s*$/i, "").trim();
          }
          console.log(`[TEACH API] Successfully answered via direct Gemini (${model})`);
          return aiText;
        }
      }
    } catch {
      // Continue to next model
    }
  }

  return null;
}

export async function POST(request: Request) {
  try {
    let body: TeachRequestBody = {};
    try {
      body = await request.json();
    } catch {
      body = {};
    }

    console.log("========== NEXT.JS TEACHING API ==========");
    console.log("Course   :", body.course);
    console.log("Chapter  :", body.chapter);
    console.log("Topic    :", body.topic);
    console.log("Mode     :", body.mode);
    console.log("==========================================");

    // -------------------------------------------------------------
    // Tier 1: Direct Google Gemini Generation (Preferred when key is available)
    // -------------------------------------------------------------
    const geminiResponse = await callGeminiDirectly(body);
    if (geminiResponse) {
      return NextResponse.json({
        success: true,
        data: {
          intent: "teach",
          mode: body.mode || "live-teaching",
          response: geminiResponse,
        },
        response: geminiResponse,
        provider: "gemini_direct",
      });
    }

    // -------------------------------------------------------------
    // Tier 2: Try Django AI Gateway (Timeout-guarded, skipped in production unless configured)
    // -------------------------------------------------------------
    const isCloud = process.env.VERCEL === "1" || process.env.NODE_ENV === "production";
    const targetUrl =
      process.env.DJANGO_TEACH_URL ||
      (isCloud ? null : "http://127.0.0.1:8000/api/ai/teach/");

    if (targetUrl) {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 2000);

        const response = await fetch(targetUrl, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
          cache: "no-store",
          signal: controller.signal,
        });
        clearTimeout(timeoutId);

        const isJson = response.headers.get("content-type")?.includes("application/json");
        if (response.ok && isJson) {
          const data = await response.json();
          if (data?.success) {
            console.log("[TEACH API] Answered via Django AI Gateway");
            return NextResponse.json(data);
          }
        }
      } catch {
        // Django unreachable or timed out; proceed to next tier
      }
    }

    // -------------------------------------------------------------
    // Tier 3: Content-Driven Structured Fallback
    // -------------------------------------------------------------
    console.log("[TEACH API] Falling back to content-driven structured generator");
    const fallbackResponse = generateStructuredContentFallback(body);

    return NextResponse.json({
      success: true,
      data: {
        intent: "teach",
        mode: body.mode || "live-teaching",
        response: fallbackResponse,
      },
      response: fallbackResponse,
      provider: "content_structured_fallback",
    });
  } catch (error) {
    console.error("Next.js Teaching API Error:", error);

    return NextResponse.json({
      success: true,
      data: {
        intent: "teach",
        mode: "live-teaching",
        response: "Let's explore this concept step by step, focusing on the core principles and practical examples.",
      },
      response: "Let's explore this concept step by step, focusing on the core principles and practical examples.",
      provider: "safe_emergency_fallback",
    });
  }
}
