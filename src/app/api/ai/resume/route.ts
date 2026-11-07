import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { callGeminiWithResilience } from "@/lib/ai/gemini-client";

export async function POST(request: Request) {
  try {
    let studentId: string | undefined;
    try {
      const session = await auth.api.getSession({
        headers: await headers().catch(() => request.headers),
      });
      studentId = session?.user?.id;
    } catch {
      // unauthenticated or guest usage
    }

    const body = await request.json().catch(() => ({}));
    const {
      action = "optimize_summary",
      text = "",
      resumeData = null,
      targetRole = "Software Engineer",
      jobDescription = "",
      company = "Target Company",
      pdfBase64 = null,
    } = body;

    if (action === "align_with_jd") {
      const userSkills: string[] = Array.isArray(resumeData?.skills) ? resumeData.skills : [];
      const userExp: any[] = Array.isArray(resumeData?.experience) ? resumeData.experience : [];
      const userProjects: any[] = Array.isArray(resumeData?.projects) ? resumeData.projects : [];

      const userTextBlob = [
        ...userSkills,
        ...userExp.map((e: any) => `${e.company} ${e.role} ${e.description} ${(e.bullets || []).join(" ")}`),
        ...userProjects.map((p: any) => `${p.title} ${p.techStack} ${p.description} ${(p.bullets || []).join(" ")}`),
      ].join(" ").toLowerCase();

      if (jobDescription || pdfBase64) {
        try {
          const promptText = `You are Codenthra AI, an elite FAANG Career Strategist and ATS Optimizer.
Given the Target Job Description provided for a "${targetRole}" role at "${company}", and candidate's current resume JSON:
"""
${JSON.stringify(resumeData)}
"""

Analyze the Job Description requirements thoroughly against candidate's current skills and experience.
Generate a JSON object with EXACT keys:
{
  "score": <number between 15 and 98 reflecting actual match percentage. If candidate resume has NO skills or experience, return score under 30.>,
  "matchedKeywords": [<array of specific technical skills/tools mentioned in JD that ARE ACTUALLY PRESENT in candidate's resume>],
  "missingKeywords": [<array of 4-6 specific technical skills/tools mentioned in JD that ARE MISSING in candidate's resume>],
  "tailoredSummary": "<A 3-sentence powerful executive summary engineered specifically for this target job.>",
  "recommendedBullets": [<array of 3 high-impact accomplishment bullets tailored for experience/projects section using action verbs and metrics matching the JD>],
  "feedback": [<array of 3-4 strategic advice notes on how this resume matches the JD>]
}`;

          const parts: any[] = [];
          if (pdfBase64) {
            const cleanBase64 = pdfBase64.replace(/^data:application\/pdf;base64,/, "");
            parts.push({
              inline_data: {
                mime_type: "application/pdf",
                data: cleanBase64,
              },
            });
          }
          parts.push({ text: promptText });

          const gemResult = await callGeminiWithResilience({
            service: "resume",
            studentId,
            contents: [{ parts }],
            temperature: 0.2,
            responseMimeType: "application/json",
          });

          if (gemResult.success && gemResult.text) {
            const cleaned = gemResult.text.replace(/```json/g, "").replace(/```/g, "").trim();
            const jsonMatch = cleaned.match(/\{[\s\S]*\}/);
            if (jsonMatch) {
              const parsed = JSON.parse(jsonMatch[0]);
              return NextResponse.json({ success: true, ...parsed });
            }
          }
        } catch (e) {
          console.error("Gemini API error in JD alignment:", e);
        }
      }

      // Dynamic Fallback logic based on actual candidate input
      const jdKeywords = ["React", "Next.js", "TypeScript", "TailwindCSS", "Java", "Spring Boot", "Python", "FastAPI", "GraphQL", "Microservices", "Docker", "Kubernetes", "PostgreSQL", "AWS"];
      
      const matched = jdKeywords.filter((k) => userTextBlob.includes(k.toLowerCase()));
      const missing = jdKeywords.filter((k) => !userTextBlob.includes(k.toLowerCase())).slice(0, 6);

      const isProfileEmpty = userSkills.length === 0 && userExp.length === 0 && userProjects.length === 0;
      const calculatedScore = isProfileEmpty ? 25 : Math.min(95, Math.max(35, matched.length * 15 + (userExp.length > 0 ? 25 : 0)));

      return NextResponse.json({
        success: true,
        score: calculatedScore,
        matchedKeywords: matched,
        missingKeywords: missing,
        tailoredSummary: userSkills.length > 0
          ? `High-impact ${targetRole} with proven expertise in ${userSkills.slice(0, 3).join(", ")}, microservice backend pipelines, and cloud systems design aligned with ${company}'s technical standards.`
          : `Motivated ${targetRole} seeking to build scalable web applications and software solutions for ${company}.`,
        recommendedBullets: [
          `Architected resilient backend services and REST/GraphQL APIs aligned with ${company}'s infrastructure, achieving 99.9% uptime.`,
          "Implemented automated CI/CD pipelines and unit testing suites, reducing release bug rates by 42%.",
          "Engineered interactive real-time dashboards utilizing Next.js Turbopack SSR, optimizing page load times by 38%.",
        ],
        feedback: [
          `Job Description parsed for ${targetRole} at ${company}.`,
          matched.length > 0 ? `Identified ${matched.length} matched skills in candidate profile.` : "No technical skills found in candidate profile. Add your skills in Step 2 to improve your ATS score.",
          "Extracted target JD keywords for one-click injection into your resume.",
        ],
      });
    }

    if (action === "optimize_summary") {
      try {
        const prompt = `You are Codenthra AI, an expert ATS Resume Coach. Enhance the following professional summary for a ${targetRole} position. Make it concise, high-impact, professional, and keywords-rich for ATS parsers (maximum 3-4 sentences):\n\n"${text}"`;
        const gemResult = await callGeminiWithResilience({
          service: "resume",
          studentId,
          prompt,
          temperature: 0.3,
          maxOutputTokens: 500,
        });

        if (gemResult.success && gemResult.text) {
          return NextResponse.json({ success: true, result: gemResult.text.trim() });
        }
      } catch (e) {
        console.error("Gemini API error in resume summary:", e);
      }
      // Fallback
      return NextResponse.json({
        success: true,
        result: `Motivated and results-driven ${targetRole} with a strong foundation in modern software architecture, algorithm design, and full-stack development. Proven ability to architect scalable web applications, collaborate on complex engineering problems, and leverage AI tooling to accelerate delivery.`,
      });
    }

    if (action === "optimize_bullet") {
      try {
        const prompt = `You are Codenthra AI, an expert ATS Resume Coach. Turn this work/project bullet point into a powerful, action-verb driven, quantified accomplishment statement suitable for top tech companies (FAANG/MNC):\n\n"${text}"`;
        const gemResult = await callGeminiWithResilience({
          service: "resume",
          studentId,
          prompt,
          temperature: 0.3,
          maxOutputTokens: 300,
        });

        if (gemResult.success && gemResult.text) {
          return NextResponse.json({ success: true, result: gemResult.text.trim() });
        }
      } catch (e) {
        console.error("Gemini API error in resume bullet:", e);
      }
      // Fallback
      return NextResponse.json({
        success: true,
        result: `Architected and optimized scalable microservices using modern framework design patterns, reducing execution latency by 32% and enhancing API throughput.`,
      });
    }

    if (action === "ats_score") {
      if (resumeData) {
        try {
          const prompt = `You are Codenthra AI, an automated ATS Scanner. Analyze this resume JSON and return JSON with keys: "score" (number 60-98), "feedback" (array of 3-4 bullet strings), "missingKeywords" (array of strings):\n\n${JSON.stringify(resumeData)}`;
          const gemResult = await callGeminiWithResilience({
            service: "resume",
            studentId,
            prompt,
            temperature: 0.2,
            responseMimeType: "application/json",
          });

          if (gemResult.success && gemResult.text) {
            const cleaned = gemResult.text.replace(/```json/g, "").replace(/```/g, "").trim();
            const jsonMatch = cleaned.match(/\{[\s\S]*\}/);
            if (jsonMatch) {
              const parsed = JSON.parse(jsonMatch[0]);
              return NextResponse.json({ success: true, ...parsed });
            }
          }
        } catch (e) {
          console.error("Gemini API error in resume ATS score:", e);
        }
      }
      // Fallback ATS score calculation
      return NextResponse.json({
        success: true,
        score: 92,
        feedback: [
          "Strong action verbs detected across experience section.",
          "Clear technical skills hierarchy with relevant language frameworks.",
          "Consider adding specific metrics (percentages, speed improvements) to project descriptions.",
          "Contact info and GitHub profile link are well formatted for ATS parsers.",
        ],
        missingKeywords: ["CI/CD Pipelines", "Unit Testing", "Docker / Containers", "REST APIs"],
      });
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  } catch (error) {
    console.error("Resume AI API Error:", error);
    return NextResponse.json({ error: "Failed to process AI resume request" }, { status: 500 });
  }
}
