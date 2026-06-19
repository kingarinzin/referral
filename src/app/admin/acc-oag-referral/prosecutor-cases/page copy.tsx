"use client";

import { useState, useEffect } from "react";
import { Eye, FileText, X } from "lucide-react";
import Sidebar from "@/components/Sidebar";

type Act = { _id: string; name: string };
type Section = { _id: string; name: string; actId: string };
type Charge = { _id: string; name: string; sectionId: string };

type AccusedDetail = {
  _id?: string;
  name: string;
  cid: string;
  actId: string | Act;
  sectionId: string | Section;
  chargeId: string | Charge;
  prayer: string;
  counts: number;
};

type Meeting = {
  _id?: string;
  date: string;
  type: string;
  agenda: string;
  participants: string;
  minutes: string;
  attachments: string[];
};

type Case = {
  _id: string;
  caseNo: string;
  caseDescription: string;
  investigatorName: string;
  investigatorDesignation: string;
  investigatorContact: string;
  attachments: string[];
  accusedDetails: AccusedDetail[];
  meetings: Meeting[];
  status: string;
  remarks: string;
  createdAt: string;
  updatedAt: string;
  assignedProsecutor?: { _id: string; name: string; email: string } | null;
  referredToOAG?: boolean;
};

export default function ProsecutorCasesPage() {
  const [cases, setCases] = useState<Case[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCase, setSelectedCase] = useState<Case | null>(null);
  const [showModal, setShowModal] = useState(false);

  const getToken = () => localStorage.getItem("token");

  const fetchCases = async () => {
    try {
      const token = getToken();
      if (!token) {
        setLoading(false);
        return;
      }
      const res = await fetch("/api/acc-oag-referral", {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error();
      const data = await res.json();
      setCases(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCases();
  }, []);

  const handleViewCase = (c: Case) => {
    setSelectedCase(c);
    setShowModal(true);
  };

  const formatDate = (dateStr: string) => new Date(dateStr).toLocaleDateString();

  const getActName = (actId: string | Act) => {
    if (typeof actId === "object") return actId.name;
    return "Loading...";
  };
  const getSectionName = (sectionId: string | Section) => {
    if (typeof sectionId === "object") return sectionId.name;
    return "Loading...";
  };
  const getChargeName = (chargeId: string | Charge) => {
    if (typeof chargeId === "object") return chargeId.name;
    return "Loading...";
  };

  if (loading) {
    return (
      <div className="flex">
        <Sidebar />
        <main className="flex-1 p-6 ml-64 bg-gray-100 min-h-screen flex items-center justify-center">
          <div className="text-gray-500">Loading cases...</div>
        </main>
      </div>
    );
  }

  return (
    <div className="flex">
      <Sidebar />
      <main className="flex-1 p-6 ml-64 bg-gray-100 min-h-screen">
        <h1 className="text-2xl font-bold mb-6">My Assigned Cases</h1>
        {cases.length === 0 ? (
          <div className="bg-white rounded-lg p-8 text-center text-gray-500">
            No cases assigned to you yet.
          </div>
        ) : (
          <div className="bg-white shadow rounded-lg overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase">Case No.</th>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase">Description</th>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase">Investigator</th>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase">Status</th>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {cases.map((c) => (
                  <tr key={c._id} className="hover:bg-gray-50">
                    <td className="px-6 py-3 text-sm font-medium">{c.caseNo}</td>
                    <td className="px-6 py-3 text-sm max-w-xs truncate">{c.caseDescription}</td>
                    <td className="px-6 py-3 text-sm">{c.investigatorName}</td>
                    <td className="px-6 py-3 text-sm">
                      <span className="px-2 py-1 rounded text-xs bg-blue-100 text-blue-800">
                        {c.referredToOAG ? "Referred to OAG" : "Draft"}
                      </span>
                    </td>
                    <td className="px-6 py-3 text-sm">
                      <button
                        onClick={() => handleViewCase(c)}
                        className="flex items-center gap-1 border rounded px-2 py-1 text-xs hover:border-black"
                      >
                        <Eye size={12} /> View Details
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </main>

      {/* Read‑only Case Detail Modal */}
      {showModal && selectedCase && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-md overflow-y-auto">
          <div className="bg-white rounded-xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b p-4 flex justify-between items-center">
              <h3 className="text-xl font-semibold">
                Case: {selectedCase.caseNo}
              </h3>
              <button onClick={() => setShowModal(false)} className="text-gray-500 hover:text-gray-700">
                <X size={24} />
              </button>
            </div>
            <div className="p-6 space-y-6">
              {/* Basic Info */}
              <div className="grid md:grid-cols-2 gap-4">
                <div><label className="text-sm font-medium">Case No.</label><p className="mt-1">{selectedCase.caseNo}</p></div>
                <div><label className="text-sm font-medium">Investigator</label><p className="mt-1">{selectedCase.investigatorName}</p></div>
                <div><label className="text-sm font-medium">Designation</label><p className="mt-1">{selectedCase.investigatorDesignation || "-"}</p></div>
                <div><label className="text-sm font-medium">Contact</label><p className="mt-1">{selectedCase.investigatorContact || "-"}</p></div>
                <div className="md:col-span-2"><label className="text-sm font-medium">Case Description</label><p className="mt-1 whitespace-pre-wrap">{selectedCase.caseDescription}</p></div>
                <div className="md:col-span-2"><label className="text-sm font-medium">Remarks</label><p className="mt-1">{selectedCase.remarks || "-"}</p></div>
              </div>

              {/* Attachments */}
              {selectedCase.attachments && selectedCase.attachments.length > 0 && (
                <div>
                  <h4 className="font-semibold mb-2">Attachments</h4>
                  <div className="space-y-2">
                    {selectedCase.attachments.map((file, idx) => (
                      <div key={idx} className="flex items-center gap-2 bg-gray-50 p-2 rounded">
                        <FileText size={14} className="text-gray-500" />
                        <span>{file}</span>
                        <a href={`/uploads/acc-oag-referral/${file}`} target="_blank" className="text-blue-500 text-sm ml-auto">View</a>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Accused Details */}
              {selectedCase.accusedDetails && selectedCase.accusedDetails.length > 0 && (
                <div>
                  <h4 className="font-semibold mb-2">Accused Details</h4>
                  <div className="overflow-x-auto">
                    <table className="min-w-full border">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-4 py-2 text-left text-xs">Name</th><th className="px-4 py-2 text-left text-xs">CID</th>
                          <th className="px-4 py-2 text-left text-xs">Act</th><th className="px-4 py-2 text-left text-xs">Section</th>
                          <th className="px-4 py-2 text-left text-xs">Charge</th><th className="px-4 py-2 text-left text-xs">Counts</th>
                          <th className="px-4 py-2 text-left text-xs">Prayer</th>
                        </tr>
                      </thead>
                      <tbody>
                        {selectedCase.accusedDetails.map((acc, idx) => (
                          <tr key={idx} className="border-t">
                            <td className="px-4 py-2 text-sm">{acc.name}</td>
                            <td className="px-4 py-2 text-sm">{acc.cid}</td>
                            <td className="px-4 py-2 text-sm">{getActName(acc.actId)}</td>
                            <td className="px-4 py-2 text-sm">{getSectionName(acc.sectionId)}</td>
                            <td className="px-4 py-2 text-sm">{getChargeName(acc.chargeId)}</td>
                            <td className="px-4 py-2 text-sm">{acc.counts}</td>
                            <td className="px-4 py-2 text-sm max-w-xs truncate">{acc.prayer}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* Meetings */}
              {selectedCase.meetings && selectedCase.meetings.length > 0 && (
                <div>
                  <h4 className="font-semibold mb-2">Meetings</h4>
                  <div className="overflow-x-auto">
                    <table className="min-w-full border">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-4 py-2 text-left text-xs">Date</th><th className="px-4 py-2 text-left text-xs">Type</th>
                          <th className="px-4 py-2 text-left text-xs">Agenda</th><th className="px-4 py-2 text-left text-xs">Participants</th>
                          <th className="px-4 py-2 text-left text-xs">Minutes</th><th className="px-4 py-2 text-left text-xs">Attachments</th>
                        </tr>
                      </thead>
                      <tbody>
                        {selectedCase.meetings.map((m, idx) => (
                          <tr key={idx} className="border-t">
                            <td className="px-4 py-2 text-sm">{formatDate(m.date)}</td>
                            <td className="px-4 py-2 text-sm">{m.type}</td>
                            <td className="px-4 py-2 text-sm max-w-xs truncate">{m.agenda}</td>
                            <td className="px-4 py-2 text-sm max-w-xs truncate">{m.participants}</td>
                            <td className="px-4 py-2 text-sm max-w-xs truncate">{m.minutes}</td>
                            <td className="px-4 py-2 text-sm">
                              {m.attachments && m.attachments.length > 0 ? m.attachments.length + " file(s)" : "-"}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
            <div className="sticky bottom-0 bg-gray-50 p-4 text-right border-t">
              <button onClick={() => setShowModal(false)} className="px-4 py-2 bg-gray-800 text-white rounded-md hover:bg-gray-700">
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}