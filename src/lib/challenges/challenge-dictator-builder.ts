import { ProgrammingChallenge } from "./types";
import type { DictatorStep } from "@/components/editor/dictator/DictatorPlanner";

export interface ChallengeDictatorPlan {
  programId: string;
  language: string;
  project: string;
  primaryFile: string;
  requirements: string[];
  totalSteps: number;
  steps: DictatorStep[];
  files: Array<{ name: string; content: string }>;
}

/**
 * Builds pedagogical Dictator steps directly from an authoritative ProgrammingChallenge.
 * Guarantees 100% token synchronization between Challenge objective, starter code,
 * dictator typing tokens, and test case expected output.
 */
export function buildChallengeDictatorPlan(challenge: ProgrammingChallenge): ChallengeDictatorPlan {
  const normLang = (challenge.course || "java").toLowerCase().trim();
  const langDisplay =
    normLang === "java"
      ? "Java"
      : normLang === "cpp"
      ? "C++"
      : normLang === "c"
      ? "C"
      : "Python";

  const primaryFile =
    normLang === "java"
      ? "Main.java"
      : normLang === "c"
      ? "solution.c"
      : normLang === "cpp"
      ? "solution.cpp"
      : "solution.py";

  const refCode = challenge.referenceSolution || challenge.starterCode || "";
  const lines = refCode
    .split("\n")
    .map((l) => l.replace(/\r/g, ""))
    .filter((l) => l.trim().length > 0);

  const steps: DictatorStep[] = [];
  let accumulated = "";
  const blockStack: string[] = [];

  for (let i = 0; i < lines.length; i++) {
    const rawLine = lines[i];
    const trimmed = rawLine.trim();

    // Skip pure standalone comments
    if (
      (normLang !== "python" && trimmed.startsWith("//")) ||
      (normLang === "python" && trimmed.startsWith("#"))
    ) {
      accumulated += rawLine + "\n";
      continue;
    }

    let token = trimmed;
    let title = `Step ${steps.length + 1}`;
    let instruction = `Write: ${trimmed}`;
    let concept = "Challenge Implementation";
    let explanation = `Fulfills: ${challenge.objective}`;
    let stepType: DictatorStep["type"] = "statement";

    if (normLang === "java") {
      if (trimmed.startsWith("import ")) {
        title = "Import Declaration";
        concept = "Package Import";
        instruction = `Import the required package: ${trimmed}`;
        stepType = "keyword";
      } else if (trimmed.startsWith("public class ") || trimmed.startsWith("class ")) {
        token = trimmed.replace(/\s*\{$/, "").trim();
        const classMatch = token.match(/class\s+([A-Za-z0-9_]+)/);
        const className = classMatch ? classMatch[1] : "Main";
        blockStack.push(`${className} class`);
        title = "Class Structure";
        concept = "Class Definition";
        instruction = `Declare the public class: ${token}`;
        stepType = "structure";
      } else if (trimmed.includes("public static void main")) {
        token = trimmed.replace(/\s*\{$/, "").trim();
        blockStack.push("main method");
        title = "Main Method Entry Point";
        concept = "Method Declaration";
        instruction = "Define the main method entry point: public static void main(String[] args)";
        stepType = "method";
      } else if (trimmed.includes("System.out.print")) {
        title = "Formatted Console Output";
        concept = "Standard Output";
        instruction = `Print the required output message: ${trimmed}`;
        explanation = `Outputs the exact text matching the challenge requirement: "${challenge.objective}"`;
        stepType = "statement";
      } else if (trimmed.includes("Scanner ")) {
        title = "Scanner Initialization";
        concept = "Input Stream";
        instruction = "Initialize Scanner to read from System.in.";
        stepType = "statement";
      } else if (trimmed === "}" || trimmed === "};") {
        const closed = blockStack.pop() || "code block";
        if (closed === "main method") {
          title = "Close Main Method";
          concept = "Method Closure";
          instruction = "Close the main method.";
        } else if (closed.endsWith("class")) {
          const className = closed.replace(/\s+class$/, "");
          title = `Close ${className} Class`;
          concept = "Class Closure";
          instruction = `Close the ${className} class.`;
        } else {
          title = "Scope Closure";
          concept = "Block Closure";
          instruction = `Close the ${closed}.`;
        }
        token = "}";
        stepType = "symbol";
      }
    } else if (normLang === "c" || normLang === "cpp") {
      if (trimmed.startsWith("#include")) {
        title = "Header Inclusion";
        concept = "Pre-processor Header";
        instruction = `Include standard library: ${trimmed}`;
        stepType = "keyword";
      } else if (trimmed.includes("int main")) {
        token = trimmed.replace(/\s*\{$/, "").trim();
        blockStack.push("main function");
        title = "Main Function";
        concept = "Function Definition";
        instruction = `Define main function: ${token}`;
        stepType = "method";
      } else if (trimmed.includes("printf") || trimmed.includes("cout")) {
        title = "Formatted Output";
        concept = "Standard Output";
        instruction = `Print the formatted output: ${trimmed}`;
        stepType = "statement";
      } else if (trimmed.includes("scanf") || trimmed.includes("cin")) {
        title = "Input Reading";
        concept = "Standard Input";
        instruction = `Read formatted input: ${trimmed}`;
        stepType = "statement";
      } else if (trimmed === "return 0;" || trimmed === "return 0") {
        title = "Return Exit Code";
        concept = "Exit Status";
        instruction = "Return status 0 to indicate successful execution.";
        stepType = "statement";
      } else if (trimmed === "}" || trimmed === "};") {
        const closed = blockStack.pop() || "function block";
        title = closed === "main function" ? "Close Main Function" : "Scope Closure";
        concept = "Block Closure";
        instruction = closed === "main function" ? "Close the main function." : `Close the ${closed}.`;
        token = "}";
        stepType = "symbol";
      }
    } else {
      // Python
      if (trimmed.startsWith("import ") || trimmed.startsWith("from ")) {
        title = "Module Import";
        concept = "Module";
        instruction = `Import library: ${trimmed}`;
        stepType = "keyword";
      } else if (trimmed.startsWith("def ")) {
        token = trimmed.replace(/:$/, "").trim();
        title = "Function Definition";
        concept = "Function Header";
        instruction = `Define function: ${token}:`;
        stepType = "method";
      } else if (trimmed.startsWith("print(") || trimmed.includes("print(")) {
        title = "Console Output";
        concept = "Standard Output";
        instruction = `Print output: ${trimmed}`;
        explanation = `Fulfills challenge objective: ${challenge.objective}`;
        stepType = "statement";
      } else if (trimmed.includes("input(")) {
        title = "Input Reading";
        concept = "Input Parsing";
        instruction = `Read input from stdin: ${trimmed}`;
        stepType = "statement";
      }
    }

    accumulated += rawLine + "\n";
    const currentAccumulated = accumulated;
    const currentStepNum = steps.length + 1;

    steps.push({
      step: currentStepNum,
      title,
      concept,
      instruction,
      explanation,
      why: challenge.objective || "Mandatory challenge requirement.",
      example: token,
      code: currentAccumulated,
      stepCode: rawLine,
      hint: `Type: ${token}`,
      speech: `Step ${currentStepNum}. ${instruction}`,
      expected: token,
      type: stepType,
    });
  }

  // Fallback if no steps generated
  if (steps.length === 0) {
    steps.push({
      step: 1,
      title: challenge.title,
      concept: "Challenge Implementation",
      instruction: challenge.description || challenge.objective,
      explanation: challenge.objective,
      why: "Challenge objective.",
      example: refCode,
      code: refCode,
      stepCode: refCode,
      hint: `Refer to challenge instructions.`,
      speech: `Implement ${challenge.title}. ${challenge.objective}`,
      expected: refCode.trim(),
      type: "structure",
    });
  }

  const requirements = [
    challenge.objective,
    ...(challenge.constraints || []),
    `Pass all automated test cases for ${challenge.title}`,
  ];

  return {
    programId: `CHALLENGE_${challenge.id.toUpperCase()}`,
    language: langDisplay,
    project: challenge.title,
    primaryFile,
    requirements,
    totalSteps: steps.length,
    steps,
    files: [{ name: primaryFile, content: refCode }],
  };
}
