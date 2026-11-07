import json

from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt
from config.internal_auth import internal_auth_required

from orchestrator.orchestrator import AIOrchestrator


@csrf_exempt
@internal_auth_required
def teach(request):

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

        course = data.get(
            "course",
            "",
        )

        chapter = data.get(
            "chapter",
            "",
        )

        topic = data.get(
            "topic",
            "",
        )

        content = data.get(
            "content",
            "",
        )

        question = data.get(
            "question",
            "",
        )

        mode = data.get(
            "mode",
            "chat",
        )

        history = data.get(
            "history",
            [],
        )

        asked_question = data.get(
    "askedQuestion",
    "",
)

        learning_memory = data.get(
            "learningMemory",
            "",
        )

        image = data.get("image", None)
        image_mime_type = data.get("imageMimeType", "image/png")

        # -----------------------------------------
        # VALIDATION & FALLBACKS
        # -----------------------------------------

        if not question.strip():
            if image:
                question = f"Analyze this diagram/screenshot and explain its concepts in relation to {topic or chapter}."
            else:
                question = f"Teach the concept of '{topic or chapter}' clearly and engagingly."

        if not content.strip():
            if topic.strip() or chapter.strip():
                content = f"Course: {course}\nChapter: {chapter}\nTopic: {topic}\nPlease teach this subject thoroughly based on standard curriculum."
            else:
                return JsonResponse(
                    {
                        "success": False,
                        "message": "Lesson content or topic is required.",
                    },
                    status=400,
                )

        allowed_modes = {
            "explain",
            "example",
            "visual",
            "question",
            "evaluate",
            "confused",
            "chat",
            "live-teaching",
            "reteach",
            "section-checkpoint",
            "evaluate-checkpoint",
            "resume-check",
            "resume-answer-evaluation",
            "vision",
            "vision-checkpoint",
            "vision-teach",
        }

        if mode not in allowed_modes:
            mode = "chat"

        # -----------------------------------------
        # TEACHING ENGINE
        # -----------------------------------------

        orchestrator = AIOrchestrator()

        result = orchestrator.teach(
            course=course,
            chapter=chapter,
            topic=topic,
            content=content,
            question=question,
            mode=mode,
            history=history,
            asked_question=asked_question,
            learning_memory=learning_memory,
            image=image,
            image_mime_type=image_mime_type,
        )

        return JsonResponse(
            {
                "success": True,
                "data": result,
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

        try:
            print()
            print("========== AI TEACHING ERROR ==========")
            print(str(error).encode("ascii", errors="replace").decode("ascii"))
            print("=======================================")
        except Exception:
            pass

        return JsonResponse(
            {
                "success": False,
                "message": "AI Teaching Engine failed.",
                "error": str(error),
            },
            status=500,
        )