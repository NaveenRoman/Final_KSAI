export interface TestCase {
  input: string;
  expectedOutput: string;
  isHidden?: boolean;
  weight?: number;
}

export interface ProgrammingChallenge {
  id: string;
  course: "java" | "c" | "cpp" | "python";
  chapterOrder: number;
  programIndex: number; // 0-indexed for multi-program sequence (Program A = 0, B = 1, C = 2)
  title: string;
  difficulty: "EASY" | "MEDIUM" | "HARD";
  objective: string;
  description: string;
  starterCode: string;
  constraints: string[];
  examples: Array<{
    input: string;
    output: string;
    explanation?: string;
  }>;
  testCases: TestCase[];
  referenceSolution: string;
  hints: string[];
}

export interface ChallengeSubmissionEvaluation {
  challengeId: string;
  score: number; // 0 - 100
  passed: boolean; // score >= 70
  totalTestCases: number;
  passedTestCases: number;
  results: Array<{
    testCaseIndex: number;
    passed: boolean;
    actualOutput: string;
    expectedOutput: string;
    input: string;
    isHidden: boolean;
    executionTimeMs?: number;
    error?: string;
  }>;
  compilerError?: string | null;
}
