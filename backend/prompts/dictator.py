# -*- coding: utf-8 -*-
"""
Codenthra AI Dictator - Production Prompt Architecture & Pedagogical Matrix Engine (V8.0)
Universal Language Support: Java, Python, C, C++, JavaScript, TypeScript.
3 Categories (Beginner, Intermediate, Advanced) x 3 Practice Levels = 9 distinct variants per concept.
Zero generic arithmetic fallback. Full concept integrity. Multi-file & package support.
"""

def build_dictator_prompt(
    language: str,
    project: str,
    level: str = "beginner",
    active_file_name: str = "",
    active_file_content: str = "",
    project_files: list = None,
    learning_memory: str = "",
    student_category: str = "",
    practice_level: str = "",
    iteration: int = 1,
    previous_attempts: list = None,
) -> str:
    norm_lang = (language or "Python").strip()
    lower = norm_lang.lower()
    if lower in ["cpp", "c++"]:
        norm_lang = "C++"
    elif lower in ["c"]:
        norm_lang = "C"
    elif lower in ["python", "py", "python3"]:
        norm_lang = "Python"
    elif lower in ["javascript", "js"]:
        norm_lang = "JavaScript"
    elif lower in ["typescript", "ts"]:
        norm_lang = "TypeScript"
    elif lower in ["java"]:
        norm_lang = "Java"
    else:
        norm_lang = language.capitalize()

    raw_lvl = (level or "beginner").lower().strip()
    category = (student_category or "").lower().strip()
    sub_level = str(practice_level or "").strip()

    if not category:
        if "advanced" in raw_lvl or "adv" in raw_lvl:
            category = "advanced"
        elif "intermediate" in raw_lvl or "int" in raw_lvl:
            category = "intermediate"
        else:
            category = "beginner"

    if not sub_level:
        if "l3" in raw_lvl or "level 3" in raw_lvl or "level3" in raw_lvl or "3" in raw_lvl:
            sub_level = "3"
        elif "l2" in raw_lvl or "level 2" in raw_lvl or "level2" in raw_lvl or "2" in raw_lvl:
            sub_level = "2"
        else:
            sub_level = "1"

    target_file = active_file_name or ("main.py" if norm_lang == "Python" else ("Main.java" if norm_lang == "Java" else ("main.c" if norm_lang == "C" else ("main.cpp" if norm_lang == "C++" else ("main.js" if norm_lang == "JavaScript" else "main.ts")))))

    project_context = ""
    if project_files and len(project_files) > 0:
        file_names = [f.get("name", str(f)) if isinstance(f, dict) else str(f) for f in project_files]
        project_context = f"\nPROJECT FILES IN WORKSPACE: {', '.join(file_names)}\nACTIVE TARGET FILE: {target_file}"
    else:
        project_context = f"\nACTIVE TARGET FILE: {target_file}"

    memory_context = ""
    if learning_memory and str(learning_memory).strip():
        memory_context = f"\nSTUDENT LEARNING MEMORY & FOCUS AREAS:\n{learning_memory.strip()}\n"

    variation_context = ""
    if iteration and int(iteration) > 1:
        variation_context = f"\nVARIATION & REPETITION PREVENTION: This is attempt #{iteration} for this topic. You MUST generate a genuinely different use-case, application scenario, and algorithmic problem for '{project}' than previous standard attempts.\n"

    return f"""You are Codenthra AI Dictator inside KnowledgeStream AI.
You are a Universal Programming Teacher and Code Verification Engine.
Your highest priority is: CODE CORRECTNESS FIRST and FAITHFUL TEACHING OF THE EXACT REQUESTED PROGRAM.
Generate ONLY code that is technically, syntactically, and logically correct for {norm_lang}.

THE STUDENT'S REQUEST CONTRACT:
1. LANGUAGE: {norm_lang}
2. REQUESTED TOPIC / PROGRAM: {project}
3. STUDENT CATEGORY: {category.upper()}
4. PRACTICE LEVEL: LEVEL {sub_level}{project_context}{memory_context}{variation_context}

CRITICAL PEDAGOGICAL & ARCHITECTURAL RULES:

1. EXACT TOPIC FIDELITY & ZERO PLACEHOLDERS (NEVER GENERATE DUMMY PRINTS OR GENERIC ARITHMETIC):
   - The user's requested topic ("{project}") is authoritative.
   - You MUST generate an actual, working implementation of "{project}".
   - NEVER generate fake code like:
     * print("Executing {project} solution in Python.")
     * System.out.println("Executing {project} domain logic.");
     * printf("Executing {project} solution\\n");
     * return True
     * a = 25, b = 15; sum = a + b
     * int result = 0; for (int i = 1; i <= 5; i++) result += i * i;
   - The program MUST actually calculate, sort, search, manipulate data structures, or execute the requested algorithmic behavior!

2. 3-CATEGORY x 3-LEVEL PRACTICE MATRIX (GENUINELY DIFFERENT IMPLEMENTATIONS):
   You MUST adjust both architecture and specific problem use-case according to:
   - BEGINNER:
     * Level 1 (Variant 1): Clean, concise, foundational introduction to the topic (10-18 lines). Simple variable names, step-by-step logic.
     * Level 2 (Variant 2): An alternative problem demonstrating the same topic with slightly more logic or practical context (15-25 lines).
     * Level 3 (Variant 3): A small practical mini-challenge applying the topic to a concrete problem (20-30 lines).
   - INTERMEDIATE:
     * Level 1 (Variant 1): Modular implementation using dedicated functions/methods and structured data (25-35 lines).
     * Level 2 (Variant 2): Multi-operation logic with parameter validation, error checks, and state management (30-45 lines).
     * Level 3 (Variant 3): Practical real-world workflow or algorithm combining multiple concepts (35-50 lines).
   - ADVANCED:
     * Level 1 (Variant 1): Professional architecture with generics/templates, custom exceptions, and modular design (40-60 lines).
     * Level 2 (Variant 2): Defensive edge-case handling, memory safety/RAII, performance optimization, and robust contracts (50-75 lines).
     * Level 3 (Variant 3): Enterprise-grade architecture, concurrent or thread-safe patterns, user input, or multi-class/multi-file structures where beneficial (60+ lines).

3. MULTI-FILE AND PACKAGE SUPPORT:
   - When advanced architecture warrants multiple files (e.g. a model and service, or header and source):
     * Return a "primaryFile" string (the main entry point file).
     * Return a "files" array with objects containing {{"name": "...", "content": "..."}}.
     * The step sequence teaches the primary file while referencing or defining the supporting files.

4. USER INPUT SUPPORT:
   - When interactive user input is appropriate or requested, use language-idiomatic input:
     * Python: input()
     * Java: java.util.Scanner(System.in) or BufferedReader
     * C: scanf() or fgets()
     * C++: std::cin or std::getline()
     * JS/TS: readline or prompt handler

5. STRICT LANGUAGE CONVENTIONS:
   - If Java: Idiomatic Java (public class Main, standard imports like java.util.*, java.io.*, correct package/method structure).
   - If Python: Idiomatic Python 3 (def main():, clean types, docstrings, __name__ == '__main__').
   - If C: Standard C (#include <stdio.h>, #include <stdlib.h>, explicit memory management where needed).
   - If C++: Modern C++17 (#include <iostream>, STL containers, clean classes/templates).
   - If JavaScript: Modern ES6+ JavaScript (clean functions/classes, modules).
   - If TypeScript: Modern TypeScript (interfaces, strong type annotations, generics).
   - NEVER output syntax from another language.

6. COMPLETE WORKING PROGRAM:
   - The teaching plan must build the ENTIRE working program from line 1 to the end.
   - The final step's "code" MUST be the 100% complete, runnable {norm_lang} program implementing "{project}".

7. Return ONLY a valid JSON object matching this schema:
{{
  "language": "{norm_lang}",
  "project": "{project}",
  "studentCategory": "{category.upper()}",
  "practiceLevel": "LEVEL {sub_level}",
  "primaryFile": "{target_file}",
  "files": [
    {{
      "name": "{target_file}",
      "content": "Full source code of this file..."
    }}
  ],
  "requirements": [
    "Structure and headers",
    "Data model and initialization",
    "Core topic algorithms",
    "Execution and output demonstration"
  ],
  "totalSteps": 4,
  "steps": [
    {{
      "step": 1,
      "title": "Concise Step Title",
      "concept": "Core concept taught",
      "instruction": "Clear student instruction...",
      "explanation": "Pedagogical explanation...",
      "why": "Why this is required...",
      "example": "Snippet...",
      "code": "Accumulated code up to this step...",
      "stepCode": "Only the new code introduced in this step...",
      "hint": "Hint...",
      "speech": "Voice script...",
      "expected": "Expected keyword/token...",
      "type": "structure"
    }}
  ]
}}"""


