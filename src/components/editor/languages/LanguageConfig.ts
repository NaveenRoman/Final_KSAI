export interface LanguageConfig {
  id: string;
  name: string;
  extension: string;
  icon: string;
  projectName: string;
  defaultFile: string;
  defaultFolder?: string;
  compiler: string;
  run: string;
  monacoLanguage: string;
  starterCode: string;
  aiRole: string;
  screenMentor: string;
  dictator: string;
  autoCode: string;
  interview: string;
}

export const LANGUAGES: LanguageConfig[] = [
  {
    id: "java",
    name: "Java",
    extension: ".java",
    icon: "https://cdn.jsdelivr.net/gh/devicons/devicon/icons/java/java-original.svg",
    projectName: "MyJavaProject",
    defaultFolder: "src",
    defaultFile: "Main.java",
    compiler: "javac",
    run: "java",
    monacoLanguage: "java",
    starterCode: `public class Main {
    public static void main(String[] args) {
        System.out.println("Welcome to KnowledgeStream AI");
    }
}`,
    aiRole: "Java Expert",
    screenMentor: "Java Mentor",
    dictator: "Java Dictator",
    autoCode: "Java Auto Code",
    interview: "Java Interview",
  },
  {
    id: "python",
    name: "Python",
    extension: ".py",
    icon: "https://cdn.jsdelivr.net/gh/devicons/devicon/icons/python/python-original.svg",
    projectName: "MyPythonProject",
    defaultFile: "main.py",
    compiler: "python",
    run: "python",
    monacoLanguage: "python",
    starterCode: `def main():
    print("Welcome to KnowledgeStream AI")

if __name__ == "__main__":
    main()`,
    aiRole: "Python Expert",
    screenMentor: "Python Mentor",
    dictator: "Python Dictator",
    autoCode: "Python Auto Code",
    interview: "Python Interview",
  },
  {
    id: "c",
    name: "C",
    extension: ".c",
    icon: "https://cdn.jsdelivr.net/gh/devicons/devicon/icons/c/c-original.svg",
    projectName: "MyCProject",
    defaultFile: "main.c",
    compiler: "gcc",
    run: "./main",
    monacoLanguage: "c",
    starterCode: `#include <stdio.h>

int main() {
    printf("Welcome to KnowledgeStream AI\\n");
    return 0;
}`,
    aiRole: "C Expert",
    screenMentor: "C Mentor",
    dictator: "C Dictator",
    autoCode: "C Auto Code",
    interview: "C Interview",
  },
  {
    id: "cpp",
    name: "C++",
    extension: ".cpp",
    icon: "https://cdn.jsdelivr.net/gh/devicons/devicon/icons/cplusplus/cplusplus-original.svg",
    projectName: "MyCppProject",
    defaultFile: "main.cpp",
    compiler: "g++",
    run: "./main",
    monacoLanguage: "cpp",
    starterCode: `#include <iostream>

int main() {
    std::cout << "Welcome to KnowledgeStream AI" << std::endl;
    return 0;
}`,
    aiRole: "C++ Expert",
    screenMentor: "C++ Mentor",
    dictator: "C++ Dictator",
    autoCode: "C++ Auto Code",
    interview: "C++ Interview",
  },
  {
    id: "javascript",
    name: "JavaScript",
    extension: ".js",
    icon: "https://cdn.jsdelivr.net/gh/devicons/devicon/icons/javascript/javascript-original.svg",
    projectName: "MyJSProject",
    defaultFile: "main.js",
    compiler: "node",
    run: "node main.js",
    monacoLanguage: "javascript",
    starterCode: `function main() {
    console.log("Welcome to KnowledgeStream AI");
}

main();`,
    aiRole: "JavaScript Expert",
    screenMentor: "JavaScript Mentor",
    dictator: "JavaScript Dictator",
    autoCode: "JavaScript Auto Code",
    interview: "JavaScript Interview",
  },
  {
    id: "typescript",
    name: "TypeScript",
    extension: ".ts",
    icon: "https://cdn.jsdelivr.net/gh/devicons/devicon/icons/typescript/typescript-original.svg",
    projectName: "MyTSProject",
    defaultFile: "main.ts",
    compiler: "tsc",
    run: "ts-node main.ts",
    monacoLanguage: "typescript",
    starterCode: `function main(): void {
    console.log("Welcome to KnowledgeStream AI");
}

main();`,
    aiRole: "TypeScript Expert",
    screenMentor: "TypeScript Mentor",
    dictator: "TypeScript Dictator",
    autoCode: "TypeScript Auto Code",
    interview: "TypeScript Interview",
  },
];

export const LANGUAGE_MAP = new Map<string, LanguageConfig>(
  LANGUAGES.map((lang) => [lang.id.toLowerCase(), lang])
);

export function getLanguageConfig(langIdOrName: string): LanguageConfig {
  const norm = (langIdOrName || "").toLowerCase().trim();
  if (norm === "c++" || norm === "cpp") return LANGUAGE_MAP.get("cpp")!;
  if (norm === "c") return LANGUAGE_MAP.get("c")!;
  if (norm === "py" || norm === "python") return LANGUAGE_MAP.get("python")!;
  if (norm === "js" || norm === "javascript") return LANGUAGE_MAP.get("javascript")!;
  if (norm === "ts" || norm === "typescript") return LANGUAGE_MAP.get("typescript")!;
  if (norm === "java") return LANGUAGE_MAP.get("java")!;
  return LANGUAGES[0];
}