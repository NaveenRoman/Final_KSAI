import os

from dotenv import load_dotenv
from google import genai
from google.genai import types

load_dotenv()

client = genai.Client(
    api_key=os.getenv("GEMINI_API_KEY")
)


# =========================================================
# GENERAL GEMINI RESPONSE
# =========================================================

def generate_response(prompt: str):
    models_to_try = [
        "gemini-flash-lite-latest",
        "gemini-3.5-flash",
        "gemini-3.8-flash",
        "gemini-3.1-flash-lite",
        "gemini-flash-latest",
    ]

    last_error = None
    for model_name in models_to_try:
        try:
            response = client.models.generate_content(
                model=model_name,
                contents=prompt,
            )
            if response and response.text:
                return response.text
        except Exception as e:
            last_error = e
            continue

    if last_error:
        raise last_error
    raise RuntimeError("Gemini generate_response returned empty content.")


# =========================================================
# CODEXAI TEACHING ENGINE
# =========================================================

def generate_teaching_response(
    prompt: str,
    system_instruction: str = "",
    response_mime_type: str = None,
    max_output_tokens: int = 4000,
):
    models_to_try = [
        "gemini-flash-lite-latest",
        "gemini-3.5-flash",
        "gemini-3.8-flash",
        "gemini-3.1-flash-lite",
        "gemini-flash-latest",
    ]

    last_error = None
    for model_name in models_to_try:
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
    models_to_try = [
        "gemini-2.5-flash",
        "gemini-3.5-flash",
        "gemini-3.6-flash",
        "gemini-3.7-flash",
        "gemini-flash-latest",
    ]

    last_error = None
    for model_name in models_to_try:
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
            continue

    if last_error:
        raise last_error
    raise RuntimeError("Gemini generate_vision_teaching_response returned empty content.")