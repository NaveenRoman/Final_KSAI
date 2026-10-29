export type VisualType =
  | "FLOW_DIAGRAM"
  | "MEMORY_DIAGRAM"
  | "CODE_WALKTHROUGH"
  | "VARIABLE_VISUALIZATION"
  | "LOOP_VISUALIZATION"
  | "CONDITIONAL_FLOW"
  | "FUNCTION_FLOW"
  | "ARRAY_VISUALIZATION"
  | "STACK_VISUALIZATION"
  | "QUEUE_VISUALIZATION"
  | "LINKED_LIST_VISUALIZATION"
  | "TREE_VISUALIZATION"
  | "OBJECT_CLASS_VISUALIZATION"
  | "POINTER_MEMORY_VISUALIZATION"
  | "ALGORITHM_STEP_VISUALIZATION"
  | "OUTPUT_VISUALIZATION"
  | "QUESTION_INTERACTION"
  | "CODE_PREDICTION"
  | "DEBUGGING_VISUALIZATION";

export type LearningLevel = "BEGINNER" | "INTERMEDIATE" | "ADVANCED";

export type ProgrammingLanguage = "python" | "java" | "c" | "cpp" | "javascript" | "general";

// ==========================================
// Specialized Visual Payload Schemas
// ==========================================

export interface VariableItem {
  name: string;
  type?: string;
  value: string | number | boolean;
  address?: string; // For C / C++ pointer visualization
  previousValue?: string | number | boolean;
  scope?: "local" | "global" | "heap";
  isHighlighted?: boolean;
}

export interface MemoryVisualData {
  title?: string;
  stack?: VariableItem[];
  heap?: Array<{
    id: string;
    type: string;
    fields?: Record<string, string | number>;
    address?: string;
  }>;
  explanation?: string;
}

export interface CodeWalkthroughStep {
  lineNumber: number;
  codeLine: string;
  explanation: string;
  variables?: VariableItem[];
  output?: string;
  highlightTokens?: string[];
}

export interface CodeWalkthroughData {
  language: ProgrammingLanguage;
  fullCode: string;
  steps: CodeWalkthroughStep[];
}

export interface FlowNode {
  id: string;
  label: string;
  type?: "start" | "process" | "decision" | "end";
  isActive?: boolean;
  annotation?: string;
}

export interface FlowDiagramData {
  title: string;
  nodes: FlowNode[];
  connections?: Array<{ from: string; to: string; label?: string }>;
}

export interface LoopVisualData {
  loopType: "for" | "while" | "do-while";
  initialization?: string;
  condition: string;
  update?: string;
  iterations: Array<{
    iterationNumber: number;
    variables: Record<string, string | number>;
    conditionMet: boolean;
    output?: string;
    explanation?: string;
  }>;
}

export interface ConditionalBranch {
  condition: string;
  isEvaluated: boolean;
  isTaken: boolean;
  branchBody: string;
}

export interface ConditionalVisualData {
  branches: ConditionalBranch[];
  evaluatedResult: string;
  explanation: string;
}

export interface DataStructureItem {
  value: string | number;
  index?: number;
  isHighlighted?: boolean;
  isPointerTarget?: boolean;
  annotation?: string;
}

export interface ArrayVisualData {
  arrayName: string;
  items: DataStructureItem[];
  currentIndex?: number;
  operation?: "read" | "write" | "swap" | "search";
}

export interface StackQueueVisualData {
  name: string;
  type: "stack" | "queue";
  items: Array<{ value: string | number; label?: string }>;
  operation?: "push" | "pop" | "enqueue" | "dequeue" | "peek";
  topPointer?: number;
}

export interface LinkedListNode {
  id: string;
  value: string | number;
  nextId?: string | null;
  prevId?: string | null; // For doubly linked lists
  isHead?: boolean;
  isTail?: boolean;
  isHighlighted?: boolean;
}

export interface LinkedListVisualData {
  listType: "singly" | "doubly" | "circular";
  nodes: LinkedListNode[];
}

export interface TreeNode {
  id: string;
  value: string | number;
  leftId?: string | null;
  rightId?: string | null;
  children?: string[];
  isHighlighted?: boolean;
}

export interface TreeVisualData {
  treeType: "binary" | "bst" | "general";
  rootId: string;
  nodes: Record<string, TreeNode>;
}

export interface ObjectClassVisualData {
  className: string;
  fields: Array<{ name: string; type: string; defaultValue?: string }>;
  methods: Array<{ signature: string; returnType: string }>;
  instances?: Array<{
    objectName: string;
    memoryAddress?: string;
    fieldValues: Record<string, string | number>;
  }>;
}

