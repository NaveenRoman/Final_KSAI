import os
import random
import time

from dotenv import load_dotenv
from google import genai
from google.genai import types

load_dotenv()

client = genai.Client(
    api_key=os.getenv("GEMINI_API_KEY")
)

# Verified supported model priority chain
PRIMARY_MODELS = [
    "gemini-3.6-flash",
    "gemini-3.5-flash",
    "gemini-3.8-flash",
    "gemini-3.1-flash-lite",
]

MAX_MODEL_ATTEMPTS = 2


# =========================================================
# GENERAL GEMINI RESPONSE
# =========================================================

def generate_response(prompt: str):
    models_to_try = PRIMARY_MODELS[:MAX_MODEL_ATTEMPTS]

    last_error = None
    for attempt_idx, model_name in enumerate(models_to_try):
        try:
            response = client.models.generate_content(
                model=model_name,
                contents=prompt,
            )
            if response and response.text:
                return response.text
        except Exception as e:
            last_error = e
            err_str = str(e)
            if any(term in err_str for term in ["429", "503", "ResourceExhausted", "high demand"]):
                # Exponential backoff with jitter
                delay = 0.5 * (2 ** attempt_idx) + random.uniform(0.05, 0.25)
                time.sleep(min(delay, 2.0))
            continue

    if last_error:
        raise last_error
    raise RuntimeError("Gemini generate_response returned empty content.")


# =========================================================
# CODENTHRA AI TEACHING ENGINE
# =========================================================

def generate_teaching_response(
    prompt: str,
    system_instruction: str = "",
    response_mime_type: str = None,
    max_output_tokens: int = 4000,
):
    models_to_try = PRIMARY_MODELS[:MAX_MODEL_ATTEMPTS]

    last_error = None
    for attempt_idx, model_name in enumerate(models_to_try):
        try:
            config_kwargs = {
                "system_instruction": system_instruction,
                "max_output_tokens": max_output_tokens,
            }
            if response_mime_type:
                config_kwargs["response_mime_type"] = response_mime_type

            response = client.models.generate_content(
                model=model_name,
                contents=prompt,
                config=types.GenerateContentConfig(**config_kwargs),
            )
            if response and response.text:
                return response.text
        except Exception as e:
            last_error = e
            err_str = str(e)
            if any(term in err_str for term in ["429", "503", "ResourceExhausted", "high demand"]):
                delay = 0.5 * (2 ** attempt_idx) + random.uniform(0.05, 0.25)
                time.sleep(min(delay, 2.0))
            continue

    if last_error:
        raise last_error
    raise RuntimeError("Gemini generate_teaching_response returned empty content.")


# =========================================================
# VISION AI TEACHING ENGINE
# =========================================================

def generate_vision_teaching_response(
    prompt: str,
    image_bytes: bytes,
    mime_type: str = "image/png",
    system_instruction: str = "",
    response_mime_type: str = None,
    max_output_tokens: int = 4000,
):
    models_to_try = PRIMARY_MODELS[:MAX_MODEL_ATTEMPTS]

    last_error = None
    for attempt_idx, model_name in enumerate(models_to_try):
        try:
            config_kwargs = {
                "system_instruction": system_instruction,
                "max_output_tokens": max_output_tokens,
            }
            if response_mime_type:
                config_kwargs["response_mime_type"] = response_mime_type

            contents = [
                types.Part.from_bytes(data=image_bytes, mime_type=mime_type),
                prompt,
            ]

            response = client.models.generate_content(
                model=model_name,
                contents=contents,
                config=types.GenerateContentConfig(**config_kwargs),
            )
            if response and response.text:
                return response.text
        except Exception as e:
            last_error = e
            err_str = str(e)
            if any(term in err_str for term in ["429", "503", "ResourceExhausted", "high demand"]):
                delay = 0.5 * (2 ** attempt_idx) + random.uniform(0.05, 0.25)
                time.sleep(min(delay, 2.0))
            continue

    if last_error:
        raise last_error
    raise RuntimeError("Gemini generate_vision_teaching_response returned empty content.")