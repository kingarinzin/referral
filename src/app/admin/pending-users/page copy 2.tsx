"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, CheckCircle, XCircle } from "lucide-react";
import Sidebar from "@/components/Sidebar";

interface PendingUser {
  _id: string;
  email: string;
  name?: string;
  createdAt: string;
  approvalStatus: string;
}

export default function PendingUsersPage() {
  const router = useRouter();
  const [users, setUsers] = useState<PendingUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [inlineMessage, setInlineMessage] = useState<{
    text: string;
    type: "success" | "error";
  } | null>(null);

  // Auto-dismiss inline message after 3 seconds
  useEffect(() => {
    if (inlineMessage) {
      const timer = setTimeout(() => setInlineMessage(null), 3000);
      return () => clearTimeout(timer);
    }
  }, [inlineMessage]);

  useEffect(() => {
    const token = localStorage.getItem("token");
    const isAdmin = localStorage.getItem("isAdmin") === "true";

    if (!token) {
      router.push("/login");
      return;
    }

    if (!isAdmin) {
      setInlineMessage({
        text: "Admin access required. Redirecting...",
        type: "error",
      });
      setTimeout(() => router.push("/dashboard/leave"), 2000);
      return;
    }

    async function checkTokenValidity() {
      try {
        const res = await fetch("/api/user/profile", {
          headers: { Authorization: `Bearer ${token}` },
        });

        if (res.status === 401) {
          localStorage.removeItem("token");
          localStorage.removeItem("isAdmin");
          router.push("/login?expired=true");
          return;
        }
      } catch (err) {
        console.error("Token validation error:", err);
      }
    }

    checkTokenValidity();
    fetchPendingUsers();
  }, [router]);

  async function fetchPendingUsers() {
    try {
      const token = localStorage.getItem("token");
      const res = await fetch("/api/admin/pending-users", {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (res.status === 401) {
        localStorage.removeItem("token");
        localStorage.removeItem("isAdmin");
        router.push("/login?expired=true");
        return;
      }

      if (res.status === 403) {
        setInlineMessage({
          text: "Admin access required. Redirecting...",
          type: "error",
        });
        setTimeout(() => router.push("/dashboard/leave"), 2000);
        return;
      }

      const data = await res.json();
      setUsers(data.users || []);
    } catch (err) {
      console.error("Failed to fetch pending users:", err);
      setInlineMessage({ text: "Failed to load pending users", type: "error" });
    } finally {
      setLoading(false);
    }
  }

  async function handleAction(userId: string, action: "approve" | "reject") {
    setActionLoading(userId);
    try {
      const token = localStorage.getItem("token");
      const res = await fetch("/api/admin/approve-user", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ userId, action }),
      });

      if (res.status === 401) {
        localStorage.removeItem("token");
        localStorage.removeItem("isAdmin");
        router.push("/login?expired=true");
        return;
      }

      if (res.ok) {
        setInlineMessage({
          text: `User ${action === "approve" ? "approved" : "rejected"} successfully`,
          type: "success",
        });
        fetchPendingUsers();
      } else {
        const data = await res.json();
        setInlineMessage({
          text: data.error || "Action failed",
          type: "error",
        });
      }
    } catch (err) {
      setInlineMessage({
        text: "Failed to process request",
        type: "error",
      });
    } finally {
      setActionLoading(null);
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Loader2 className="animate-spin text-blue-600" size={40} />
      </div>
    );
  }

  return (
    <div className="flex">
      <Sidebar />
      <div className="flex-1 ml-64 min-h-screen bg-gray-50 p-8">
        <div className="max-w-4xl mx-auto">
          {/* Inline Message Banner */}
          {inlineMessage && (
            <div
              className={`mb-4 p-3 rounded-md text-sm ${
                inlineMessage.type === "success"
                  ? "bg-green-50 text-green-700 border border-green-200"
                  : "bg-red-50 text-red-700 border border-red-200"
              }`}
            >
              {inlineMessage.text}
            </div>
          )}

          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-2 mb-6">
            <h4 className="text-xl font-semibold tracking-tight">
              Pending User Approvals -{" "}
              <span className="text-gray-600 text-sm md:text-base font-normal">
                Review and approve new user registrations
              </span>
            </h4>
          </div>

          {users.length === 0 ? (
            <div className="bg-white rounded-lg shadow p-8 text-center text-gray-500">
              No pending users
            </div>
          ) : (
            <div className="bg-white rounded-lg shadow overflow-hidden">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Email
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Name
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Registered
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {users.map((user) => (
                    <tr key={user._id}>
                      <td className="px-6 py-4 text-sm text-gray-900">
                        {user.email}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-500">
                        {user.name || "-"}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-500">
                        {new Date(user.createdAt).toLocaleDateString()}
                      </td>
                      <td className="px-6 py-4 text-sm space-x-2">
                        <button
                          onClick={() => handleAction(user._id, "approve")}
                          disabled={actionLoading === user._id}
                          className="inline-flex items-center gap-1 px-3 py-1 bg-green-600 text-white rounded hover:bg-green-700 disabled:opacity-50"
                        >
                          {actionLoading === user._id ? (
                            <Loader2 className="animate-spin" size={14} />
                          ) : (
                            <CheckCircle size={14} />
                          )}
                          Approve
                        </button>
                        <button
                          onClick={() => handleAction(user._id, "reject")}
                          disabled={actionLoading === user._id}
                          className="inline-flex items-center gap-1 px-3 py-1 bg-red-600 text-white rounded hover:bg-red-700 disabled:opacity-50"
                        >
                          <XCircle size={14} />
                          Reject
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}