export interface PointerItem {
  pointerName: string;
  pointerAddress: string;
  pointsToAddress: string;
  targetVariableName?: string;
  dereferencedValue: string | number;
}

export interface PointerMemoryVisualData {
  variables: VariableItem[];
  pointers: PointerItem[];
  explanation: string;
}

export interface QuestionOption {
  id: string;
  text: string;
  isCorrect: boolean;
  explanation: string;
}

export interface QuestionVisualData {
  questionText: string;
  codeSnippet?: string;
  options: QuestionOption[];
  hint?: string;
  solutionExplanation: string;
  traceSteps?: Array<{ step: string; result: string }>;
}

export interface CodePredictionData {
  code: string;
  question: string;
  expectedOutput: string;
  options: string[];
  executionTrace: Array<{ line: string; output?: string; explanation: string }>;
}

export interface DebuggingVisualData {
  buggyCode: string;
  errorLine: number;
  errorMessage: string;
  errorType: "syntax" | "runtime" | "logic" | "semantic";
  whyWrong: string;
  fixedCode: string;
  fixExplanation: string;
}

// ==========================================
// Master Structured Teaching Instruction
// ==========================================

export interface TeachingInstruction {
  type: "concept" | "step" | "question" | "recap" | "checkpoint";
  title: string;
  spokenExplanation: string;
  bulletPoints?: string[];
  visualType?: VisualType;
  language: ProgrammingLanguage;
  difficulty: LearningLevel;
  
  // Specific Visual Payloads (Type-discriminated)
  memoryData?: MemoryVisualData;
  variablesData?: VariableItem[];
  codeWalkthrough?: CodeWalkthroughData;
  flowDiagram?: FlowDiagramData;
  loopData?: LoopVisualData;
  conditionalData?: ConditionalVisualData;
  arrayData?: ArrayVisualData;
  stackQueueData?: StackQueueVisualData;
  linkedListData?: LinkedListVisualData;
  treeData?: TreeVisualData;
  objectClassData?: ObjectClassVisualData;
  pointerData?: PointerMemoryVisualData;
  questionData?: QuestionVisualData;
  predictionData?: CodePredictionData;
  debuggingData?: DebuggingVisualData;
  
  shouldWaitForStudent?: boolean;
}

/**
 * Safely parse a raw string or object into a TeachingInstruction
 */