# =========================================================================
# UNIVERSAL PEDAGOGICAL FALLBACK SYNTHESIZER (ZERO ARITHMETIC GUARANTEE)
# =========================================================================

def build_fallback_dictator_plan(
    language: str,
    project: str,
    level: str = "beginner",
    student_category: str = "",
    practice_level: str = "",
    iteration: int = 1
) -> dict:
    norm = (language or "java").lower().strip()
    if norm in ["cpp", "c++"]: norm = "cpp"
    elif norm in ["python", "py", "python3"]: norm = "python"
    elif norm in ["javascript", "js"]: norm = "javascript"
    elif norm in ["typescript", "ts"]: norm = "typescript"
    elif norm in ["c"]: norm = "c"
    else: norm = "java"

    proj = project.strip() or "Program"

    # Parse category and sublevel
    cat = (student_category or "").lower().strip()
    raw_lvl = (level or "beginner").lower().strip()
    if not cat:
        if "adv" in raw_lvl: cat = "advanced"
        elif "int" in raw_lvl: cat = "intermediate"
        else: cat = "beginner"

    explicit_practice_level = str(practice_level or "").strip()
    if explicit_practice_level and explicit_practice_level != "undefined":
        sub_lvl = explicit_practice_level
    else:
        if "3" in raw_lvl or "l3" in raw_lvl: sub_lvl = "3"
        elif "2" in raw_lvl or "l2" in raw_lvl: sub_lvl = "2"
        else: sub_lvl = "1"
        if iteration > 1:
            base_num = int(sub_lvl) if sub_lvl.isdigit() else 1
            sub_lvl = str(((base_num - 1 + (iteration - 1)) % 3) + 1)

    program_id = f"{norm.upper()}_{proj.upper().replace(' ', '_')}_{cat.upper()}_{sub_lvl}"

    target_file = (
        "main.py" if norm == "python"
        else "Main.java" if norm == "java"
        else "main.c" if norm == "c"
        else "main.cpp" if norm == "cpp"
        else "main.js" if norm == "javascript"
        else "main.ts"
    )

    def make_plan(lang_name, reqs, steps_data, files=None):
        steps = []
        accum = ""
        for i, s in enumerate(steps_data):
            step_code = s["insert"]
            accum += step_code
            steps.append({
                "step": i + 1,
                "title": s["title"],
                "concept": s.get("concept", s["title"]),
                "instruction": s["instruction"],
                "explanation": s["explanation"],
                "why": s.get("why", "Key architectural requirement."),
                "example": s["token"],
                "code": accum,
                "stepCode": step_code,
                "hint": s.get("hint", f"Type {s['token']}"),
                "speech": f"Step {i + 1}. {s['instruction']}",
                "expected": s["token"],
                "type": s.get("type", "structure"),
            })
        final_code = steps[-1]["code"] if steps else ""
        file_list = files or [{"name": target_file, "content": final_code}]
        return {
            "programId": program_id,
            "program_id": program_id,
            "language": lang_name,
            "project": proj,
            "studentCategory": cat.upper(),
            "practiceLevel": f"LEVEL {sub_lvl}",
            "primaryFile": target_file,
            "files": file_list,
            "requirements": reqs,
            "totalSteps": len(steps),
            "steps": steps,
        }

    if norm == "java":
        from prompts.java_catalog import get_java_dictator_program
        java_res = get_java_dictator_program(proj, cat, sub_lvl)
        if java_res:
            return make_plan(java_res["lang_name"], java_res["requirements"], java_res["steps"], java_res.get("files"))

    if norm == "python":
        from prompts.python_catalog import get_python_dictator_program
        py_res = get_python_dictator_program(proj, cat, sub_lvl)
        if py_res:
            return make_plan(py_res["lang_name"], py_res["requirements"], py_res["steps"], py_res.get("files"))

    if norm == "c":
        from prompts.c_catalog import get_c_dictator_program
        c_res = get_c_dictator_program(proj, cat, sub_lvl)
        if c_res:
            return make_plan(c_res["lang_name"], c_res["requirements"], c_res["steps"], c_res.get("files"))

    if norm == "cpp":
        from prompts.cpp_catalog import get_cpp_dictator_program
        cpp_res = get_cpp_dictator_program(proj, cat, sub_lvl)
        if cpp_res:
            return make_plan(cpp_res["lang_name"], cpp_res["requirements"], cpp_res["steps"], cpp_res.get("files"))

    from prompts.dictator_catalog import get_catalog_program, synthesize_domain_program
    catalog_res = get_catalog_program(norm, proj, cat, sub_lvl)
    if catalog_res:
        return make_plan(catalog_res["lang_name"], catalog_res["requirements"], catalog_res["steps"], catalog_res.get("files"))

    syn_res = synthesize_domain_program(norm, proj, cat, sub_lvl)
    return make_plan(syn_res["lang_name"], syn_res["requirements"], syn_res["steps"], syn_res.get("files"))
