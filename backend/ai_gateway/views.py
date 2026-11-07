from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt
from config.internal_auth import internal_auth_required

from orchestrator.orchestrator import AIOrchestrator

import json


@csrf_exempt
@internal_auth_required
def explain_code(request):

    if request.method != "POST":
        return JsonResponse(
            {
                "success": False,
                "message": "POST only."
            },
            status=405
        )

    data = json.loads(request.body)

    language = data.get("language")

    code = data.get("code")

    orchestrator = AIOrchestrator()

    result = orchestrator.explain(

    language,

    code,

    )

    return JsonResponse({

    "success": True,

    "data": result,

})

@csrf_exempt
@internal_auth_required
def chat_code(request):

    if request.method != "POST":

        return JsonResponse(
            {
                "success": False,
                "message": "POST only."
            },
            status=405
        )


    try:

        data = json.loads(
            request.body
        )


        language = data.get(
            "language",
            ""
        )

        code = data.get(
            "code",
            ""
        )

        question = data.get(
            "question",
            ""
        )

        history = data.get(
            "history",
            []
        )


        if not question.strip():

            return JsonResponse(
                {
                    "success": False,
                    "message": "Question is required."
                },
                status=400
            )


        orchestrator = AIOrchestrator()


        result = orchestrator.chat(

            language,

            code,

            history,

            question,

        )


        return JsonResponse({

            "success": True,

            "data": result,

        })


    except json.JSONDecodeError:

        return JsonResponse(
            {
                "success": False,
                "message": "Invalid JSON."
            },
            status=400
        )


    except Exception as error:

        print(
            "Chat error:",
            error
        )

        return JsonResponse(
            {
                "success": False,
                "message": "AI chat failed."
            },
            status=500
        )


@csrf_exempt
@internal_auth_required
def autocode_code(request):

    if request.method != "POST":

        return JsonResponse(
            {
                "success": False,
                "message": "POST only."
            },
            status=405
        )

    try:

        data = json.loads(
            request.body
        )

        language = data.get(
            "language",
            "java"
        )

        project = data.get(
            "project",
            ""
        ).strip()

        if not project:

            return JsonResponse(
                {
                    "success": False,
                    "message": "Project description is required."
                },
                status=400
            )

        level = data.get("level", "") or data.get("learningLevel", "") or "beginner"

        orchestrator = AIOrchestrator()

        result = orchestrator.autocode(
            language=language,
            project=project,
            level=level,
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
                "message": "Invalid JSON."
            },
            status=400
        )

    except Exception as error:

        print(
            "Auto Code error:",
            error
        )

        return JsonResponse(
            {
                "success": False,
                "message": "Auto Code generation failed."
            },
            status=500
        )    