export function parseTeachingInstruction(
  raw: Record<string, unknown> | string | null | undefined,
  fallbackTitle: string,
  fallbackLanguage: ProgrammingLanguage = "general",
  fallbackDifficulty: LearningLevel = "BEGINNER"
): TeachingInstruction {
  if (typeof raw === "object" && raw !== null && "spokenExplanation" in raw && typeof raw.spokenExplanation === "string") {
    const rawObj = raw as Record<string, unknown>;
    return {
      type: (rawObj.type as TeachingInstruction["type"]) || "concept",
      title: (rawObj.title as string) || fallbackTitle,
      spokenExplanation: raw.spokenExplanation,
      bulletPoints: Array.isArray(rawObj.bulletPoints) ? (rawObj.bulletPoints as string[]) : [],
      visualType: (rawObj.visualType as VisualType) || detectVisualType(rawObj, fallbackTitle),
      language: ((rawObj.language as string) || fallbackLanguage).toLowerCase() as ProgrammingLanguage,
      difficulty: (rawObj.difficulty as LearningLevel) || fallbackDifficulty,
      memoryData: rawObj.memoryData as TeachingInstruction["memoryData"],
      variablesData: rawObj.variablesData as TeachingInstruction["variablesData"],
      codeWalkthrough: rawObj.codeWalkthrough as TeachingInstruction["codeWalkthrough"],
      flowDiagram: rawObj.flowDiagram as TeachingInstruction["flowDiagram"],
      loopData: rawObj.loopData as TeachingInstruction["loopData"],
      conditionalData: rawObj.conditionalData as TeachingInstruction["conditionalData"],
      arrayData: rawObj.arrayData as TeachingInstruction["arrayData"],
      stackQueueData: rawObj.stackQueueData as TeachingInstruction["stackQueueData"],
      linkedListData: rawObj.linkedListData as TeachingInstruction["linkedListData"],
      treeData: rawObj.treeData as TeachingInstruction["treeData"],
      objectClassData: rawObj.objectClassData as TeachingInstruction["objectClassData"],
      pointerData: rawObj.pointerData as TeachingInstruction["pointerData"],
      questionData: rawObj.questionData as TeachingInstruction["questionData"],
      predictionData: rawObj.predictionData as TeachingInstruction["predictionData"],
      debuggingData: rawObj.debuggingData as TeachingInstruction["debuggingData"],
      shouldWaitForStudent: Boolean(rawObj.shouldWaitForStudent),
    };
  }

  // Handle JSON string or raw text
  if (typeof raw === "string") {
    const trimmed = raw.trim();
    if (trimmed.startsWith("{") && trimmed.endsWith("}")) {
      try {
        const parsed = JSON.parse(trimmed);
        return parseTeachingInstruction(parsed, fallbackTitle, fallbackLanguage, fallbackDifficulty);
      } catch {
        // Fall back to plain text
      }
    }

    // Try finding JSON block inside markdown ```json ... ```
    const jsonMatch = trimmed.match(/```(?:json)?\s*(\{[\s\S]*?\})\s*```/);
    if (jsonMatch) {
      try {
        const parsed = JSON.parse(jsonMatch[1]);
        return parseTeachingInstruction(parsed, fallbackTitle, fallbackLanguage, fallbackDifficulty);
      } catch {
        // Fall back to plain text
      }
    }

    let flowDiagram: FlowDiagramData | undefined = undefined;
    if (
      trimmed.includes("Step 1: Notice") ||
      trimmed.includes("architecture diagram") ||
      fallbackTitle.toLowerCase().includes("diagram")
    ) {
      const stepMatches = trimmed.match(/Step \d+:[^\n]+/g);
      if (stepMatches && stepMatches.length > 0) {
        const nodes = stepMatches.map((s, idx) => {
          const cleanLabel = s.replace(/^Step \d+:\s*(?:Notice the connection from\s*)?/, "").trim();
          return {
            id: `node_${idx + 1}`,
            label: cleanLabel.slice(0, 45),
            annotation: `Step ${idx + 1}`,
            isActive: idx === 0,
          };
        });
        flowDiagram = {
          title: fallbackTitle || "Architecture Flow",
          nodes,
        };
      }
    }

    const detectedVisualType = flowDiagram
      ? "FLOW_DIAGRAM"
      : detectVisualTypeFromText(raw, fallbackTitle, fallbackLanguage);

    return {
      type: "concept",
      title: fallbackTitle,
      spokenExplanation: raw,
      bulletPoints: [],
      flowDiagram,
      visualType: detectedVisualType,
      language: fallbackLanguage,
      difficulty: fallbackDifficulty,
      shouldWaitForStudent: false,
    };
  }

  return {
    type: "concept",
    title: fallbackTitle,
    spokenExplanation: "Let's explore this programming concept step by step.",
    bulletPoints: [],
    language: fallbackLanguage,
    difficulty: fallbackDifficulty,
    shouldWaitForStudent: false,
  };
}

function detectVisualType(obj: Record<string, unknown>, _title: string): VisualType | undefined {
  if (obj.codeWalkthrough) return "CODE_WALKTHROUGH";
  if (obj.memoryData) return "MEMORY_DIAGRAM";
  if (Array.isArray(obj.variablesData) && obj.variablesData.length > 0) return "VARIABLE_VISUALIZATION";
  if (obj.pointerData) return "POINTER_MEMORY_VISUALIZATION";
  if (obj.loopData) return "LOOP_VISUALIZATION";
  if (obj.conditionalData) return "CONDITIONAL_FLOW";
  if (obj.arrayData) return "ARRAY_VISUALIZATION";
  if (obj.stackQueueData && typeof obj.stackQueueData === "object" && "type" in obj.stackQueueData) {
    return (obj.stackQueueData as { type: string }).type === "stack" ? "STACK_VISUALIZATION" : "QUEUE_VISUALIZATION";
  }
  if (obj.linkedListData) return "LINKED_LIST_VISUALIZATION";
  if (obj.treeData) return "TREE_VISUALIZATION";
  if (obj.objectClassData) return "OBJECT_CLASS_VISUALIZATION";
  if (obj.questionData) return "QUESTION_INTERACTION";
  if (obj.predictionData) return "CODE_PREDICTION";
  if (obj.debuggingData) return "DEBUGGING_VISUALIZATION";
  if (obj.flowDiagram) return "FLOW_DIAGRAM";

  return undefined;
}

