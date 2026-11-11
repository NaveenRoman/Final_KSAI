"use client";

import React, { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  Users,
  Search,
  Filter,
  UserPlus,
  Shield,
  GraduationCap,
  Award,
  Edit,
  X,
  CheckCircle2,
  AlertCircle,
  Loader2,
  ChevronLeft,
  ChevronRight,
  Building2,
} from "lucide-react";

interface UserItem {
  id: string;
  name: string;
  email: string;
  role: string;
  college: string | null;
  department: string | null;
  xp: number;
  level: number;
  createdAt: string | Date;
}

interface CollegeOption {
  id: string;
  name: string;
  code: string | null;
}

interface UserManagementClientProps {
  initialUsers: UserItem[];
  totalCount: number;
  studentsCount: number;
  facultyCount: number;
  collegeCount: number;
  superAdminCount: number;
  availableColleges: CollegeOption[];
  currentRoleFilter?: string;
  currentSearch?: string;
  currentPage: number;
  pageSize: number;
  autoOpenCreate?: boolean;
}

export function UserManagementClient({
  initialUsers,
  totalCount,
  studentsCount,
  facultyCount,
  collegeCount,
  superAdminCount,
  availableColleges,
  currentRoleFilter = "all",
  currentSearch = "",
  currentPage = 1,
  pageSize = 30,
  autoOpenCreate = false,
}: UserManagementClientProps) {
  const router = useRouter();
  const [users, setUsers] = useState<UserItem[]>(initialUsers);
  const [searchQuery, setSearchQuery] = useState(currentSearch);
  const [roleFilter, setRoleFilter] = useState(currentRoleFilter);
  const [isPending, startTransition] = useTransition();

  // Create User Modal
  const [isCreateOpen, setIsCreateOpen] = useState(autoOpenCreate);
  const [createName, setCreateName] = useState("");
  const [createEmail, setCreateEmail] = useState("");
  const [createPassword, setCreatePassword] = useState("Password@123");
  const [createRole, setCreateRole] = useState("Student");
  const [createCollege, setCreateCollege] = useState("");
  const [createDepartment, setCreateDepartment] = useState("");
  const [createSubmitting, setCreateSubmitting] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);

  // Edit Role Modal
  const [editingUser, setEditingUser] = useState<UserItem | null>(null);
  const [editRole, setEditRole] = useState("Student");
  const [editCollege, setEditCollege] = useState("");
  const [editSubmitting, setEditSubmitting] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);

  // Success Feedback
  const [feedback, setFeedback] = useState<string | null>(null);

  const applyFilters = (newRole: string, newSearch: string, newPage: number = 1) => {
    startTransition(() => {
      const params = new URLSearchParams();
      if (newRole && newRole !== "all") params.set("role", newRole);
      if (newSearch) params.set("q", newSearch);
      if (newPage > 1) params.set("page", String(newPage));
      router.push(`/admin/users?${params.toString()}`);
    });
  };

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreateError(null);

    if (!createName.trim() || !createEmail.trim() || !createPassword.trim()) {
      setCreateError("Name, email, and password are required.");
      return;
    }

    try {
      setCreateSubmitting(true);
      const res = await fetch("/api/admin/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: createName.trim(),
          email: createEmail.trim(),
          password: createPassword.trim(),
          role: createRole,
          college: createCollege.trim() || null,
          department: createDepartment.trim() || null,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Failed to create user");
      }

      setFeedback(`User ${createName} created successfully.`);
      setIsCreateOpen(false);
      setCreateName("");
      setCreateEmail("");
      setCreatePassword("Password@123");
      setCreateCollege("");
      setCreateDepartment("");

      router.refresh();
      setTimeout(() => setFeedback(null), 4000);
    } catch (err: any) {
      setCreateError(err.message || "Failed to create user");
    } finally {
      setCreateSubmitting(false);
    }
  };

  const handleUpdateRole = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingUser) return;
    setEditError(null);

    try {
      setEditSubmitting(true);
      const res = await fetch("/api/admin/users", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: editingUser.id,
          role: editRole,
          college: editCollege.trim() || undefined,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Failed to update user role");
      }

      setFeedback(`Role for ${editingUser.name} updated to ${editRole}.`);
      setEditingUser(null);
      router.refresh();
      setTimeout(() => setFeedback(null), 4000);
    } catch (err: any) {
      setEditError(err.message || "Failed to update user role");
    } finally {
      setEditSubmitting(false);
    }
  };

  const totalPages = Math.ceil(totalCount / pageSize);

  return (
    <div className="space-y-6">
      {/* Metric Counters */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-4">
        <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-2xs">
          <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">Total Users</span>
          <div className="text-2xl font-black text-slate-900 mt-1">{totalCount.toLocaleString()}</div>
        </div>
        <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-2xs">
          <span className="text-[11px] font-bold text-blue-600 uppercase tracking-wider block">Students</span>
          <div className="text-2xl font-black text-slate-900 mt-1">{studentsCount.toLocaleString()}</div>
        </div>
        <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-2xs">
          <span className="text-[11px] font-bold text-purple-600 uppercase tracking-wider block">Faculty</span>
          <div className="text-2xl font-black text-slate-900 mt-1">{facultyCount.toLocaleString()}</div>
        </div>
        <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-2xs">
          <span className="text-[11px] font-bold text-emerald-600 uppercase tracking-wider block">College Admins</span>
          <div className="text-2xl font-black text-slate-900 mt-1">{collegeCount.toLocaleString()}</div>
        </div>
        <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-2xs">
          <span className="text-[11px] font-bold text-amber-600 uppercase tracking-wider block">Super Admins</span>
          <div className="text-2xl font-black text-slate-900 mt-1">{superAdminCount.toLocaleString()}</div>
        </div>
      </div>

      {/* Success Notification Banner */}
      {feedback && (
        <div className="p-3.5 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-center gap-2">
          <CheckCircle2 size={16} className="text-emerald-600 shrink-0" />
          <span className="font-semibold">{feedback}</span>
        </div>
      )}

      {/* Filter and Action Bar */}
      <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-1.5 flex-wrap">
          {[
            { id: "all", label: "All Roles" },
            { id: "student", label: "Students" },
            { id: "faculty", label: "Faculty" },
            { id: "college", label: "Colleges" },
            { id: "admin", label: "Super Admins" },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => {
                setRoleFilter(tab.id);
                applyFilters(tab.id, searchQuery, 1);
              }}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                roleFilter === tab.id
                  ? "bg-blue-600 text-white shadow-xs"
                  : "bg-slate-100 text-slate-600 hover:bg-slate-200"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-3">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              applyFilters(roleFilter, searchQuery, 1);
            }}
            className="relative"
          >
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search user, email, campus..."
              className="pl-8 pr-3 py-1.5 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-800 placeholder:text-slate-400 focus:outline-none focus:border-blue-500 w-56"
            />
            <Search size={14} className="absolute left-2.5 top-2.5 text-slate-400" />
          </form>

          <button
            onClick={() => setIsCreateOpen(true)}
            className="px-3.5 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-md transition-all inline-flex items-center gap-1.5 cursor-pointer shrink-0"
          >
            <UserPlus size={14} />
            <span>Add User</span>
          </button>
        </div>
      </div>

      {/* Users Table */}
      <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-2xs overflow-hidden space-y-4">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-slate-100 text-[11px] font-bold uppercase tracking-wider text-slate-400">
                <th className="pb-3 pr-4">User</th>
                <th className="pb-3 px-3">Role</th>
                <th className="pb-3 px-3">College & Department</th>
                <th className="pb-3 px-3">Level & XP</th>
                <th className="pb-3 px-3">Joined</th>
                <th className="pb-3 pl-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {users.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-slate-400">
                    No users match the active filter criteria.
                  </td>
                </tr>
              ) : (
                users.map((u) => (
                  <tr key={u.id} className="hover:bg-slate-50/70 transition-colors">
                    <td className="py-3.5 pr-4">
                      <div className="font-bold text-slate-900">{u.name}</div>
                      <div className="text-[11px] text-slate-500 font-mono">{u.email}</div>
                    </td>
                    <td className="py-3.5 px-3">
                      <span
                        className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                          u.role?.toUpperCase().includes("ADMIN")
                            ? "bg-amber-100 text-amber-800 border border-amber-200"
                            : u.role?.toUpperCase().includes("FACULTY")
                            ? "bg-purple-100 text-purple-800 border border-purple-200"
                            : "bg-blue-100 text-blue-800 border border-blue-200"
                        }`}
                      >
                        {u.role}
                      </span>
                    </td>
                    <td className="py-3.5 px-3">
                      <div className="text-slate-800 font-medium">{u.college || "KnowledgeStream Platform"}</div>
                      <div className="text-[10px] text-slate-400">{u.department || "General Cohort"}</div>
                    </td>
                    <td className="py-3.5 px-3">
                      <div className="font-bold text-slate-900">Level {u.level || 1}</div>
                      <div className="text-[10px] text-emerald-600 font-bold">{u.xp} XP</div>
                    </td>
                    <td className="py-3.5 px-3 text-slate-400 font-mono text-[11px]">
                      {new Date(u.createdAt).toLocaleDateString("en-US", {
                        month: "short",
                        day: "numeric",
                        year: "numeric",
                      })}
                    </td>
                    <td className="py-3.5 pl-3 text-right">
                      <button
                        onClick={() => {
                          setEditingUser(u);
                          setEditRole(u.role);
                          setEditCollege(u.college || "");
                          setEditError(null);
                        }}
                        className="px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-[11px] transition-colors inline-flex items-center gap-1 cursor-pointer"
                      >
                        <Edit size={11} />
                        <span>Edit Role</span>
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Bar */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between pt-3 border-t border-slate-100 text-xs">
            <span className="text-slate-500">
              Page <strong>{currentPage}</strong> of <strong>{totalPages}</strong> ({totalCount} total)
            </span>
            <div className="flex items-center gap-2">
              <button
                disabled={currentPage <= 1 || isPending}
                onClick={() => applyFilters(roleFilter, searchQuery, currentPage - 1)}
                className="px-3 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 disabled:opacity-40 text-slate-700 font-bold text-xs flex items-center gap-1 cursor-pointer"
              >
                <ChevronLeft size={14} /> Previous
              </button>
              <button
                disabled={currentPage >= totalPages || isPending}
                onClick={() => applyFilters(roleFilter, searchQuery, currentPage + 1)}
                className="px-3 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 disabled:opacity-40 text-slate-700 font-bold text-xs flex items-center gap-1 cursor-pointer"
              >
                Next <ChevronRight size={14} />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* CREATE USER MODAL */}
      {isCreateOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 space-y-4 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <UserPlus size={18} className="text-blue-600" />
                Add New User Account
              </h3>
              <button
                onClick={() => setIsCreateOpen(false)}
                className="p-1 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-700 transition-colors cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            {createError && (
              <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2">
                <AlertCircle size={15} />
                <span>{createError}</span>
              </div>
            )}

            <form onSubmit={handleCreateUser} className="space-y-3.5 text-xs">
              <div>
                <label className="font-bold text-slate-700 block mb-1">Full Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Ramesh Kumar"
                  value={createName}
                  onChange={(e) => setCreateName(e.target.value)}
                  className="w-full p-2.5 rounded-xl bg-slate-50 border border-slate-200 focus:outline-none focus:border-blue-500 font-medium"
                />
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">Email Address *</label>
                <input
                  type="email"
                  required
                  placeholder="student@college.edu.in"
                  value={createEmail}
                  onChange={(e) => setCreateEmail(e.target.value)}
                  className="w-full p-2.5 rounded-xl bg-slate-50 border border-slate-200 focus:outline-none focus:border-blue-500 font-medium"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Temporary Password *</label>
                  <input
                    type="text"
                    required
                    value={createPassword}
                    onChange={(e) => setCreatePassword(e.target.value)}
                    className="w-full p-2.5 rounded-xl bg-slate-50 border border-slate-200 focus:outline-none focus:border-blue-500 font-mono text-xs"
                  />
                </div>
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Role *</label>
                  <select
                    value={createRole}
                    onChange={(e) => setCreateRole(e.target.value)}
                    className="w-full p-2.5 rounded-xl bg-slate-50 border border-slate-200 focus:outline-none focus:border-blue-500 font-medium"
                  >
                    <option value="Student">Student</option>
                    <option value="Faculty">Faculty</option>
                    <option value="CollegeAdmin">College Administrator</option>
                    <option value="SuperAdmin">Super Administrator</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">Campus Affiliation (Optional)</label>
                <select
                  value={createCollege}
                  onChange={(e) => setCreateCollege(e.target.value)}
                  className="w-full p-2.5 rounded-xl bg-slate-50 border border-slate-200 focus:outline-none focus:border-blue-500 font-medium"
                >
                  <option value="">KnowledgeStream Global Platform</option>
                  {availableColleges.map((c) => (
                    <option key={c.id} value={c.name}>
                      {c.name} {c.code ? `(${c.code})` : ""}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">Department / Branch (Optional)</label>
                <input
                  type="text"
                  placeholder="e.g. Computer Science and Engineering"
                  value={createDepartment}
                  onChange={(e) => setCreateDepartment(e.target.value)}
                  className="w-full p-2.5 rounded-xl bg-slate-50 border border-slate-200 focus:outline-none focus:border-blue-500 font-medium"
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsCreateOpen(false)}
                  className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={createSubmitting}
                  className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold shadow-md cursor-pointer flex items-center gap-1.5"
                >
                  {createSubmitting ? (
                    <>
                      <Loader2 size={13} className="animate-spin" />
                      <span>Creating...</span>
                    </>
                  ) : (
                    <span>Create User</span>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* EDIT ROLE MODAL */}
      {editingUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-200 space-y-4 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <Shield size={18} className="text-amber-500" />
                Update Role & Affiliation
              </h3>
              <button
                onClick={() => setEditingUser(null)}
                className="p-1 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-700 transition-colors cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            {editError && (
              <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2">
                <AlertCircle size={15} />
                <span>{editError}</span>
              </div>
            )}

            <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 text-xs space-y-1">
              <div className="font-bold text-slate-900">{editingUser.name}</div>
              <div className="text-slate-500 font-mono text-[11px]">{editingUser.email}</div>
              <div className="text-slate-600 text-[11px]">Current Role: <strong>{editingUser.role}</strong></div>
            </div>

            <form onSubmit={handleUpdateRole} className="space-y-3.5 text-xs">
              <div>
                <label className="font-bold text-slate-700 block mb-1">Assign New Role *</label>
                <select
                  value={editRole}
                  onChange={(e) => setEditRole(e.target.value)}
                  className="w-full p-2.5 rounded-xl bg-slate-50 border border-slate-200 focus:outline-none focus:border-blue-500 font-medium"
                >
                  <option value="Student">Student</option>
                  <option value="Faculty">Faculty</option>
                  <option value="CollegeAdmin">College Administrator</option>
                  <option value="SuperAdmin">Super Administrator</option>
                </select>
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">Campus Affiliation</label>
                <select
                  value={editCollege}
                  onChange={(e) => setEditCollege(e.target.value)}
                  className="w-full p-2.5 rounded-xl bg-slate-50 border border-slate-200 focus:outline-none focus:border-blue-500 font-medium"
                >
                  <option value="">KnowledgeStream Global Platform</option>
                  {availableColleges.map((c) => (
                    <option key={c.id} value={c.name}>
                      {c.name} {c.code ? `(${c.code})` : ""}
                    </option>
                  ))}
                </select>
              </div>

              <div className="pt-2 flex items-center justify-end gap-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setEditingUser(null)}
                  className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={editSubmitting}
                  className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold shadow-md cursor-pointer flex items-center gap-1.5"
                >
                  {editSubmitting ? (
                    <>
                      <Loader2 size={13} className="animate-spin" />
                      <span>Updating...</span>
                    </>
                  ) : (
                    <span>Save Changes</span>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
