import { NextResponse } from "next/server";

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}));
    const code = (body.code || "").trim();
    const language = body.language || "Java";

    // 1. Guard against empty code
    if (!code) {
      return NextResponse.json({
        success: true,
        response: "Write or paste some code first, then I can explain it.",
        data: {
          response: "Write or paste some code first, then I can explain it.",
        },
      });
    }

    // 2. Query Django backend with timeout
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 12000);

      const response = await fetch("http://127.0.0.1:8000/api/ai/explain/", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        signal: controller.signal,
        body: JSON.stringify({
          language,
          code,
        }),
      });

      clearTimeout(timeoutId);

      if (response.ok) {
        const result = await response.json();
        const explainText =
          result?.data?.response ??
          result?.response ??
          result?.data ??
          result?.message ??
          "";

        if (explainText && typeof explainText === "string" && explainText.trim().length > 0) {
          return NextResponse.json({
            success: true,
            response: explainText,
            data: {
              response: explainText,
            },
          });
        }
      }
    } catch (fetchError) {
      console.warn("Django Explain endpoint unavailable or timed out:", fetchError);
    }

    // 3. Guaranteed Structured Fallback (Topic, What it does, Step-by-step, Concepts, I/O, Improvements)
    const fallbackText = generateStructuredExplanation(code, language);

    return NextResponse.json({
      success: true,
      response: fallbackText,
      data: {
        response: fallbackText,
      },
    });
  } catch (error) {
    console.error("AI Explain Route Error:", error);
    return NextResponse.json(
      {
        success: false,
        message: "Unable to process code explanation. Please try again.",
      },
      { status: 500 }
    );
  }
}

function generateStructuredExplanation(code: string, language: string): string {
  const lines = code.split("\n").filter((l) => l.trim().length > 0);
  const hasLoops = /for\s*\(|while\s*\(|for\s+\w+\s+in/i.test(code);
  const hasConditionals = /if\s*\(|if\s+\w+|else/i.test(code);
  const classMatches = Array.from(code.matchAll(/class\s+([a-zA-Z_]\w*)/g)).map((m) => m[1]);
  const funcMatches = Array.from(
    code.matchAll(/(?:def|function|void|int|double|String|boolean)\s+([a-zA-Z_]\w*)\s*\(/g)
  ).map((m) => m[1]).filter((f) => f !== "main" && f !== "if" && f !== "for" && f !== "while");
  const hasIO = /System\.out|print|cout|printf|console\.log|Scanner|cin|input\(/i.test(code);

  let summary = `This ${language} program consists of ${lines.length} lines of code.`;
  if (classMatches.length > 0) summary += ` It defines ${classMatches.length} class(es): ${classMatches.join(", ")}.`;
  if (funcMatches.length > 0) summary += ` It contains ${funcMatches.length} modular function(s): ${funcMatches.join(", ")}.`;
  if (hasLoops) summary += " It employs iteration/loops for systematic data traversal.";
  if (hasConditionals) summary += " It uses conditional branching to handle decision logic.";

  return `### 📌 1. Topic & Purpose
**Language:** ${language}
**Overview:** ${summary}

### 📝 2. What the Code Does
The program establishes necessary data structures and logic flow to execute operations:
• Initializes variables, data types, and runtime configurations.
• Processes inputs or state changes using standard ${language} constructs.
${hasIO ? "• Employs standard I/O streams to interact with the console and display results.\n" : "• Executes computations and state transformations in memory.\n"}

### 🔍 3. Step-by-Step Logic Flow
1. **Initialization:** Imports libraries, declares namespaces, and instantiates core data structures.
2. **Execution Entry:** The program enters via its main execution block.
3. **Core Computation:** ${hasLoops ? "Iterates through logic cycles until loop boundary conditions are reached." : "Executes instructions sequentially step by step."}
4. **Branching & Decisions:** ${hasConditionals ? "Evaluates conditional branches (if/else) to direct execution pathways." : "Executes sequential statements deterministically."}
5. **Program Termination:** Concludes execution and releases allocated runtime resources.

### 💡 4. Important Concepts & Functions/Classes Used
• **Language Idioms:** Standard ${language} keywords and idiomatic structure.
• **State Management:** Local variables, type boundaries, and scoped memory.
${classMatches.length > 0 ? `• **Classes Defined:** ${classMatches.map((c) => `\`${c}\``).join(", ")} (encapsulating state and methods).\n` : ""}${funcMatches.length > 0 ? `• **Functions/Methods:** ${funcMatches.map((f) => `\`${f}()\``).join(", ")} (modularizing distinct operations).\n` : ""}${hasLoops ? "• **Iterative Control:** Loops for repeated evaluation.\n" : ""}${hasConditionals ? "• **Decision Trees:** Conditional branching for logic routing.\n" : ""}

### ⚠️ 5. Potential Issues, Edge Cases & Mistakes
• **Input Validation:** Ensure user inputs are validated before processing (e.g., negative amounts, zero division, empty strings).
• **Boundary Conditions:** Verify loop and array boundaries to avoid off-by-one errors or out-of-bounds exceptions.
• **Resource Cleanup:** If reading from files or standard input streams (e.g. \`Scanner\`), close streams upon completion to prevent leaks.
• **Null Safety:** Verify references before dereferencing to prevent null pointer or undefined errors.

### 🚀 6. Suggestions for Improvement
• Separate business logic from console printing to increase testability.
• Add descriptive docstrings or comments explaining the intent of critical algorithms.
• Include automated unit tests covering expected inputs, boundary conditions, and invalid edge cases.

### 💻 7. Expected Input & Output
• **Input:** ${hasIO ? "Interactive keyboard input or pre-initialized parameters." : "Pre-defined variable values."}
• **Output:** ${hasIO ? "Structured console output displaying operation results." : "Calculated values returned or maintained in state."}`;
}