import json
from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt

from orchestrator.orchestrator import AIOrchestrator


@csrf_exempt
def dictate(request):
    if request.method != "POST":
        return JsonResponse(
            {
                "success": False,
                "message": "POST only.",
            },
            status=405,
        )

    try:
        data = json.loads(request.body)
        language = data.get("language", "python")
        project = data.get("project", "") or data.get("topic", "") or data.get("task", "") or data.get("requestedProgram", "")
        level = data.get("level", "") or data.get("learningLevel", "") or "beginner"
        student_category = data.get("learningGroup", "") or data.get("studentCategory", "") or data.get("category", "") or data.get("student_category", "")
        practice_level = data.get("practiceLevel", "") or data.get("subLevel", "") or data.get("practice_level", "")
        iteration = data.get("iteration", 1) or data.get("attempt", 1)
        active_file_name = data.get("activeFileName", "")
        active_file_content = data.get("activeFileContent", "")
        project_files = data.get("projectFiles", [])
        learning_memory = data.get("learningMemory", "")

        print(f"[DICTATOR API] Request: Language={language} | Topic={project} | LearningGroup={student_category} | PracticeLevel={practice_level}")

        if not project.strip():
            return JsonResponse(
                {
                    "success": False,
                    "message": "Project or task description is required.",
                },
                status=400,
            )

        orchestrator = AIOrchestrator()
        result = orchestrator.dictate(
            language=language,
            project=project,
            level=level,
            active_file_name=active_file_name,
            active_file_content=active_file_content,
            project_files=project_files,
            learning_memory=learning_memory,
            student_category=student_category,
            practice_level=practice_level,
            iteration=int(iteration) if str(iteration).isdigit() else 1,
        )

        return JsonResponse(
            {
                "success": True,
                "data": result,
                "programId": result.get("programId", ""),
                "primaryFile": result.get("primaryFile", "Main.java" if (language or "").lower() == "java" else "main.py"),
                "files": result.get("files", []),
                "studentCategory": result.get("studentCategory", student_category),
                "learningGroup": result.get("learningGroup", (student_category or level).upper()),
                "practiceLevel": result.get("practiceLevel", practice_level),
                "requirements": result.get("requirements", []),
                "steps": result.get("steps", []),
                "totalSteps": result.get("totalSteps", 0),
                "language": result.get("language", language),
                "project": result.get("project", project),
            }
        )
    except json.JSONDecodeError:
        return JsonResponse(
            {
                "success": False,
                "message": "Invalid JSON.",
            },
            status=400,
        )
    except Exception as error:
        print("Dictator view error:", error)
        return JsonResponse(
            {
                "success": False,
                "message": str(error) or "AI Dictator failed to generate plan.",
            },
            status=500,
        )
