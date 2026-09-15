import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const body = await request.json();

    console.log("========== NEXT.JS TEACHING PROXY ==========");
    console.log("Course   :", body.course);
    console.log("Chapter  :", body.chapter);
    console.log("Topic    :", body.topic);
    console.log("Mode     :", body.mode);
    console.log("Question :", body.question);
    console.log("==============================================");

    const response = await fetch(
      "http://127.0.0.1:8000/api/ai/teach/",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(body),
        cache: "no-store",
      }
    );

    const isJson = response.headers.get("content-type")?.includes("application/json");
    let data: any = {};
    if (isJson) {
      data = await response.json();
    } else {
      const text = await response.text();
      console.warn("Django Teaching Engine returned non-JSON response:", text.slice(0, 200));
      return NextResponse.json(
        {
          success: false,
          message: "AI Teaching Engine returned an invalid response. Please try again.",
        },
        { status: 502 }
      );
    }

    console.log(
      "Django Teaching Status:",
      response.status
    );

    if (!response.ok) {
      console.error(
        "Django Teaching Error:",
        data
      );

      return NextResponse.json(
        {
          success: false,
          message:
            data?.message ||
            "AI Teaching Engine failed.",
          data,
        },
        {
          status: response.status,
        }
      );
    }

    return NextResponse.json(
      data,
      {
        status: response.status,
      }
    );

  } catch (error) {
    console.error(
      "Next.js Teaching Proxy Error:",
      error
    );

    return NextResponse.json(
      {
        success: false,
        message:
          "Unable to connect to CodeXAI Teaching Engine.",
      },
      {
        status: 500,
      }
    );
  }
}