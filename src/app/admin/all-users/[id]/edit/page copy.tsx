"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { Loader2, Save, ArrowLeft } from "lucide-react";
import Sidebar from "@/components/Sidebar";

interface Agency {
  _id: string;
  name: string;
}

interface Department {
  _id: string;
  name: string;
  agencyId: string;
}

interface Division {
  _id: string;
  name: string;
  departmentId: string;
}

function getInitials(name: string): string {
  if (!name) return "?";
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].charAt(0).toUpperCase();
  return (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase();
}

function getAvatarColor(name: string): string {
  const colors = [
    "bg-red-100 text-red-700",
    "bg-blue-100 text-blue-700",
    "bg-green-100 text-green-700",
    "bg-yellow-100 text-yellow-700",
    "bg-purple-100 text-purple-700",
    "bg-pink-100 text-pink-700",
    "bg-indigo-100 text-indigo-700",
    "bg-orange-100 text-orange-700",
    "bg-teal-100 text-teal-700",
    "bg-cyan-100 text-cyan-700",
  ];
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = (hash << 5) - hash + name.charCodeAt(i);
    hash |= 0;
  }
  return colors[Math.abs(hash) % colors.length];
}

export default function EditUserPage() {
  const router = useRouter();
  const { id } = useParams();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [agencies, setAgencies] = useState<Agency[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [divisions, setDivisions] = useState<Division[]>([]);
  const [form, setForm] = useState({
    name: "",
    cid: "",
    designation: "",
    phone: "",
    email: "",
    agencyId: "",
    departmentId: "",
    divisionId: "",
    role: "Officer",
    isActive: true,
  });
  const [notification, setNotification] = useState<{ message: string; type: string } | null>(null);

  // Helper to get divisions for a department
  const getDivisionsForDepartment = (deptId: string) => {
    return divisions.filter(div => div.departmentId === deptId);
  };

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) {
      router.push("/login");
      return;
    }

    const fetchData = async () => {
      try {
        // Fetch all data
        const [userRes, agenciesRes, deptRes, divRes] = await Promise.all([
          fetch(`/api/admin/all-users/${id}`, {
            headers: { Authorization: `Bearer ${token}` },
          }),
          fetch("/api/agencies", {
            headers: { Authorization: `Bearer ${token}` },
          }),
          fetch("/api/departments", {
            headers: { Authorization: `Bearer ${token}` },
          }),
          fetch("/api/divisions", {
            headers: { Authorization: `Bearer ${token}` },
          }),
        ]);

        const userData = await userRes.json();
        const agenciesData = await agenciesRes.json();
        const deptData = await deptRes.json();
        const divData = await divRes.json();

        setAgencies(Array.isArray(agenciesData) ? agenciesData : []);
        setDepartments(Array.isArray(deptData) ? deptData : []);
        setDivisions(Array.isArray(divData) ? divData : []);

        if (!userData.user) {
          throw new Error("User data not found");
        }

        const user = userData.user;
        
        console.log("User data loaded:", {
          agencyId: user.agencyId,
          departmentId: user.departmentId,
          divisionId: user.divisionId
        });

        setForm({
          name: user.name || "",
          cid: user.cid || "",
          designation: user.designation || "",
          phone: user.phone || "",
          email: user.email || "",
          agencyId: user.agencyId || "",
          departmentId: user.departmentId || "",
          divisionId: user.divisionId || "",
          role: user.role || "Officer",
          isActive: user.isActive !== undefined ? user.isActive : true,
        });
        
      } catch (err: any) {
        console.error("Fetch error:", err);
        setNotification({ message: err.message || "Failed to load data", type: "error" });
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [id, router]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    
    if (type === "checkbox") {
      const target = e.target as HTMLInputElement;
      setForm({ ...form, [name]: target.checked });
    } else {
      setForm({ ...form, [name]: value });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setNotification(null);
    
    try {
      const token = localStorage.getItem("token");
      const res = await fetch(`/api/admin/all-users/${id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(form),
      });

      const data = await res.json();
      
      if (res.ok) {
        setNotification({ message: "User updated successfully!", type: "success" });
        setTimeout(() => {
          router.push("/admin/all-users");
        }, 1500);
      } else {
        setNotification({ message: data.error || "Update failed", type: "error" });
      }
    } catch (err) {
      console.error("Submit error:", err);
      setNotification({ message: "Something went wrong. Please try again.", type: "error" });
    } finally {
      setSaving(false);
    }
  };

  // Get filtered departments based on selected agency
  const filteredDepartments = form.agencyId 
    ? departments.filter(dept => dept.agencyId === form.agencyId)
    : [];

  // Get filtered divisions based on selected department
  const filteredDivisions = form.departmentId
    ? divisions.filter(div => div.departmentId === form.departmentId)
    : [];

  // Find selected names for display
  const selectedAgency = agencies.find(a => a._id === form.agencyId);
  const selectedDepartment = departments.find(d => d._id === form.departmentId);
  const selectedDivision = divisions.find(d => d._id === form.divisionId);

  if (loading) {
    return (
      <div className="flex min-h-screen bg-gray-50">
        <Sidebar />
        <div className="flex-1 ml-64 flex items-center justify-center">
          <Loader2 className="animate-spin text-black" size={40} />
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-gray-50">
      <Sidebar />
      <main className="flex-1 p-4 md:p-6 lg:p-8 ml-0 lg:ml-64 w-full">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
          <div className="flex items-center gap-3">
            <button onClick={() => router.back()} className="p-2 rounded-full hover:bg-gray-100 transition">
              <ArrowLeft size={20} className="text-gray-600" />
            </button>
            {form.name && (
              <div className={`w-12 h-12 rounded-full flex items-center justify-center text-lg font-semibold ${getAvatarColor(form.name)}`}>
                {getInitials(form.name)}
              </div>
            )}
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Edit User</h1>
              <p className="text-sm text-gray-500 mt-1">Update user details, role, and account status.</p>
            </div>
          </div>
          <div className="flex items-center gap-2 text-sm bg-white px-4 py-2 rounded-full shadow-sm border">
            <span className="font-medium">User ID:</span>
            <span className="text-gray-500 font-mono text-xs">{id}</span>
          </div>
        </div>

        {notification && (
          <div className={`mb-6 p-4 rounded-xl border ${notification.type === "success" ? "bg-green-50 text-green-800 border-green-200" : "bg-red-50 text-red-800 border-red-200"}`}>
            {notification.message}
          </div>
        )}

        <div className="bg-white rounded-2xl shadow-sm border overflow-hidden">
          <form onSubmit={handleSubmit}>
            <div className="p-6 space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Full Name *</label>
                  <input name="name" type="text" value={form.name} onChange={handleChange} required className="w-full border rounded-xl px-4 py-2.5" />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">CID Number *</label>
                  <input name="cid" type="text" value={form.cid} onChange={handleChange} required className="w-full border rounded-xl px-4 py-2.5" />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Designation</label>
                  <input name="designation" type="text" value={form.designation} onChange={handleChange} className="w-full border rounded-xl px-4 py-2.5" />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Phone Number</label>
                  <input name="phone" type="tel" value={form.phone} onChange={handleChange} className="w-full border rounded-xl px-4 py-2.5" />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Email Address *</label>
                  <input name="email" type="email" value={form.email} onChange={handleChange} required className="w-full border rounded-xl px-4 py-2.5" />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Agency</label>
                  <select name="agencyId" value={form.agencyId} onChange={handleChange} className="w-full border rounded-xl px-4 py-2.5 bg-white">
                    <option value="">-- Select Agency --</option>
                    {agencies.map((agency) => (
                      <option key={agency._id} value={agency._id}>{agency.name}</option>
                    ))}
                  </select>
                  {selectedAgency && <p className="text-xs text-green-600 mt-1">✓ Current: {selectedAgency.name}</p>}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Department</label>
                  <select 
                    name="departmentId" 
                    value={form.departmentId} 
                    onChange={handleChange} 
                    disabled={!form.agencyId}
                    className="w-full border rounded-xl px-4 py-2.5 bg-white disabled:bg-gray-50"
                  >
                    <option value="">-- Select Department --</option>
                    {filteredDepartments.map((dept) => (
                      <option key={dept._id} value={dept._id}>{dept.name}</option>
                    ))}
                  </select>
                  {selectedDepartment && <p className="text-xs text-green-600 mt-1">✓ Current: {selectedDepartment.name}</p>}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Division</label>
                  <select 
                    name="divisionId" 
                    value={form.divisionId} 
                    onChange={handleChange} 
                    disabled={!form.departmentId}
                    className="w-full border rounded-xl px-4 py-2.5 bg-white disabled:bg-gray-50"
                  >
                    <option value="">-- Select Division --</option>
                    {filteredDivisions.map((div) => (
                      <option key={div._id} value={div._id}>{div.name}</option>
                    ))}
                  </select>
                  {selectedDivision && <p className="text-xs text-green-600 mt-1">✓ Current division: {selectedDivision.name}</p>}
                  {form.departmentId && filteredDivisions.length === 0 && (
                    <p className="text-xs text-amber-600 mt-1">⚠️ No divisions found for this department. Add divisions first.</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Role</label>
                  <select name="role" value={form.role} onChange={handleChange} className="w-full border rounded-xl px-4 py-2.5 bg-white">
                    <option value="Officer">Officer</option>
                    <option value="DivisionHead">Division Head</option>
                    <option value="DepartmentHead">Department Head</option>
                    <option value="Commissioner">Commissioner</option>
                    <option value="Chairperson">Chairperson</option>
                    <option value="SecretaryService">Secretary Service</option>
                  </select>
                </div>

                <div className="flex items-center gap-3 mt-2">
                  <input type="checkbox" name="isActive" checked={form.isActive} onChange={handleChange} className="h-4 w-4 rounded" />
                  <label className="text-sm font-medium text-gray-700">Account Active (user can log in)</label>
                </div>
              </div>
            </div>

            <div className="border-t px-6 py-4 bg-gray-50 flex justify-end gap-3">
              <button type="button" onClick={() => router.back()} className="px-5 py-2 border rounded-lg hover:bg-gray-100 transition">Cancel</button>
              <button type="submit" disabled={saving} className="px-5 py-2 bg-black text-white rounded-lg flex items-center gap-2 hover:bg-gray-800 disabled:opacity-50">
                {saving ? <Loader2 className="animate-spin" size={18} /> : <Save size={18} />}
                {saving ? "Saving..." : "Save Changes"}
              </button>
            </div>
          </form>
        </div>
      </main>
    </div>
  );
}