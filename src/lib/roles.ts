/**
 * Client-Safe Role Utilities and Types
 * Contains pure functions and types with NO server or next/headers dependencies.
 * Safe to import anywhere in Client Components and Server Components.
 */

export type UserRole =
  | "STUDENT"
  | "FACULTY"
  | "DEPARTMENT_ADMIN"
  | "COLLEGE_ADMIN"
  | "SUPER_ADMIN";

export function normalizeUserRole(role?: string | null): UserRole {
  if (!role) return "STUDENT";
  const r = role.trim().toUpperCase().replace(/[\s-]+/g, "_");
  if (r === "SUPER_ADMIN" || r === "ADMIN" || r === "SUPERADMIN" || r === "SYSTEM_ADMIN") {
    return "SUPER_ADMIN";
  }
  if (r === "COLLEGE_ADMIN" || r === "COLLEGEADMIN" || r === "PRINCIPAL" || r === "DIRECTOR") {
    return "COLLEGE_ADMIN";
  }
  if (r === "DEPARTMENT_ADMIN" || r === "DEPARTMENTADMIN" || r === "HOD" || r === "HEAD_OF_DEPARTMENT") {
    return "DEPARTMENT_ADMIN";
  }
  if (r === "FACULTY" || r === "TEACHER" || r === "PROFESSOR" || r === "EMPLOYEE") {
    return "FACULTY";
  }
  return "STUDENT";
}

export function getRoleDashboardPath(role: UserRole | string): string {
  const normRole = typeof role === "string" ? normalizeUserRole(role) : role;
  switch (normRole) {
    case "SUPER_ADMIN":
      return "/admin";
    case "COLLEGE_ADMIN":
      return "/dashboard/college";
    case "DEPARTMENT_ADMIN":
      return "/dashboard/department";
    case "FACULTY":
      return "/dashboard/faculty";
    case "STUDENT":
    default:
      return "/dashboard/student";
  }
}

export interface AuthContextUser {
  id: string;
  name: string;
  email: string;
  rawRole: string;
  role: UserRole;
  college: string | null;
  department: string | null;
  collegeId?: string | null;
  departmentId?: string | null;
  currentYear: string | null;
}
