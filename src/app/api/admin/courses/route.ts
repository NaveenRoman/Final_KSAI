import { NextResponse } from "next/server";
import { getAdminUser } from "@/lib/admin-auth";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  try {
    const admin = await getAdminUser(req);
    if (!admin) {
      return NextResponse.json(
        { success: false, error: "Unauthorized: Super Admin access required" },
        { status: 401 }
      );
    }

    const courses = await db.course.findMany({
      orderBy: { createdAt: "desc" },
      include: {
        chapters: {
          select: { id: true, title: true, orderNumber: true },
          orderBy: { orderNumber: "asc" },
        },
        _count: {
          select: { enrollments: true },
        },
      },
    });

    return NextResponse.json({
      success: true,
      courses,
    });
  } catch (error: any) {
    console.error("[ADMIN_COURSES_GET_ERROR]", error);
    return NextResponse.json(
      { success: false, error: "Failed to retrieve courses" },
      { status: 500 }
    );
  }
}

export async function POST(req: Request) {
  try {
    const admin = await getAdminUser(req);
    if (!admin) {
      return NextResponse.json(
        { success: false, error: "Unauthorized: Super Admin access required" },
        { status: 401 }
      );
    }

    const body = await req.json();
    const {
      title,
      description,
      language = "cpp",
      price = 1999,
      validityDays = 90,
      instructor = "KnowledgeStream Faculty",
      level = "Beginner",
      category = "Core Systems",
      thumbnail = "/thumbnails/default-course.png",
      duration = "40 Hours",
      lessons = 12,
      rating = 4.9,
    } = body;

    if (!title || typeof title !== "string" || title.trim().length < 3) {
      return NextResponse.json(
        { success: false, error: "Course title must be at least 3 characters" },
        { status: 400 }
      );
    }

    if (!description || typeof description !== "string" || description.trim().length < 10) {
      return NextResponse.json(
        { success: false, error: "Course description must be at least 10 characters" },
        { status: 400 }
      );
    }

    const numericPrice = typeof price === "number" ? price : parseFloat(price);
    if (isNaN(numericPrice) || numericPrice < 0) {
      return NextResponse.json(
        { success: false, error: "Price must be a valid non-negative number" },
        { status: 400 }
      );
    }

    const newCourse = await db.course.create({
      data: {
        title: title.trim(),
        description: description.trim(),
        language: String(language).toLowerCase().trim(),
        price: numericPrice,
        validityDays: Math.max(1, parseInt(String(validityDays), 10) || 90),
        instructor: String(instructor).trim(),
        level: String(level).trim(),
        category: String(category).trim(),
        thumbnail: String(thumbnail).trim(),
        duration: String(duration).trim(),
        lessons: Math.max(1, parseInt(String(lessons), 10) || 10),
        rating: typeof rating === "number" ? rating : parseFloat(rating) || 4.9,
      },
    });

    // Record audit log
    await db.activityLog.create({
      data: {
        userId: admin.id,
        actionType: "ADMIN_CREATE_COURSE",
        metadata: JSON.stringify({
          courseId: newCourse.id,
          title: newCourse.title,
          language: newCourse.language,
          price: newCourse.price,
        }),
      },
    });

    return NextResponse.json({
      success: true,
      course: newCourse,
      message: "Course created successfully",
    });
  } catch (error: any) {
    console.error("[ADMIN_COURSES_POST_ERROR]", error);
    return NextResponse.json(
      { success: false, error: "Failed to create course" },
      { status: 500 }
    );
  }
}

export async function PATCH(req: Request) {
  try {
    const admin = await getAdminUser(req);
    if (!admin) {
      return NextResponse.json(
        { success: false, error: "Unauthorized: Super Admin access required" },
        { status: 401 }
      );
    }

    const body = await req.json();
    const { id, title, description, language, price, validityDays, instructor, level, category, thumbnail, duration, lessons, rating } = body;

    if (!id || typeof id !== "string") {
      return NextResponse.json(
        { success: false, error: "Course ID is required" },
        { status: 400 }
      );
    }

    const existing = await db.course.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json(
        { success: false, error: "Course not found" },
        { status: 404 }
      );
    }

    const dataToUpdate: any = {};
    if (title && typeof title === "string" && title.trim().length >= 3) {
      dataToUpdate.title = title.trim();
    }
    if (description && typeof description === "string" && description.trim().length >= 10) {
      dataToUpdate.description = description.trim();
    }
    if (language && typeof language === "string") {
      dataToUpdate.language = language.toLowerCase().trim();
    }
    if (price !== undefined) {
      const p = typeof price === "number" ? price : parseFloat(price);
      if (!isNaN(p) && p >= 0) dataToUpdate.price = p;
    }
    if (validityDays !== undefined) {
      dataToUpdate.validityDays = Math.max(1, parseInt(String(validityDays), 10) || 90);
    }
    if (instructor && typeof instructor === "string") {
      dataToUpdate.instructor = instructor.trim();
    }
    if (level && typeof level === "string") {
      dataToUpdate.level = level.trim();
    }
    if (category && typeof category === "string") {
      dataToUpdate.category = category.trim();
    }
    if (thumbnail && typeof thumbnail === "string") {
      dataToUpdate.thumbnail = thumbnail.trim();
    }
    if (duration && typeof duration === "string") {
      dataToUpdate.duration = duration.trim();
    }
    if (lessons !== undefined) {
      dataToUpdate.lessons = Math.max(1, parseInt(String(lessons), 10) || 10);
    }
    if (rating !== undefined) {
      const r = typeof rating === "number" ? rating : parseFloat(rating);
      if (!isNaN(r)) dataToUpdate.rating = r;
    }

    const updated = await db.course.update({
      where: { id },
      data: dataToUpdate,
    });

    // Record audit log
    await db.activityLog.create({
      data: {
        userId: admin.id,
        actionType: "ADMIN_UPDATE_COURSE",
        metadata: JSON.stringify({
          courseId: id,
          updatedFields: Object.keys(dataToUpdate),
        }),
      },
    });

    return NextResponse.json({
      success: true,
      course: updated,
      message: "Course updated successfully",
    });
  } catch (error: any) {
    console.error("[ADMIN_COURSES_PATCH_ERROR]", error);
    return NextResponse.json(
      { success: false, error: "Failed to update course" },
      { status: 500 }
    );
  }
}
