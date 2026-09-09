import { PrismaClient } from "../src/generated/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  console.log("🌱 Starting KnowledgeStream AI Institutional Database Seed...");

  const defaultPassword = "Password@1234";
  const defaultPasswordHash = await bcrypt.hash(defaultPassword, 10);
  const adminPasswordHash = await bcrypt.hash("Admin@12345", 10);

  // 1. Seed College
  const collegeName = "KG Reddy College of Engineering & Technology";
  const college = await prisma.college.upsert({
    where: { name: collegeName },
    update: {
      code: "KGRCET",
      location: "Chilkur (V), Moinabad, Hyderabad",
    },
    create: {
      name: collegeName,
      code: "KGRCET",
      location: "Chilkur (V), Moinabad, Hyderabad",
      logo: "/images/kgrcet_logo.png",
    },
  });
  console.log("✅ College verified:", college.name);

  // Also ensure other demo colleges exist for super admin overview
  await prisma.college.upsert({
    where: { name: "Vignana Bharathi Institute of Technology" },
    update: {},
    create: {
      name: "Vignana Bharathi Institute of Technology",
      code: "VBIT",
      location: "Aushapur, Ghatkesar",
    },
  });

  await prisma.college.upsert({
    where: { name: "St. Mary's Engineering College" },
    update: {},
    create: {
      name: "St. Mary's Engineering College",
      code: "SMEC",
      location: "Deshmukhi, Hyderabad",
    },
  });

  // 2. Seed Departments
  const departmentsData = [
    { code: "CSM", name: "Computer Science and Machine Learning" },
    { code: "AI & DS", name: "Artificial Intelligence & Data Science" },
    { code: "CSE", name: "Computer Science Engineering" },
    { code: "ECE", name: "Electronics & Communication Engineering" },
    { code: "EEE", name: "Electrical & Electronics Engineering" },
    { code: "MECH", name: "Mechanical Engineering" },
    { code: "CIVIL", name: "Civil Engineering" },
  ];

  const departmentMap: Record<string, string> = {};
  for (const dept of departmentsData) {
    const d = await prisma.department.upsert({
      where: {
        collegeId_code: {
          collegeId: college.id,
          code: dept.code,
        },
      },
      update: { name: dept.name },
      create: {
        collegeId: college.id,
        code: dept.code,
        name: dept.name,
      },
    });
    departmentMap[dept.code] = d.id;
  }
  console.log(`✅ ${departmentsData.length} Departments seeded for ${college.code}`);

  // 3. Seed Academic Classes for CSM Department
  const csmDeptId = departmentMap["CSM"];
  if (csmDeptId) {
    const classes = [
      { name: "CSM 3rd Year - A", subject: "Data Structures & Algorithms", avgScore: 85.2, totalStudents: 38 },
      { name: "CSM 3rd Year - B", subject: "Database Management Systems", avgScore: 80.1, totalStudents: 32 },
      { name: "CSM 2nd Year - A", subject: "Operating Systems", avgScore: 78.7, totalStudents: 30 },
      { name: "CSM 2nd Year - B", subject: "Web Technologies", avgScore: 83.4, totalStudents: 28 },
      { name: "CSM 4th Year - A", subject: "Machine Learning Basics", avgScore: 85.6, totalStudents: 25 },
    ];

    for (const c of classes) {
      const existing = await prisma.academicClass.findFirst({
        where: { departmentId: csmDeptId, name: c.name },
      });
      if (!existing) {
        await prisma.academicClass.create({
          data: {
            name: c.name,
            subject: c.subject,
            departmentId: csmDeptId,
            facultyName: "Dr. Priya Sharma",
            facultyEmail: "faculty.csm@kgrcet.edu",
            avgScore: c.avgScore,
            totalStudents: c.totalStudents,
          },
        });
      }
    }
  }

  // 4. Seed Placement Batch for College
  await prisma.placementBatch.upsert({
    where: {
      collegeId_batchYear: {
        collegeId: college.id,
        batchYear: "2025 Batch",
      },
    },
    update: {
      totalEligible: 320,
      placedCount: 160,
      inProcessCount: 90,
      preparingCount: 50,
      notEligibleCount: 20,
      highestPackage: 12.5,
      averagePackage: 4.6,
    },
    create: {
      collegeId: college.id,
      batchYear: "2025 Batch",
      totalEligible: 320,
      placedCount: 160,
      inProcessCount: 90,
      preparingCount: 50,
      notEligibleCount: 20,
      highestPackage: 12.5,
      averagePackage: 4.6,
    },
  });

  // 5. Seed Announcements
  const existingAnnouncements = await prisma.collegeAnnouncement.count({
    where: { collegeId: college.id },
  });
  if (existingAnnouncements === 0) {
    await prisma.collegeAnnouncement.createMany({
      data: [
        {
          collegeId: college.id,
          title: "End Semester Exam Schedule Released",
          content: "Please check the official schedule on the portal. Exams begin from May 25, 2026.",
          category: "EXAM",
        },
        {
          collegeId: college.id,
          title: "Placement Drive: TCS Digital 2026 Batch",
          content: "Registration closes this Friday. All eligible students must register on the placements tab.",
          category: "PLACEMENT",
        },
      ],
    });
  }

  if (csmDeptId) {
    const existingDeptAnnouncements = await prisma.departmentAnnouncement.count({
      where: { departmentId: csmDeptId },
    });
    if (existingDeptAnnouncements === 0) {
      await prisma.departmentAnnouncement.createMany({
        data: [
          {
            departmentId: csmDeptId,
            title: "Department Faculty Meeting",
            content: "Discussion on curriculum progress and upcoming technical fest.",
          },
          {
            departmentId: csmDeptId,
            title: "Workshop on Generative AI & LLM Architecture",
            content: "Hands-on coding session in Computer Lab 3.",
          },
        ],
      });
    }
  }

  // 6. Seed Users for Each Role
  const usersToSeed = [
    {
      name: "KSAI System Admin",
      email: "admin@ksai.local",
      role: "SUPER_ADMIN",
      passwordHash: adminPasswordHash,
      college: collegeName,
      department: null,
      collegeId: college.id,
    },
    {
      name: "Dr. Ramesh Kumar",
      email: "collegeadmin@kgrcet.edu",
      role: "COLLEGE_ADMIN",
      passwordHash: defaultPasswordHash,
      college: collegeName,
      department: null,
      collegeId: college.id,
    },
    {
      name: "Dr. K. Srinivas",
      email: "hod.csm@kgrcet.edu",
      role: "DEPARTMENT_ADMIN",
      passwordHash: defaultPasswordHash,
      college: collegeName,
      department: "Computer Science and Machine Learning",
      collegeId: college.id,
      departmentId: csmDeptId,
    },
    {
      name: "Dr. Priya Sharma",
      email: "faculty.csm@kgrcet.edu",
      role: "FACULTY",
      passwordHash: defaultPasswordHash,
      college: collegeName,
      department: "Computer Science and Machine Learning",
      collegeId: college.id,
      departmentId: csmDeptId,
    },
    {
      name: "Indhu Banoth",
      email: "student.csm@kgrcet.edu",
      role: "STUDENT",
      passwordHash: defaultPasswordHash,
      college: collegeName,
      department: "Computer Science and Machine Learning",
      collegeId: college.id,
      departmentId: csmDeptId,
      currentYear: "B.Tech III",
      xp: 2850,
    },
    // Top Students (for Table)
    {
      name: "Vasundhara",
      email: "vasundhara@kgrcet.edu",
      role: "STUDENT",
      passwordHash: defaultPasswordHash,
      college: collegeName,
      department: "Computer Science and Machine Learning",
      collegeId: college.id,
      departmentId: csmDeptId,
      currentYear: "B.Tech IV",
      xp: 4800,
    },
    {
      name: "Snigdha",
      email: "snigdha@kgrcet.edu",
      role: "STUDENT",
      passwordHash: defaultPasswordHash,
      college: collegeName,
      department: "Computer Science and Machine Learning",
      collegeId: college.id,
      departmentId: csmDeptId,
      currentYear: "B.Tech IV",
      xp: 4300,
    },
    {
      name: "Dhanalaxmi",
      email: "dhanalaxmi@kgrcet.edu",
      role: "STUDENT",
      passwordHash: defaultPasswordHash,
      college: collegeName,
      department: "Computer Science and Machine Learning",
      collegeId: college.id,
      departmentId: csmDeptId,
      currentYear: "B.Tech III",
      xp: 3950,
    },
    {
      name: "Rohith Kumar",
      email: "rohith@kgrcet.edu",
      role: "STUDENT",
      passwordHash: defaultPasswordHash,
      college: collegeName,
      department: "Computer Science and Machine Learning",
      collegeId: college.id,
      departmentId: csmDeptId,
      currentYear: "B.Tech III",
      xp: 3600,
    },
    {
      name: "Anjali Sharma",
      email: "anjali@kgrcet.edu",
      role: "STUDENT",
      passwordHash: defaultPasswordHash,
      college: collegeName,
      department: "Computer Science and Machine Learning",
      collegeId: college.id,
      departmentId: csmDeptId,
      currentYear: "B.Tech III",
      xp: 3400,
    },
  ];

  for (const u of usersToSeed) {
    const existing = await prisma.user.findUnique({
      where: { email: u.email },
    });

    if (!existing) {
      await prisma.user.create({
        data: {
          name: u.name,
          email: u.email,
          emailVerified: true,
          passwordHash: u.passwordHash,
          role: u.role,
          college: u.college,
          department: u.department,
          collegeId: u.collegeId,
          departmentId: u.departmentId,
          currentYear: (u as any).currentYear || null,
          xp: (u as any).xp || 100,
          provider: "CREDENTIALS",
        },
      });
      console.log(`✅ User created: ${u.email} (${u.role})`);
    } else {
      await prisma.user.update({
        where: { id: existing.id },
        data: {
          role: u.role,
          college: u.college,
          department: u.department,
          collegeId: u.collegeId,
          departmentId: u.departmentId,
          passwordHash: u.passwordHash,
        },
      });
      console.log(`ℹ️ User updated: ${u.email} (${u.role})`);
    }
  }

  console.log("\n🎉 Seed completed successfully!");
}

main()
  .catch((e) => {
    console.error("❌ Seed error:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