function detectVisualTypeFromText(text: string, title: string, lang: ProgrammingLanguage): VisualType | undefined {
  const lower = (text + " " + title).toLowerCase();
  
  if (lower.includes("pointer") || lower.includes("address") || lower.includes("dereference") || lower.includes("&var") || lower.includes("*ptr")) {
    if (lang === "c" || lang === "cpp") return "POINTER_MEMORY_VISUALIZATION";
  }
  if (lower.includes("variable") || lower.includes("store a value") || lower.includes("assign") || lower.includes("memory box")) {
    return "VARIABLE_VISUALIZATION";
  }
  if (lower.includes("for loop") || lower.includes("while loop") || lower.includes("iteration") || lower.includes("looping")) {
    return "LOOP_VISUALIZATION";
  }
  if (lower.includes("if") && (lower.includes("else") || lower.includes("elif") || lower.includes("condition"))) {
    return "CONDITIONAL_FLOW";
  }
  if (lower.includes("array") || lower.includes("list") || lower.includes("index")) {
    return "ARRAY_VISUALIZATION";
  }
  if (lower.includes("class") && (lower.includes("object") || lower.includes("constructor") || lower.includes("instance"))) {
    return "OBJECT_CLASS_VISUALIZATION";
  }
  if (lower.includes("flow") || lower.includes("execution step") || lower.includes("workflow")) {
    return "FLOW_DIAGRAM";
  }

  return undefined;
}

export interface CheckpointEvaluation {
  score: number;
  result: "CORRECT" | "GOOD" | "PARTIAL" | "WEAK" | "INCORRECT" | "NO_ANSWER";
  appreciation: string;
  whatWasCorrect: string;
  whatIsMissing: string;
  explanation: string;
  example: string;
  needsFollowUp: boolean;
  followUpQuestion: string;
  understood: boolean;
  feedback: string;
  misconceptions?: string[];
  missingConcepts?: string[];
  reason?: string;
  understandingLevel?: string;
  recommendedDifficulty?: string;
}

