import { NextResponse } from "next/server";
import { callGeminiWithResilience } from "@/lib/ai/gemini-client";
import { resolveStudentIdentity } from "@/lib/ai/student-resolver";
import { GEMINI_PRIMARY_MODEL } from "@/lib/ai/gemini-config";

export const dynamic = "force-dynamic";

function runStaticHeuristicDebug(code: string, language?: string): {
  mistakeType: string;
  diagnosis: string;
  preventiveAdvice: string;
  explanation: string;
} {
  const normLang = (language || "").toLowerCase();
  let mistakeType = "";
  let diagnosis = "";
  let preventiveAdvice = "";

  if (
    code.includes("publc") ||
    code.includes("statc") ||
    code.includes("prnt") ||
    code.includes("functin") ||
    code.includes("retrun")
  ) {
    mistakeType = "Syntax / Spelling Typo Error";
    diagnosis =
      "Found misspelled language keyword (e.g. 'publc', 'statc', or 'retrun'). Keywords must be exact.";
    preventiveAdvice =
      "Always verify language keywords. Most languages are case-sensitive and do not allow abbreviation.";
  } else if (
    !code.includes(";") &&
    (normLang === "cpp" || normLang === "c" || normLang === "java")
  ) {
    mistakeType = "Missing Semicolon (;) Terminal Symbol";
    diagnosis =
      "Statements in C, C++, and Java must terminate with a semicolon ';'.";
    preventiveAdvice =
      "Ensure every statement ends with a semicolon ';' before compiling.";
  } else if (
    !code.includes("return") &&
    (normLang === "cpp" || normLang === "c")
  ) {
    mistakeType = "Missing Return Value";
    diagnosis =
      "Function expects a return value but no return statement was found.";
    preventiveAdvice =
      "Always return an integer (e.g. return 0;) from main() in C/C++.";
  } else {
    mistakeType = "Logical / Edge Case Inspection";
    diagnosis =
      "Code structure analyzed. Ensure boundary conditions, loop termination, and variable bounds are properly constrained.";
    preventiveAdvice =
      "Test your function with zero, negative values, and large boundary inputs.";
  }

  return {
    mistakeType,
    diagnosis,
    preventiveAdvice,
    explanation: `(Static Rule Analysis) ${diagnosis} Guidance: ${preventiveAdvice}`,
  };
}

export async function POST(req: Request) {
  try {
    const identity = await resolveStudentIdentity(req);
    const body = await req.json().catch(() => ({}));

    if (typeof body.code !== "string" || !body.code.trim()) {
      return NextResponse.json(
        { error: "Code snippet is required." },
        { status: 400 }
      );
    }

    const code = body.code.trim();
    const language = typeof body.language === "string" ? body.language.trim() : "";

    if (code.length > 16384) {
      return NextResponse.json(
        { error: "Code snippet exceeds 16KB limit." },
        { status: 400 }
      );
    }

    const hasGeminiKey = Boolean(
      process.env.GEMINI_API_KEY && process.env.GEMINI_API_KEY.length > 10
    );

    // 1. Attempt AI-Powered Guided Debugging via Gemini Resilience Service
    if (hasGeminiKey) {
      const prompt = `You are KnowledgeStream AI's senior programming tutor.
Analyze the following student ${language || "programming"} code snippet.
Identify the primary syntax typo, logic mistake, edge case omission, or structural issue.

Code:
\`\`\`${language}
${code}
\`\`\`

PEDAGOGICAL RULES:
1. Do NOT write the complete final solution or give away solved code.
2. Identify the specific mistake type (e.g., "Syntax Typo", "Missing Semicolon", "Off-by-One Loop Bound", "Uninitialized Variable").
3. Provide a clear educational diagnosis explaining WHY the issue occurred.
4. Give actionable preventive advice on how to prevent this category of bug in the future.
5. Return ONLY a valid JSON object matching this schema without markdown code blocks:
{
  "mistakeType": "string",
  "diagnosis": "string",
  "preventiveAdvice": "string",
  "explanation": "string"
}`;

      const aiResult = await callGeminiWithResilience({
        service: "guided-debug",
        studentId: identity.studentId,
        isGuest: identity.isGuest,
        limitRpm: identity.limitRpm,
        prompt,
        temperature: 0.2,
        responseMimeType: "application/json",
      });

      // If rate limited, strictly enforce HTTP 429 without falling through to bypass
      if (!aiResult.success && aiResult.status === 429) {
        return NextResponse.json(
          {
            error: aiResult.error || "Rate limit exceeded. Please wait before retrying.",
            retryAfterSeconds: aiResult.retryAfterSeconds || 60,
          },
          {
            status: 429,
            headers: aiResult.retryAfterSeconds ? { "Retry-After": String(aiResult.retryAfterSeconds) } : {},
          }
        );
      }

      if (aiResult.success && aiResult.text) {
        try {
          const cleanText = aiResult.text.trim().replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "");
          const parsed = JSON.parse(cleanText);

          if (parsed && typeof parsed === "object" && parsed.mistakeType && parsed.diagnosis) {
            return NextResponse.json({
              success: true,
              isAiGenerated: true,
              isFallback: false,
              model: aiResult.model || GEMINI_PRIMARY_MODEL,
              mistakeType: String(parsed.mistakeType),
              diagnosis: String(parsed.diagnosis),
              preventiveAdvice: String(parsed.preventiveAdvice || ""),
              explanation: String(
                parsed.explanation ||
                  `AI Guided Diagnosis (${aiResult.model}): ${parsed.diagnosis}`
              ),
            });
          }
        } catch {
          // If JSON parse fails, fall through to static fallback with honest attribution
        }
      }
    }

    // 2. Safe Static Heuristic Fallback (Never falsely claims AI was used)
    const staticResult = runStaticHeuristicDebug(code, language);

    return NextResponse.json({
      success: true,
      isAiGenerated: false,
      isFallback: true,
      model: "static-rule-engine",
      mistakeType: staticResult.mistakeType,
      diagnosis: staticResult.diagnosis,
      preventiveAdvice: staticResult.preventiveAdvice,
      explanation: staticResult.explanation,
    });
  } catch (error: any) {
    console.error("Guided Debug API Error:", error);

    return NextResponse.json(
      {
        error: "Guided mode analysis failed.",
      },
      {
        status: 500,
      }
    );
  }
}