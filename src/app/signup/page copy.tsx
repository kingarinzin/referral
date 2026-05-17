"use client";

import Image from "next/image";
import { useEffect, useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";

type Agency = {
  _id: string;
  name: string;
};

type Department = {
  _id: string;
  name: string;
  agencyId: string;
};

type Division = {
  _id: string;
  name: string;
  departmentId: string | { _id?: string };
};

function getEntityId(value: unknown): string {
  if (!value) return "";
  if (typeof value === "string") return value;
  if (typeof value === "object" && value !== null && "_id" in value) {
    const maybeId = (value as { _id?: unknown })._id;
    return maybeId ? String(maybeId) : "";
  }
  return String(value);
}

function SignupForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const returnTo = searchParams.get("returnTo");

  const [name, setName] = useState("");
  const [cid, setCid] = useState("");
  const [designation, setDesignation] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [agencyId, setAgencyId] = useState("");
  const [departmentId, setDepartmentId] = useState("");
  const [divisionId, setDivisionId] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const [agencies, setAgencies] = useState<Agency[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [filteredDepartments, setFilteredDepartments] = useState<Department[]>([]);
  const [divisions, setDivisions] = useState<Division[]>([]);

  const [loading, setLoading] = useState(false);
  const [inlineMessage, setInlineMessage] = useState<{ text: string; type: "error" | "success" } | null>(null);

  const clearMessageOnInteraction = () => {
    if (inlineMessage) setInlineMessage(null);
  };

  // Fetch agencies
  useEffect(() => {
    const fetchAgencies = async () => {
      try {
        const res = await fetch("/api/agencies");
        const data = await res.json();
        setAgencies(data);
      } catch (err) {
        console.error("Failed to fetch agencies", err);
        setAgencies([]);
      }
    };
    fetchAgencies();
  }, []);

  // Fetch all departments (once)
  useEffect(() => {
    const fetchDepartments = async () => {
      try {
        const res = await fetch("/api/departments");
        const data = await res.json();
        setDepartments(data);
      } catch (err) {
        console.error("Failed to fetch departments", err);
        setDepartments([]);
      }
    };
    fetchDepartments();
  }, []);

  // Filter departments based on selected agency
  useEffect(() => {
    if (agencyId) {
      const filtered = departments.filter((dept) => dept.agencyId === agencyId);
      setFilteredDepartments(filtered);
      setDepartmentId(""); // reset department when agency changes
      setDivisionId("");   // reset division as well
    } else {
      setFilteredDepartments([]);
      setDepartmentId("");
      setDivisionId("");
    }
  }, [agencyId, departments]);

  // Fetch divisions when department changes
  useEffect(() => {
    const fetchDivisions = async () => {
      if (!departmentId) {
        setDivisions([]);
        setDivisionId("");
        return;
      }

      try {
        const res = await fetch("/api/divisions");
        const data = await res.json();
        if (Array.isArray(data)) {
          const filtered = data.filter((div: Division) => {
            const divDeptId = getEntityId(div.departmentId);
            return divDeptId === departmentId;
          });
          setDivisions(filtered);
          setDivisionId(filtered[0]?._id || "");
        } else {
          setDivisions([]);
          setDivisionId("");
        }
      } catch (err) {
        console.error("Failed to fetch divisions", err);
        setDivisions([]);
        setDivisionId("");
      }
    };

    fetchDivisions();
  }, [departmentId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    clearMessageOnInteraction();

    if (password !== confirmPassword) {
      setInlineMessage({ text: "Passwords do not match", type: "error" });
      return;
    }

    if (
      !name || !cid || !designation || !phone || !email ||
      !agencyId || !departmentId || !divisionId
    ) {
      setInlineMessage({ text: "All fields are required", type: "error" });
      return;
    }

    setLoading(true);

    try {
      const res = await fetch("/api/auth/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          cid,
          designation,
          phone,
          email,
          departmentId,
          divisionId,
          password,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setInlineMessage({ text: data.error || "Signup failed", type: "error" });
        setLoading(false);
        return;
      }

      setInlineMessage({
        text: "Registration submitted successfully! Redirecting to login...",
        type: "success",
      });
      setLoading(false);

      setTimeout(() => {
        const loginPath = returnTo
          ? `/login?returnTo=${encodeURIComponent(returnTo)}`
          : "/login";
        router.push(loginPath);
      }, 2000);
    } catch {
      setInlineMessage({ text: "Server error. Please try again.", type: "error" });
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-50 to-gray-100 px-4 py-6">
      <div className="w-full max-w-md">
        <div className="bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden">
          <div className="text-center pt-6 pb-6 px-6">
            <h1 className="text-lg font-semibold text-black">Sign up to get started</h1>
          </div>

          <form className="flex flex-col gap-5 px-6 pb-6" onSubmit={handleSubmit}>
            {/* Personal Information Section */}
            <div>
              <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">
                Personal Information
              </h2>
              <div className="space-y-4">
                {/* name, cid, designation, phone, email fields unchanged */}
                <div>
                  <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">
                    Full Name
                  </label>
                  <input id="name" type="text" placeholder="Enter your full name" value={name}
                    onChange={(e) => { setName(e.target.value); clearMessageOnInteraction(); }}
                    className="w-full p-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-black" />
                </div>

                <div>
                  <label htmlFor="cid" className="block text-sm font-medium text-gray-700 mb-1">
                    CID Number
                  </label>
                  <input id="cid" type="text" placeholder="Enter your CID number" value={cid}
                    onChange={(e) => { setCid(e.target.value); clearMessageOnInteraction(); }}
                    className="w-full p-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-black" />
                </div>

                <div>
                  <label htmlFor="designation" className="block text-sm font-medium text-gray-700 mb-1">
                    Designation
                  </label>
                  <input id="designation" type="text" placeholder="Your job title" value={designation}
                    onChange={(e) => { setDesignation(e.target.value); clearMessageOnInteraction(); }}
                    className="w-full p-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-black" />
                </div>

                <div>
                  <label htmlFor="phone" className="block text-sm font-medium text-gray-700 mb-1">
                    Phone Number
                  </label>
                  <input id="phone" type="tel" placeholder="Contact number" value={phone}
                    onChange={(e) => { setPhone(e.target.value); clearMessageOnInteraction(); }}
                    className="w-full p-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-black" />
                </div>

                <div>
                  <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
                    Email Address
                  </label>
                  <input id="email" type="email" placeholder="you@example.com" value={email}
                    onChange={(e) => { setEmail(e.target.value); clearMessageOnInteraction(); }}
                    className="w-full p-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-black" />
                </div>
              </div>
            </div>

            {/* Organization Details - now includes Agency */}
            <div>
              <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">
                Organization Details
              </h2>
              <div className="space-y-4">
                {/* Agency dropdown */}
                <div>
                  <label htmlFor="agency" className="block text-sm font-medium text-gray-700 mb-1">
                    Agency
                  </label>
                  <select id="agency" value={agencyId} onChange={(e) => setAgencyId(e.target.value)}
                    className="w-full p-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-black bg-white">
                    <option value="">-- Select Agency --</option>
                    {agencies.map((a) => (
                      <option key={a._id} value={a._id}>{a.name}</option>
                    ))}
                  </select>
                </div>

                {/* Department dropdown filtered by agency */}
                <div>
                  <label htmlFor="department" className="block text-sm font-medium text-gray-700 mb-1">
                    Department
                  </label>
                  <select id="department" value={departmentId} onChange={(e) => setDepartmentId(e.target.value)}
                    disabled={!agencyId}
                    className="w-full p-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-black bg-white disabled:bg-gray-100">
                    <option value="">{agencyId ? "Select Department" : "Select Agency First"}</option>
                    {filteredDepartments.map((d) => (
                      <option key={d._id} value={d._id}>{d.name}</option>
                    ))}
                  </select>
                </div>

                {/* Division dropdown filtered by department */}
                <div>
                  <label htmlFor="division" className="block text-sm font-medium text-gray-700 mb-1">
                    Division
                  </label>
                  <select id="division" value={divisionId} onChange={(e) => setDivisionId(e.target.value)}
                    disabled={!departmentId}
                    className="w-full p-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-black bg-white disabled:bg-gray-100">
                    <option value="">{departmentId ? "Select Division" : "Select Department First"}</option>
                    {divisions.map((d) => (
                      <option key={d._id} value={d._id}>{d.name}</option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            {/* Account Security Section (unchanged) */}
            <div>
              <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">
                Account Security
              </h2>
              <div className="space-y-4">
                <div>
                  <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">Password</label>
                  <input id="password" type="password" name="newPassword" autoComplete="new-password"
                    value={password} onChange={(e) => { setPassword(e.target.value); clearMessageOnInteraction(); }}
                    className="w-full p-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-black" />
                </div>
                <div>
                  <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700 mb-1">Confirm Password</label>
                  <input id="confirmPassword" type="password" name="confirmNewPassword" autoComplete="new-password"
                    value={confirmPassword} onChange={(e) => { setConfirmPassword(e.target.value); clearMessageOnInteraction(); }}
                    className="w-full p-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-black" />
                </div>
              </div>
            </div>

            <button type="submit" disabled={loading}
              className="w-full py-3 bg-black text-white rounded-xl font-semibold hover:bg-gray-800 transition-all cursor-pointer shadow-md disabled:opacity-70">
              {loading ? "Signing up..." : "Sign Up"}
            </button>
          </form>

          {inlineMessage && (
            <div className="px-6 pb-4">
              <p className={`text-center text-sm py-2 rounded-lg ${inlineMessage.type === "error" ? "text-red-500 bg-red-50" : "text-green-700 bg-green-50"}`}>
                {inlineMessage.text}
              </p>
            </div>
          )}

          <div className="px-6 pb-6 space-y-3 text-center">
            <p className="text-sm text-gray-500">
              Already have an account?{" "}
              <a href={returnTo ? `/login?returnTo=${encodeURIComponent(returnTo)}` : "/login"}
                className="text-black font-medium hover:underline">Login</a>
            </p>
            <p className="text-xs text-gray-400">© {new Date().getFullYear()} Anti-Corruption Commission</p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function SignupPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center">Loading...</div>}>
      <SignupForm />
    </Suspense>
  );
}