export function parseCheckpointEvaluation(
  rawText: string,
  question: string,
  answer: string
): CheckpointEvaluation {
  const cleanAnswer = (answer || "").trim().toLowerCase();

  // 1. Detect "I don't know" / "no idea" / "confused"
  const isNoAnswer =
    cleanAnswer === "i don't know" ||
    cleanAnswer === "i dont know" ||
    cleanAnswer === "no idea" ||
    cleanAnswer === "not sure" ||
    cleanAnswer === "i have no idea" ||
    cleanAnswer === "confused" ||
    cleanAnswer === "no clue" ||
    cleanAnswer === "idk" ||
    cleanAnswer.length < 2;

  if (isNoAnswer) {
    return {
      score: 0,
      result: "NO_ANSWER",
      appreciation: "That's completely okay. 👍",
      whatWasCorrect: "",
      whatIsMissing: "Concept needs to be explained from the beginning.",
      explanation: `Let's build the intuition step-by-step. The key idea relates directly to: ${question}`,
      example: "",
      needsFollowUp: true,
      followUpQuestion: "Would you like a simple real-world analogy to help explain this?",
      understood: false,
      feedback: "That's completely okay. 👍 Let's build the concept from the beginning.",
      misconceptions: [],
      missingConcepts: ["Foundational concept"],
      understandingLevel: "NEEDS_SUPPORT",
      recommendedDifficulty: "BEGINNER",
    };
  }

  // 2. Try parsing JSON returned by LLM
  try {
    const cleaned = rawText
      .replace(/^```json\s*/i, "")
      .replace(/^```\s*/i, "")
      .replace(/\s*```$/i, "")
      .trim();

    // Find first { and last }
    const firstBrace = cleaned.indexOf("{");
    const lastBrace = cleaned.lastIndexOf("}");
    if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
      const jsonStr = cleaned.slice(firstBrace, lastBrace + 1);
      const parsed = JSON.parse(jsonStr);

      const score = typeof parsed.score === "number" ? Math.max(0, Math.min(100, Math.round(parsed.score))) : 75;
      let result: "CORRECT" | "GOOD" | "PARTIAL" | "WEAK" | "INCORRECT" | "NO_ANSWER" = "GOOD";

      if (score >= 90) result = "CORRECT";
      else if (score >= 70) result = "GOOD";
      else if (score >= 50) result = "PARTIAL";
      else if (score >= 30) result = "WEAK";
      else result = "INCORRECT";

      const appreciation =
        parsed.appreciation ||
        (score >= 90
          ? "Excellent! 🎉"
          : score >= 70
          ? "Great job! 👍"
          : score >= 50
          ? "You're on the right track. 👍"
          : "Good attempt — let's clarify.");

      const whatWasCorrect = parsed.whatWasCorrect || "";
      const whatIsMissing = parsed.whatIsMissing || "";
      const explanation = parsed.explanation || "";
      const example = parsed.example || "";
      const needsFollowUp = typeof parsed.needsFollowUp === "boolean" ? parsed.needsFollowUp : score < 70;
      const followUpQuestion = parsed.followUpQuestion || "";
      const understood = typeof parsed.understood === "boolean" ? parsed.understood : score >= 70;

      const misconceptions = Array.isArray(parsed.misconceptions)
        ? parsed.misconceptions.map(String).filter(Boolean)
        : [];
      const missingConcepts = Array.isArray(parsed.missingConcepts)
        ? parsed.missingConcepts.map(String).filter(Boolean)
        : whatIsMissing
        ? [whatIsMissing]
        : [];

      // Construct spoken / summary feedback
      let feedback = `${appreciation} `;
      if (whatWasCorrect) feedback += `What you got right: ${whatWasCorrect} `;
      if (whatIsMissing) feedback += `What was missing: ${whatIsMissing} `;
      if (explanation && !whatWasCorrect && !whatIsMissing) feedback += explanation;

      return {
        score,
        result,
        appreciation,
        whatWasCorrect,
        whatIsMissing,
        explanation,
        example,
        needsFollowUp,
        followUpQuestion,
        understood,
        feedback: feedback.trim() || "Good answer! That captures the concept.",
        misconceptions,
        missingConcepts,
        reason: parsed.reason,
        understandingLevel: parsed.understandingLevel || (score >= 90 ? "ADVANCED" : score >= 75 ? "STRONG" : score >= 50 ? "DEVELOPING" : "NEEDS_SUPPORT"),
        recommendedDifficulty: parsed.recommendedDifficulty || (score >= 75 ? "ADVANCED" : score >= 50 ? "INTERMEDIATE" : "BEGINNER"),
      };
    }
  } catch (e) {
    // JSON parse fallback below
  }

  // 3. Robust Text Fallback Classifier
  const lower = rawText.toLowerCase();
  const lowerAns = cleanAnswer.toLowerCase();

  const isExplicitlyNegative =
    lowerAns.includes("not sure") ||
    lowerAns.includes("no idea") ||
    lowerAns.includes("dont know") ||
    lowerAns.includes("don't know") ||
    lowerAns.includes("wrong") ||
    lowerAns.includes("nothing") ||
    lowerAns.length < 4;

  let score = isExplicitlyNegative ? 25 : 75;
  let result: "CORRECT" | "GOOD" | "PARTIAL" | "WEAK" | "INCORRECT" | "NO_ANSWER" = isExplicitlyNegative ? "INCORRECT" : "GOOD";
  let appreciation = isExplicitlyNegative ? "Good attempt — let's review the concept." : "Great job! 👍";

  if (lower.includes("correct") || lower.includes("excellent") || lower.includes("spot on") || lower.includes("✅")) {
    score = 95;
    result = "CORRECT";
    appreciation = "Excellent! 🎉";
  } else if (lower.includes("almost") || lower.includes("partial") || lower.includes("on the right track") || lower.includes("🟡")) {
    score = 65;
    result = "PARTIAL";
    appreciation = "You're on the right track. 👍";
  } else if (
    lower.includes("incorrect") ||
    lower.includes("not quite") ||
    lower.includes("misconception") ||
    lower.includes("❌") ||
    lower.includes("wrong") ||
    isExplicitlyNegative
  ) {
    score = 25;
    result = "INCORRECT";
    appreciation = "Good attempt — let's look at the correct concept.";
  }

  const isUnderstood = score >= 70;

  return {
    score,
    result,
    appreciation,
    whatWasCorrect: isUnderstood ? "Accurately answered the core question." : "",
    whatIsMissing: !isUnderstood ? "Some key conceptual details require clarification." : "",
    explanation: rawText || (isUnderstood ? "Good answer! That captures the core concept." : "Let's review this concept with a simpler breakdown."),
    example: "",
    needsFollowUp: !isUnderstood,
    followUpQuestion: !isUnderstood ? "Can you explain what happens in this step?" : "",
    understood: isUnderstood,
    feedback: rawText || `${appreciation} ${isUnderstood ? "That captures the core concept." : "Let's make sure you have this down."}`,
  };
}

