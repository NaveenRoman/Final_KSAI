import json
import re

from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt
from config.internal_auth import internal_auth_required

from orchestrator.orchestrator import AIOrchestrator


def parse_ai_evaluation(raw_response):
    """
    Parse the AI interview evaluation safely.

    Handles:
    1. Pure JSON
    2. JSON inside ```json ... ```
    3. JSON followed/preceded by extra AI text
    """

    if not raw_response:
        raise ValueError("Empty AI response.")

    text = raw_response.strip()

    # -------------------------------------------------
    # 1. Try normal JSON
    # -------------------------------------------------

    try:
        return json.loads(text)
    except json.JSONDecodeError:
        pass

    # -------------------------------------------------
    # 2. Remove Markdown code fences
    # -------------------------------------------------

    text = re.sub(
        r"```(?:json)?",
        "",
        text,
        flags=re.IGNORECASE,
    )

    text = text.replace("```", "").strip()

    try:
        return json.loads(text)
    except json.JSONDecodeError:
        pass

    # -------------------------------------------------
    # 3. Extract JSON object from surrounding text
    # -------------------------------------------------

    start = text.find("{")
    end = text.rfind("}")

    if start == -1 or end == -1 or end <= start:
        raise ValueError(
            "No JSON object found in AI response."
        )

    json_text = text[start:end + 1]

    try:
        return json.loads(json_text)
    except json.JSONDecodeError as error:
        raise ValueError(
            f"Invalid JSON extracted from AI response: {error}"
        )


@csrf_exempt
@internal_auth_required
def evaluate_interview(request):

    # =================================================
    # POST ONLY
    # =================================================

    if request.method != "POST":

        return JsonResponse(
            {
                "success": False,
                "message": "POST only.",
            },
            status=405,
        )

    try:

        # =================================================
        # REQUEST JSON
        # =================================================

        data = json.loads(
            request.body
        )

        # =================================================
        # INTERVIEW DATA
        # =================================================

        role = data.get(
            "role",
            "Software Engineer",
        )

        technology = data.get(
            "technology",
            "Java",
        )

        difficulty = data.get(
            "difficulty",
            "intermediate",
        )

        category = data.get(
            "category",
            "Technical",
        )

        question = data.get(
            "question",
            "",
        )

        answer = data.get(
            "answer",
            "",
        )

        expected_topics = data.get(
            "expectedTopics",
            [],
        )

        previous_context = data.get(
            "previousContext",
            "",
        )

        # =================================================
        # VALIDATION
        # =================================================

        if not question.strip():

            return JsonResponse(
                {
                    "success": False,
                    "message": "Question is required.",
                },
                status=400,
            )

        if not answer.strip():

            return JsonResponse(
                {
                    "success": False,
                    "message": "Answer is required.",
                },
                status=400,
            )

        if not isinstance(
            expected_topics,
            list,
        ):

            expected_topics = []

        # =================================================
        # AI ORCHESTRATOR
        # =================================================

        orchestrator = AIOrchestrator()

        result = orchestrator.evaluate_interview(
            role=role,
            technology=technology,
            difficulty=difficulty,
            category=category,
            question=question,
            answer=answer,
            expected_topics=expected_topics,
            previous_context=previous_context,
        )

        # =================================================
        # AI RESPONSE
        # =================================================

        ai_response = result.get(
            "response",
            "",
        )

        print()
        print("========== RAW AI EVALUATION ==========")
        print(ai_response)
        print("========================================")

        # =================================================
        # PARSE AI JSON
        # =================================================

        try:

            evaluation = parse_ai_evaluation(
                ai_response
            )

        except ValueError as error:

            print()
            print(
                "AI evaluation parsing error:",
                error,
            )

            return JsonResponse(
                {
                    "success": False,
                    "message": "AI returned invalid evaluation format.",
                    "rawResponse": ai_response,
                },
                status=502,
            )

        # =================================================
        # VALIDATE REQUIRED FIELDS
        # =================================================

        required_fields = [
            "decision",
            "technical_score",
            "communication_score",
            "relevance_score",
            "feedback",
            "follow_up_question",
        ]

        missing_fields = [
            field
            for field in required_fields
            if field not in evaluation
        ]

        if missing_fields:

            return JsonResponse(
                {
                    "success": False,
                    "message": "AI evaluation is missing required fields.",
                    "missingFields": missing_fields,
                    "rawResponse": ai_response,
                },
                status=502,
            )

        # =================================================
        # NORMALIZE DECISION
        # =================================================

        evaluation["decision"] = str(
            evaluation["decision"]
        ).strip().upper()

        # =================================================
        # VALIDATE DECISION
        # =================================================

        if evaluation["decision"] not in [
            "NEXT",
            "FOLLOWUP",
            "SKIP",
        ]:

            return JsonResponse(
                {
                    "success": False,
                    "message": "AI returned an invalid interview decision.",
                    "decision": evaluation["decision"],
                    "rawResponse": ai_response,
                },
                status=502,
            )

        # =================================================
        # FINAL RESPONSE
        # =================================================

        print()
        print("========== PARSED AI EVALUATION ==========")
        print(
            "Decision:",
            evaluation["decision"],
        )
        print(
            "Technical:",
            evaluation["technical_score"],
        )
        print(
            "Communication:",
            evaluation["communication_score"],
        )
        print(
            "Relevance:",
            evaluation["relevance_score"],
        )
        print(
            "Feedback:",
            evaluation["feedback"],
        )
        print(
            "Follow-up:",
            evaluation["follow_up_question"],
        )
        print("===========================================")

        return JsonResponse(
            {
                "success": True,
                "data": evaluation,
            }
        )

    # =================================================
    # INVALID REQUEST JSON
    # =================================================

    except json.JSONDecodeError:

        return JsonResponse(
            {
                "success": False,
                "message": "Invalid JSON.",
            },
            status=400,
        )

    # =================================================
    # GENERAL ERROR
    # =================================================

    except Exception as error:

        print()
        print(
            "Interview evaluation error:",
            error,
        )

        return JsonResponse(
            {
                "success": False,
                "message": "Interview evaluation failed.",
            },
            status=500,
        )