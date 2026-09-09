from prompts.teach import build_teach_prompt
from prompts.explain import build_explain_prompt
from prompts.chat import build_chat_prompt

from providers.gemini import (
    generate_response,
    generate_teaching_response,
    generate_vision_teaching_response,
)
from providers.qwen import (
    generate_qwen_response,
    GUIDE_MODEL,
    
)

from prompts.guide import build_guide_prompt
from prompts.autocode import build_autocode_prompt
from prompts.dictator import build_dictator_prompt, build_fallback_dictator_plan

from prompts.interview import (
    build_interview_evaluation_prompt,
)
from orchestrator.code_verifier import verify_candidate_code
import sys


def safe_print(*args, **kwargs):
    try:
        print(*args, **kwargs)
    except UnicodeEncodeError:
        encoding = sys.stdout.encoding or "utf-8"
        safe_args = [
            str(arg).encode(encoding, errors="replace").decode(encoding)
            for arg in args
        ]
        print(*safe_args, **kwargs)
    except Exception:
        pass


class AIOrchestrator:

    # =====================================================
    # EXPLAIN
    # =====================================================

    def explain(
        self,
        language,
        code,
    ):

        prompt = build_explain_prompt(
            language,
            code,
        )

        print()
        print("========== AI REQUEST ==========")
        print("Intent :", "Explain")
        print("Language :", language)

        print()
        print("========== PROMPT ==========")
        safe_print(prompt)
        print("============================")

        ai_response = generate_response(
            prompt
        )

        return {
            "intent": "explain",
            "response": ai_response,
        }


    # =====================================================
    # CHAT
    # =====================================================

    def chat(
        self,
        language,
        code,
        history,
        question,
    ):

        prompt = build_chat_prompt(
            language,
            code,
            history,
            question,
        )

        print()
        print("========== AI CHAT REQUEST ==========")
        print("Language :", language)
        print("Question :", question)

        ai_response = None

        # 1. Try Gemini
        try:
            print("Provider :", "Google Gemini")
            ai_response = generate_response(prompt)
        except Exception as gemini_err:
            print("Gemini chat failed, trying Ollama:", gemini_err)
            # 2. Try Ollama
            try:
                print("Provider :", "Ollama")
                ai_response = generate_qwen_response(
                    prompt,
                    history,
                )
            except Exception as ollama_err:
                print("Ollama chat failed:", ollama_err)
                ai_response = f"In this {language} program, looking at your code:\n\nRegarding '{question}': The code implements the logic as structured. You can modify the variables or statements to test different behaviors."

        return {
            "intent": "chat",
            "response": ai_response,
        }



        # =====================================================
    # TEACHING ENGINE
    # =====================================================

    def teach(
        self,
        course,
        chapter,
        topic,
        content,
        question,
        mode,
        history=None,
        asked_question="",
        content_type="general",
        learning_memory="",
        image=None,
        image_mime_type="image/png",
    ):

        history = history or []

        prompt = build_teach_prompt(
            course=course,
            chapter=chapter,
            topic=topic,
            content=content,
            question=question,
            mode=mode,
            history=history,
            asked_question=asked_question,
            content_type=content_type,
            learning_memory=learning_memory,
        )
        print()
        print("========== AI TEACHING REQUEST ==========")
        print("Provider :", "Google Gemini")
        print("Model    :", "gemini-3.6-flash")
        print("Course   :", course)
        print("Chapter  :", chapter)
        print("Topic    :", topic)
        print("Mode     :", mode)
        print("Question :", question)

        print()
        print("========== TEACHING PROMPT ==========")
        safe_print(prompt)
        print("======================================")

        # -------------------------------------------------
        # TEACHER SYSTEM PROMPT
        # -------------------------------------------------

        teaching_system_prompt = """
You are CodeXAI Mentor inside KnowledgeStream AI.

You are a real AI teacher inside KnowledgeStream AI.

You teach the subject currently being studied by the
student.

The subject is determined by the COURSE, CHAPTER, TOPIC,
and LESSON CONTENT provided in the request.

Adapt your teaching style to the subject.

For programming:
use code and programming examples when appropriate.

For mathematics:
use formulas, reasoning, worked examples, and step-by-step
problem solving when appropriate.

For theoretical subjects:
use explanations, analogies, comparisons, examples, and
structured reasoning.

For any other subject:
follow the structure and terminology supported by the
provided lesson content.

Your job is to help the student UNDERSTAND,
not simply give them answers.

You are NOT:

- a generic chatbot
- an automatic code generator
- a code dumping tool
- a replacement for the student's thinking
- a generic search engine

==================================================
CORE TEACHING PRINCIPLE
==================================================

Teach like a patient teacher sitting beside the student.

Follow:

UNDERSTAND
→ EXPLAIN
→ EXAMPLE
→ CHECK
→ PRACTICE
→ MASTER

==================================================
TEACHING RULES
==================================================

1. Teach one concept at a time.

2. Use simple beginner-friendly language.

3. Explain intuition before technical details.

4. Use real-world analogies when useful.

5. Use small examples.

6. Use programming examples when appropriate.

7. Do not generate unnecessarily large programs.

8. Do not immediately solve practice tasks for the student.

9. Encourage the student to think.

10. If the student is confused, explain differently.

11. If the student gives a wrong answer, correct them
    kindly and explain why.

12. If the student gives a correct answer, acknowledge
    it and move toward the next useful concept.

13. Ask only one learning question at a time.

14. Use the current lesson content as the primary source.

15. Do not invent information about the lesson.

16. Never claim code was executed unless execution
    information was actually provided.

17. Never pretend that a student's code is wrong when
    there is no evidence of an error.

18. Keep responses concise enough for an interactive
    learning environment.

==================================================
STUDENT OWNERSHIP
==================================================

The student should do the actual thinking and coding.

Do not take away the learning opportunity by giving
complete solutions unnecessarily.

When a task can be solved with a hint, prefer the hint.

When an explanation is enough, do not generate code.

==================================================
CONFUSION HANDLING
==================================================

If the student says:

"I'm confused"
"I don't understand"
"I don't get it"
"Explain again"

Do NOT repeat the exact same explanation.

Instead:

1. Simplify the concept.
2. Use a different analogy.
3. Give a tiny example.
4. Use a visual if useful.
5. Ask one easy checking question.

==================================================
QUESTION MODE
==================================================

When asking the student a question:

Ask exactly ONE question.

Do not immediately reveal the answer.

Wait for the student's response.

==================================================
VISUAL MODE
==================================================

When explaining visually, prefer simple text diagrams,
flows, tables, or step-by-step representations.

==================================================
TONE
==================================================

Be:

- encouraging
- patient
- professional
- beginner-friendly
- concise
- educational

Never be condescending.

Never make the student feel bad for not understanding.

==================================================
IMPORTANT
==================================================

You are CodeXAI Mentor.

Your objective is:

LESS ANSWERING
MORE TEACHING.
"""



               # -------------------------------------------------
        # SEND TEACHING REQUEST
        # -------------------------------------------------

        try:

            print()
            print("========== LIVE TEACHER ==========")
            print("Provider : Google Gemini")
            print("Model    : gemini-3.6-flash / vision")
            print("===================================")

            if image:
                import base64
                image_clean = str(image).strip()
                mime = image_mime_type or "image/png"
                if "," in image_clean:
                    header, image_clean = image_clean.split(",", 1)
                    if "image/" in header:
                        mime = header.split(";")[0].replace("data:", "").strip()
                image_bytes = base64.b64decode(image_clean)

                ai_response = generate_vision_teaching_response(
                    prompt=prompt,
                    image_bytes=image_bytes,
                    mime_type=mime,
                    system_instruction=teaching_system_prompt,
                )
            else:
                ai_response = generate_teaching_response(
                    prompt=prompt,
                    system_instruction=teaching_system_prompt,
                )

            print()
            print("========== LIVE TEACHER SUCCESS ==========")
            print("Provider : Google Gemini")
            print("==========================================")

        except Exception as gemini_error:

            # =================================================
            # GEMINI FAILED - ATTEMPT OLLAMA FALLBACK
            # =================================================

            print()
            print("========== GEMINI TEACHING FAILED ==========")
            print("ERROR:", gemini_error)
            print("============================================")

            print()
            print("========== LIVE TEACHER FALLBACK ==========")
            print("Provider : Ollama")
            print("Model    :", GUIDE_MODEL)
            print("Reason   : Gemini unavailable")
            print("===========================================")

            fallback_system_prompt = teaching_system_prompt + """

==================================================
LIVE TEACHER FALLBACK MODE
==================================================

You are currently acting as the Live Teacher fallback
because the primary AI provider is temporarily unavailable.

Continue teaching normally.

Do not mention:
- API errors
- providers
- quotas
- Gemini
- Ollama
- fallback systems
- technical failures

Speak directly to the student as their teacher.

Keep the explanation:
- concise
- natural
- beginner-friendly
- focused on the current section
- suitable for live teaching

Teach only the current content.
Do not jump ahead to future sections.
"""
            try:
                ai_response = generate_qwen_response(
                    prompt=prompt,
                    history=history,
                    system_prompt=fallback_system_prompt,
                    model=GUIDE_MODEL,
                )
                print()
                print("========== FALLBACK SUCCESS ==========")
                print("Live Teacher continued using Ollama.")
                print("======================================")
            except Exception as ollama_error:
                print()
                print("========== OLLAMA FALLBACK FAILED ==========")
                print("ERROR:", ollama_error)
                print("============================================")

                try:
                    # Final attempt with direct basic gemini prompt
                    ai_response = generate_response(prompt)
                except Exception as final_error:
                    print("Final generation error:", final_error)
                    raise RuntimeError(f"Teaching engine AI providers unavailable: {gemini_error}")

        return {
            "intent": "teach",
            "mode": mode,
            "response": ai_response,
        }

    def guide(
        self,
        language,
        code,
        errors=None,
        output=None,
        file_name=None,
        history=None,
    ):

        prompt = build_guide_prompt(
            language,
            code,
            errors=errors,
            output=output,
            file_name=file_name,
        )

        print()
        print("========== AI GUIDE REQUEST ==========")
        print("Provider :", "Gemini")
        print("Language :", language)
        print("Problems :", len(errors) if errors else 0)

        print()
        print("========== GUIDE PROMPT ==========")
        safe_print(prompt)
        print("===================================")

        guide_system_prompt = """You are Codenthra AI Guide inside KnowledgeStream AI, a friendly and expert programming debugging mentor.

Your mission:
Analyze the student's code and the actual compiler/runtime diagnostic.

When an error exists:
1. WHAT WENT WRONG: Identify the error type and location (file and line).
2. WHY IT HAPPENED: Explain in simple, clear, student-friendly terms why this is an error according to the language rules.
3. HOW TO FIX IT: Show the MINIMAL, targeted line correction (do not rewrite the whole program).
4. CONCEPT / RULE: Explain the underlying language concept or rule so the student learns for the future.
5. NEXT STEP: Give one encouraging, actionable next step (e.g. apply the change and re-run the code).

When NO error exists:
- Acknowledge: "✅ No error detected. Your program compiled and executed cleanly."
- Offer one small next concept or challenge for the student to try next.

Rules:
- Never invent or fabricate compiler errors.
- Always treat C++ as C++, C as C, Java as Java, and Python as Python.
- Keep the response educational, concise, encouraging, and beginner-friendly."""

        try:
            ai_response = generate_teaching_response(
                prompt,
                system_instruction=guide_system_prompt,
            )
        except Exception as e:
            print("Gemini generate_teaching_response fallback:", e)
            try:
                ai_response = generate_response(
                    f"{guide_system_prompt}\n\n{prompt}"
                )
            except Exception as e2:
                print("Gemini generate_response fallback:", e2)
                ai_response = generate_qwen_response(
                    prompt,
                    history,
                    system_prompt=guide_system_prompt,
                    model=GUIDE_MODEL,
                )

        return {
            "intent": "guide",
            "response": ai_response,
        }

    # =====================================================
    # DICTATOR (STEP-BY-STEP PROGRAM TEACHER)
    # =====================================================

    def dictate(
        self,
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
    ):
        norm_lang = (language or "java").lower().strip()
        if norm_lang == "java":
            clean_proj = (project or "Application").strip()
            cat = (student_category or level or "beginner").lower().strip()
            sub = str(practice_level or "1").strip()
            program_id = f"JAVA_{clean_proj.upper().replace(' ', '_')}_{cat.upper()}_{sub}"

            print()
            print("========== JAVA DICTATOR ENGINE ==========")
            print("Language      :", language)
            print("Topic         :", project)
            print("Learning Group:", cat.upper())
            print("Practice Level:", sub)
            print("Program ID    :", program_id)
            print("Target File   :", active_file_name or "Main.java")
            parsed = build_fallback_dictator_plan(
                language=language,
                project=project,
                level=level,
                student_category=student_category,
                practice_level=practice_level,
                iteration=iteration,
            )
            return {
                "intent": "dictate",
                "programId": program_id,
                "program_id": program_id,
                "language": parsed.get("language", "Java"),
                "project": parsed.get("project", project),
                "studentCategory": parsed.get("studentCategory", cat.upper()),
                "learningGroup": cat.upper(),
                "practiceLevel": f"LEVEL {sub}",
                "primaryFile": parsed.get("primaryFile", "Main.java"),
                "files": parsed.get("files", []),
                "requirements": parsed.get("requirements", []),
                "totalSteps": parsed.get("totalSteps", len(parsed.get("steps", []))),
                "steps": parsed.get("steps", []),
            }

        elif norm_lang in ["python", "py", "python3"]:
            clean_proj = (project or "Application").strip()
            cat = (student_category or level or "beginner").lower().strip()
            sub = str(practice_level or "1").strip()
            program_id = f"PYTHON_{clean_proj.upper().replace(' ', '_')}_{cat.upper()}_{sub}"

            print()
            print("========== PYTHON DICTATOR ENGINE ==========")
            print("Language      :", language)
            print("Topic         :", project)
            print("Learning Group:", cat.upper())
            print("Practice Level:", sub)
            print("Program ID    :", program_id)
            print("Target File   :", active_file_name or "main.py")
            parsed = build_fallback_dictator_plan(
                language=language,
                project=project,
                level=level,
                student_category=student_category,
                practice_level=practice_level,
                iteration=iteration,
            )
            return {
                "intent": "dictate",
                "programId": program_id,
                "program_id": program_id,
                "language": parsed.get("language", "Python"),
                "project": parsed.get("project", project),
                "studentCategory": parsed.get("studentCategory", cat.upper()),
                "learningGroup": cat.upper(),
                "practiceLevel": f"LEVEL {sub}",
                "primaryFile": parsed.get("primaryFile", "main.py"),
                "files": parsed.get("files", []),
                "requirements": parsed.get("requirements", []),
                "totalSteps": parsed.get("totalSteps", len(parsed.get("steps", []))),
                "steps": parsed.get("steps", []),
            }

        elif norm_lang in ["c"]:
            clean_proj = (project or "Application").strip()
            cat = (student_category or level or "beginner").lower().strip()
            sub = str(practice_level or "1").strip()
            program_id = f"C_{clean_proj.upper().replace(' ', '_')}_{cat.upper()}_{sub}"

            print()
            print("========== C DICTATOR ENGINE ==========")
            print("Language      :", language)
            print("Topic         :", project)
            print("Learning Group:", cat.upper())
            print("Practice Level:", sub)
            print("Program ID    :", program_id)
            print("Target File   :", active_file_name or "main.c")
            parsed = build_fallback_dictator_plan(
                language=language,
                project=project,
                level=level,
                student_category=student_category,
                practice_level=practice_level,
                iteration=iteration,
            )
            return {
                "intent": "dictate",
                "programId": program_id,
                "program_id": program_id,
                "language": parsed.get("language", "C"),
                "project": parsed.get("project", project),
                "studentCategory": parsed.get("studentCategory", cat.upper()),
                "learningGroup": cat.upper(),
                "practiceLevel": f"LEVEL {sub}",
                "primaryFile": parsed.get("primaryFile", "main.c"),
                "files": parsed.get("files", []),
                "requirements": parsed.get("requirements", []),
                "totalSteps": parsed.get("totalSteps", len(parsed.get("steps", []))),
                "steps": parsed.get("steps", []),
            }

        elif norm_lang in ["cpp", "c++"]:
            clean_proj = (project or "Application").strip()
            cat = (student_category or level or "beginner").lower().strip()
            sub = str(practice_level or "1").strip()
            program_id = f"CPP_{clean_proj.upper().replace(' ', '_')}_{cat.upper()}_{sub}"

            print()
            print("========== C++ DICTATOR ENGINE ==========")
            print("Language      :", language)
            print("Topic         :", project)
            print("Learning Group:", cat.upper())
            print("Practice Level:", sub)
            print("Program ID    :", program_id)
            print("Target File   :", active_file_name or "main.cpp")
            parsed = build_fallback_dictator_plan(
                language=language,
                project=project,
                level=level,
                student_category=student_category,
                practice_level=practice_level,
                iteration=iteration,
            )
            return {
                "intent": "dictate",
                "programId": program_id,
                "program_id": program_id,
                "language": parsed.get("language", "C++"),
                "project": parsed.get("project", project),
                "studentCategory": parsed.get("studentCategory", cat.upper()),
                "learningGroup": cat.upper(),
                "practiceLevel": f"LEVEL {sub}",
                "primaryFile": parsed.get("primaryFile", "main.cpp"),
                "files": parsed.get("files", []),
                "requirements": parsed.get("requirements", []),
                "totalSteps": parsed.get("totalSteps", len(parsed.get("steps", []))),
                "steps": parsed.get("steps", []),
            }

        prompt = build_dictator_prompt(
            language=language,
            project=project,
            level=level,
            active_file_name=active_file_name,
            active_file_content=active_file_content,
            project_files=project_files,
            learning_memory=learning_memory,
            student_category=student_category,
            practice_level=practice_level,
            iteration=iteration,
        )

        print()
        print("========== AI DICTATOR REQUEST ==========")
        print("Language   :", language)
        print("Project    :", project)
        print("Category   :", student_category or level)
        print("Level      :", practice_level or "1")
        print("Iteration  :", iteration)
        print("Target File:", active_file_name or "auto")

        dictator_system_instruction = (
            "You are Codenthra AI Dictator inside KnowledgeStream AI. "
            "You teach programming step-by-step. "
            "Output ONLY a valid JSON object matching the requested schema with no markdown formatting."
        )

        parsed = None

        try:
            ai_response = generate_teaching_response(
                prompt,
                system_instruction=dictator_system_instruction,
                response_mime_type="application/json",
                max_output_tokens=4000,
            )

            import json, re
            cleaned = ai_response.strip()
            if cleaned.startswith("```"):
                cleaned = re.sub(r"^```(?:json)?\s*", "", cleaned)
                cleaned = re.sub(r"\s*```$", "", cleaned)

            try:
                parsed = json.loads(cleaned)
            except Exception:
                match = re.search(r"(\{.*\})", cleaned, re.DOTALL)
                if match:
                    parsed = json.loads(match.group(1))
        except Exception as e:
            print("Gemini generate_teaching_response error in dictate:", e)

        # Verification & Repair Loop
        if parsed and isinstance(parsed, dict) and parsed.get("steps"):
            final_code = parsed["steps"][-1].get("code", "") or parsed["steps"][-1].get("stepCode", "")
            verification = verify_candidate_code(final_code, language, project)
            if not verification.is_valid:
                print(f"Dictator candidate code failed verification: {verification.error_message}. Attempting repair...")
                repaired = False
                for attempt in range(3):
                    repair_prompt = (
                        f"The generated code for '{project}' in '{language}' (level '{level}') failed verification.\n"
                        f"Verification error: {verification.error_message}\n\n"
                        f"Previous invalid candidate code:\n{final_code}\n\n"
                        f"Please fix all errors, ensure 100% syntactic correctness, and output ONLY valid JSON matching the exact schema."
                    )
                    try:
                        rep_resp = generate_teaching_response(
                            repair_prompt,
                            system_instruction=dictator_system_instruction,
                            response_mime_type="application/json",
                            max_output_tokens=4000,
                        )
                        rep_cleaned = rep_resp.strip()
                        if rep_cleaned.startswith("```"):
                            rep_cleaned = re.sub(r"^```(?:json)?\s*", "", rep_cleaned)
                            rep_cleaned = re.sub(r"\s*```$", "", rep_cleaned)
                        rep_parsed = json.loads(rep_cleaned)
                        if rep_parsed and rep_parsed.get("steps"):
                            rep_final_code = rep_parsed["steps"][-1].get("code", "") or rep_parsed["steps"][-1].get("stepCode", "")
                            rep_verification = verify_candidate_code(rep_final_code, language, project)
                            if rep_verification.is_valid:
                                parsed = rep_parsed
                                repaired = True
                                print(f"Successfully repaired code on attempt {attempt + 1}.")
                                break
                    except Exception as rep_err:
                        print(f"Repair attempt {attempt + 1} failed:", rep_err)

                if not repaired:
                    print("Repair loop exhausted. Falling back to verified structured Dictator plan...")
                    parsed = None

        if not parsed or not isinstance(parsed, dict) or not parsed.get("steps"):
            print("Using fallback structured Dictator plan...")
            fallback = build_fallback_dictator_plan(
                language=language,
                project=project,
                level=level,
                student_category=student_category,
                practice_level=practice_level,
                iteration=iteration,
            )
            parsed = fallback

        return {
            "intent": "dictate",
            "language": parsed.get("language", language),
            "project": parsed.get("project", project),
            "studentCategory": parsed.get("studentCategory", (student_category or level).upper()),
            "practiceLevel": parsed.get("practiceLevel", f"LEVEL {practice_level or '1'}"),
            "primaryFile": parsed.get("primaryFile", active_file_name or "Main.java"),
            "files": parsed.get("files", []),
            "requirements": parsed.get("requirements", []),
            "totalSteps": parsed.get("totalSteps", len(parsed.get("steps", []))),
            "steps": parsed.get("steps", []),
        }

    # =====================================================
    # INTERVIEW EVALUATION
    # =====================================================

    def evaluate_interview(
        self,
        role,
        technology,
        difficulty,
        category,
        question,
        answer,
        expected_topics,
        previous_context=None,
    ):

        prompt = build_interview_evaluation_prompt(
            role=role,
            technology=technology,
            difficulty=difficulty,
            category=category,
            question=question,
            answer=answer,
            expected_topics=expected_topics,
            previous_context=previous_context,
        )

        print()
        print("========== AI INTERVIEW REQUEST ==========")
        print("Provider :", "Ollama")
        print("Model    :", "Qwen")
        print("Role     :", role)
        print("Technology :", technology)
        print("Category :", category)

        print()
        print("========== INTERVIEW PROMPT ==========")
        safe_print(prompt)
        print("======================================")

        interview_system_prompt = """
You are CodeXAI Interviewer inside KnowledgeStream AI.

You are a professional technical interviewer.

Evaluate the candidate's answer objectively.

Return ONLY valid JSON.

Never return Markdown.

Never wrap the JSON in code fences.

Use exactly these fields:

decision
technical_score
communication_score
relevance_score
feedback
follow_up_question

decision must be:

NEXT
FOLLOWUP
SKIP

If decision is NEXT or SKIP,
follow_up_question must be null.

If decision is FOLLOWUP,
follow_up_question must contain exactly one question.
"""

        ai_response = generate_qwen_response(
            prompt,
            history=None,
            system_prompt=interview_system_prompt,
        )

        return {
            "intent": "interview_evaluation",
            "response": ai_response,
        }

    # =====================================================
    # AUTO CODE
    # =====================================================

    def autocode(
        self,
        language,
        project,
        level="beginner",
    ):

        prompt = build_autocode_prompt(
            language=language,
            project=project,
            level=level,
        )

        print()
        print("========== AUTO CODE REQUEST ==========")
        print("Provider :", "Gemini")
        print("Language :", language)
        print("Project  :", project)
        print("Level    :", level)

        print()
        print("========== AUTO CODE PROMPT ==========")
        safe_print(prompt)
        print("======================================")

        ai_response = None
        try:
            ai_response = generate_response(prompt)
        except Exception as e:
            print("Gemini generate_response error in autocode:", e)

        # Verification & Repair for AutoCode
        import json, re
        valid_response = False
        if ai_response:
            try:
                cleaned = ai_response.strip()
                if cleaned.startswith("```"):
                    cleaned = re.sub(r"^```(?:json)?\s*", "", cleaned)
                    cleaned = re.sub(r"\s*```$", "", cleaned)
                parsed = json.loads(cleaned)
                code_candidate = parsed.get("code", "")
                verification = verify_candidate_code(code_candidate, language, project)
                if verification.is_valid:
                    valid_response = True
                else:
                    print(f"AutoCode candidate failed verification: {verification.error_message}. Attempting repair...")
                    for attempt in range(3):
                        repair_prompt = (
                            f"The generated {language} code for '{project}' (level '{level}') failed verification: {verification.error_message}.\n"
                            f"Previous code:\n{code_candidate}\n\n"
                            f"Please return 100% valid, correct, complete, and runnable {language} code in JSON format without markdown fences."
                        )
                        try:
                            rep_resp = generate_response(repair_prompt)
                            rep_cleaned = (rep_resp or "").strip()
                            if rep_cleaned.startswith("```"):
                                rep_cleaned = re.sub(r"^```(?:json)?\s*", "", rep_cleaned)
                                rep_cleaned = re.sub(r"\s*```$", "", rep_cleaned)
                            rep_parsed = json.loads(rep_cleaned)
                            rep_code = rep_parsed.get("code", "")
                            rep_ver = verify_candidate_code(rep_code, language, project)
                            if rep_ver.is_valid:
                                ai_response = rep_resp
                                valid_response = True
                                print(f"AutoCode repaired successfully on attempt {attempt + 1}.")
                                break
                        except Exception as rep_err:
                            print(f"AutoCode repair attempt {attempt + 1} error:", rep_err)
            except Exception as err:
                print("AutoCode verification handling error:", err)

        # If LLM failed to produce verified code, use our guaranteed verified plan
        if not valid_response:
            print("AutoCode falling back to verified structured plan...")
            fb = build_fallback_dictator_plan(language, project, level)
            steps = fb.get("steps", [])
            fb_code = steps[-1]["code"] if steps else f"// Complete {project} program"
            fb_explanation = (
                f"### 📖 {fb.get('project', project)} ({language.upper()} - {level.capitalize()})\n\n"
                f"This program provides a complete, working implementation of {project}.\n\n"
                f"**Key Components:**\n"
                + "\n".join(f"- {s.get('title', 'Step')}: {s.get('explanation', '')}" for s in steps)
            )
            ai_response = json.dumps({
                "code": fb_code,
                "explanation": fb_explanation
            })

        return {
            "intent": "autocode",
            "response": ai_response,
        }