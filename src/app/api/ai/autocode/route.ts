import { NextResponse } from "next/server";
import { synthesizeUniversalProgram } from "@/components/editor/dictator/DictatorTokenizer";

function cleanAndParseAutoCodeResponse(
  raw: unknown,
  project: string,
  language: string
): { code: string; explanation: string } {
  if (!raw) return { code: "", explanation: "" };

  if (typeof raw === "object" && raw !== null && "code" in raw) {
    const obj = raw as Record<string, unknown>;
    return {
      code: String(obj.code),
      explanation: String(obj.explanation || ""),
    };
  }

  if (typeof raw === "string") {
    let text = raw.trim();

    // Strip markdown code fences if wrapped in ```json ... ``` or ``` ... ```
    if (text.startsWith("```")) {
      text = text.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "").trim();
    }

    try {
      const parsed = JSON.parse(text);
      if (parsed && typeof parsed === "object" && "code" in parsed) {
        return {
          code: String(parsed.code),
          explanation: String(parsed.explanation || ""),
        };
      }
    } catch {
      // Regex search for JSON object with "code" key
      const match = text.match(/\{[\s\S]*"code"[\s\S]*\}/);
      if (match) {
        try {
          const parsed = JSON.parse(match[0]);
          if (parsed && parsed.code) {
            return {
              code: String(parsed.code),
              explanation: String(parsed.explanation || ""),
            };
          }
        } catch {
          // ignore
        }
      }
    }

    // If text itself is raw source code
    return {
      code: text,
      explanation: `Complete ${project} program generated for ${language}.`,
    };
  }

  return { code: "", explanation: "" };
}

export async function POST(request: Request) {
  let body: Record<string, unknown> = {};
  try {
    body = (await request.json().catch(() => ({}))) as Record<string, unknown>;
  } catch {
    body = {};
  }

  const language = typeof body.language === "string" ? body.language : "java";
  const project = typeof body.project === "string" ? body.project.trim() : "";
  const level = typeof body.level === "string" ? body.level : (typeof body.learningLevel === "string" ? body.learningLevel : "beginner");
  const category = typeof body.category === "string" ? body.category : undefined;
  const practiceLevel = typeof body.practiceLevel === "number" || typeof body.practiceLevel === "string" ? Number(body.practiceLevel) : undefined;

  if (!project) {
    return NextResponse.json(
      {
        success: false,
        message: "Project description is required.",
      },
      { status: 400 }
    );
  }

  // 1. Try Django backend (allow up to 15s for LLM code generation)
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 15000);

    const targetUrl =
      process.env.DJANGO_AUTOCODE_URL ||
      (process.env.DJANGO_TEACH_URL
        ? process.env.DJANGO_TEACH_URL.replace(/\/ai\/teach\/?$/, "/ai/autocode/")
        : "http://127.0.0.1:8000/api/ai/autocode/");

    const headers: Record<string, string> = { "Content-Type": "application/json" };
    if (process.env.INTERNAL_API_SECRET) {
      headers["X-Internal-Secret"] = process.env.INTERNAL_API_SECRET;
    }

    const response = await fetch(targetUrl, {
      method: "POST",
      headers,
      signal: controller.signal,
      body: JSON.stringify({
        language,
        project,
        level,
        category,
        practiceLevel,
      }),
    });

    clearTimeout(timeoutId);

    if (response.ok) {
      const result = await response.json();
      if (result && result.success && result.data) {
        const rawResponse = result.data.response;
        const cleaned = cleanAndParseAutoCodeResponse(rawResponse, project, language);

        if (cleaned.code) {
          if (!cleaned.explanation || cleaned.explanation.trim().length === 0) {
            cleaned.explanation =
              `### 📖 ${project} (${language.toUpperCase()} — ${level.toUpperCase()})\n\n` +
              `Complete working implementation generated for **${project}** at **${level}** level.\n\n` +
              `This code demonstrates the appropriate data structures, logic flow, and idioms for the **${level}** practice tier.`;
          }

          return NextResponse.json({
            success: true,
            data: {
              intent: "autocode",
              code: cleaned.code,
              explanation: cleaned.explanation,
              response: JSON.stringify({
                code: cleaned.code,
                explanation: cleaned.explanation,
              }),
            },
          });
        }
      }
    }
  } catch (error) {
    console.warn("Django Auto Code backend unreachable or timed out, using universal synthesizer:", error);
  }

  // 2. Guaranteed Universal Curriculum Synthesizer
  try {
    const units = synthesizeUniversalProgram(project, language, level, category, practiceLevel);
    if (units && units.length > 0) {
      const fullCode = units[units.length - 1].fullAccumulatedCode;
      const explanation =
        `### 📖 ${project} (${language.toUpperCase()} — ${level.toUpperCase()})\n\n` +
        `This program provides a complete, working implementation of **${project}** tailored for **${level}** level.\n\n` +
        `**Key Components:**\n` +
        units.map((u, idx) => `• **Step ${idx + 1} (${u.title})**: ${u.explanation || u.instruction}`).join("\n");

      return NextResponse.json({
        success: true,
        data: {
          intent: "autocode",
          code: fullCode,
          explanation,
          response: JSON.stringify({
            code: fullCode,
            explanation,
          }),
        },
      });
    }
  } catch (synthErr) {
    console.error("Synthesizer error in autocode route:", synthErr);
  }

  return NextResponse.json(
    {
      success: false,
      message: "Unable to generate code for the requested project.",
    },
    { status: 500 }
  );
}
