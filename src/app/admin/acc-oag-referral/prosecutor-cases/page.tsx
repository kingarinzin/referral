"use client";

import { useState, useEffect } from "react";
import { FileText, Eye, Download, RefreshCw } from "lucide-react";
import Sidebar from "@/components/Sidebar";

type Case = {
  _id: string;
  caseNo: string;
  caseDescription: string;
  investigatorName: string;
  attachments: string[];
  assignedProsecutor?: { _id: string; name: string; email: string } | null;
};

export default function ProsecutorCasesPage() {
  const [cases, setCases] = useState<Case[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentUserId, setCurrentUserId] = useState<string>("");

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (token) {
      try {
        const payload = JSON.parse(atob(token.split(".")[1]));
        setCurrentUserId(payload.id || payload._id || "");
        console.log("🔍 Decoded user ID from token:", payload.id || payload._id);
      } catch (e) { console.error(e); }
    }
  }, []);

  useEffect(() => {
    if (!currentUserId) return;
    fetchCases();
  }, [currentUserId]);

  const fetchCases = async () => {
    try {
      const res = await fetch("/api/acc-oag-referral");
      if (!res.ok) throw new Error();
      const allCases = await res.json();
      console.log("🆔 Current User ID:", currentUserId);
      console.log("📦 All cases from API:", allCases);
      const assigned = allCases.filter((c: Case) => 
        c.assignedProsecutor?._id === currentUserId
      );
      console.log("✅ Filtered assigned cases:", assigned);
      setCases(assigned);
    } catch (error) {
      console.error("Failed to load cases", error);
    } finally {
      setLoading(false);
    }
  };

  const handleViewFile = (fileName: string) => {
    window.open(`/uploads/acc-oag-referral/${fileName}`, "_blank");
  };
  const handleDownloadFile = (fileName: string) => {
    const link = document.createElement("a");
    link.href = `/uploads/acc-oag-referral/${fileName}`;
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  if (loading) {
    return (
      <div className="flex">
        <Sidebar />
        <main className="flex-1 p-6 ml-64 bg-gray-100 min-h-screen flex items-center justify-center">
          <div className="text-gray-500">Loading...</div>
        </main>
      </div>
    );
  }

  return (
    <div className="flex">
      <Sidebar />
      <main className="flex-1 p-6 ml-64 bg-gray-100 min-h-screen">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold">My Assigned Cases</h1>
          <button
            onClick={fetchCases}
            className="flex items-center gap-2 px-3 py-1.5 bg-white border rounded-md text-xs hover:border-black"
          >
            <RefreshCw size={14} /> Refresh
          </button>
        </div>

        {/* Debug: show raw cases data */}
        <pre className="bg-gray-100 p-4 rounded mb-4 overflow-auto text-xs">
          {JSON.stringify(cases, null, 2)}
        </pre>

        {cases.length === 0 ? (
          <div className="bg-white shadow rounded-lg p-6 text-center text-gray-500">
            No cases assigned to you.
          </div>
        ) : (
          <div className="bg-white shadow rounded-lg overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase">Case No.</th>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase">Description</th>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase">Investigator</th>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase">Attachments</th>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {cases.map((c) => (
                  <tr key={c._id} className="hover:bg-gray-100">
                    <td className="px-6 py-3 text-sm font-medium">{c.caseNo}</td>
                    <td className="px-6 py-3 text-sm">{c.caseDescription}</td>
                    <td className="px-6 py-3 text-sm">{c.investigatorName}</td>
                    <td className="px-6 py-3 text-sm">
                      {c.attachments && c.attachments.length > 0 ? (
                        <div className="flex flex-wrap gap-2">
                          {c.attachments.slice(0, 2).map((file, i) => (
                            <div key={i} className="flex items-center gap-1 bg-gray-100 px-2 py-1 rounded">
                              <FileText size={12} className="text-gray-500" />
                              <span className="text-xs truncate max-w-[80px]" title={file}>
                                {file.length > 15 ? file.substring(0, 15) + "..." : file}
                              </span>
                              <button onClick={() => handleViewFile(file)} className="text-blue-500">
                                <Eye size={12} />
                              </button>
                              <button onClick={() => handleDownloadFile(file)} className="text-green-500">
                                <Download size={12} />
                              </button>
                            </div>
                          ))}
                          {c.attachments.length > 2 && (
                            <span className="text-xs text-gray-500">+{c.attachments.length - 2}</span>
                          )}
                        </div>
                      ) : (
                        <span className="text-gray-400 text-xs">No files</span>
                      )}
                    </td>
                    <td className="px-6 py-3 text-sm">
                      <button
                        onClick={() => window.open(`/admin/acc-oag-referral/${c._id}`)}
                        className="text-blue-600 hover:underline"
                      >
                        View Details
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </main>
    </div>
  );
}