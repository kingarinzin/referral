"use client";

import { useState, useEffect, ChangeEvent } from "react";
import { Trash2, Pencil, Plus, X, Check, Upload, FileText, Eye, Download, Maximize2 } from "lucide-react";
import Sidebar from "@/components/Sidebar";

// Types
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

type Case = {
  _id: string;
  caseNo: string;
  caseDescription: string;
  investigatorName: string;
  investigatorDesignation: string;
  investigatorContact: string;
  attachments: string[];
  accusedDetails: AccusedDetail[];
  status: string;
  remarks: string;
  createdAt: string;
  updatedAt: string;
};

interface Notification {
  message: string;
  type: "success" | "error";
}

export default function AccOagReferralPage() {
  const [cases, setCases] = useState<Case[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [editData, setEditData] = useState<Case | null>(null);
  const [search, setSearch] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [notification, setNotification] = useState<Notification | null>(null);
  const [selectedView, setSelectedView] = useState<{ title: string; data: string } | null>(null);

  // Form state
  const [formData, setFormData] = useState({
    caseNo: "",
    caseDescription: "",
    investigatorName: "",
    investigatorDesignation: "",
    investigatorContact: "",
    remarks: "",
  });
  const [accusedDetails, setAccusedDetails] = useState<AccusedDetail[]>([]);
  const [attachments, setAttachments] = useState<File[]>([]);
  const [existingAttachments, setExistingAttachments] = useState<string[]>([]);

  // Accused modal state
  const [showAccusedModal, setShowAccusedModal] = useState(false);
  const [editingAccusedIndex, setEditingAccusedIndex] = useState<number | null>(null);
  const [accusedFormData, setAccusedFormData] = useState<AccusedDetail>({
    name: "",
    cid: "",
    actId: "",
    sectionId: "",
    chargeId: "",
    prayer: "",
    counts: 1,
  });

  // Master data
  const [acts, setActs] = useState<Act[]>([]);
  const [sections, setSections] = useState<{ [actId: string]: Section[] }>({});
  const [charges, setCharges] = useState<{ [sectionId: string]: Charge[] }>({});

  // Helper
  const getId = (val: string | { _id: string }): string => {
    if (typeof val === "string") return val;
    return val?._id || "";
  };

  // Fetch cases
  const fetchCases = async () => {
    try {
      const res = await fetch("/api/acc-oag-referral");
      if (!res.ok) throw new Error();
      const data = await res.json();
      setCases(data);
    } catch (error) {
      showNotification("Failed to load cases", "error");
    }
  };

  // Fetch master data
  const fetchActs = async () => {
    try {
      const res = await fetch("/api/offences/act");
      const data = await res.json();
      setActs(data);
    } catch (error) {
      console.error("Failed to load acts");
    }
  };

  const fetchSectionsForAct = async (actId: string) => {
    if (!actId || sections[actId]) return;
    try {
      const res = await fetch(`/api/offences/sections?actId=${actId}`);
      const data = await res.json();
      setSections(prev => ({ ...prev, [actId]: data }));
    } catch (error) {
      console.error("Failed to load sections");
    }
  };

  const fetchChargesForSection = async (sectionId: string) => {
    if (!sectionId || charges[sectionId]) return;
    try {
      const res = await fetch(`/api/offences/charges?sectionId=${sectionId}`);
      const data = await res.json();
      setCharges(prev => ({ ...prev, [sectionId]: data }));
    } catch (error) {
      console.error("Failed to load charges");
    }
  };

  useEffect(() => {
    fetchCases();
    fetchActs();
  }, []);

  // ----- Accused modal handlers -----
  const openAddAccusedModal = () => {
    setEditingAccusedIndex(null);
    setAccusedFormData({
      name: "",
      cid: "",
      actId: "",
      sectionId: "",
      chargeId: "",
      prayer: "",
      counts: 1,
    });
    setShowAccusedModal(true);
  };

  const openEditAccusedModal = (index: number) => {
    const accused = accusedDetails[index];
    setEditingAccusedIndex(index);
    setAccusedFormData({
      ...accused,
      actId: getId(accused.actId),
      sectionId: getId(accused.sectionId),
      chargeId: getId(accused.chargeId),
    });
    const actId = getId(accused.actId);
    const sectionId = getId(accused.sectionId);
    if (actId) fetchSectionsForAct(actId);
    if (sectionId) fetchChargesForSection(sectionId);
    setShowAccusedModal(true);
  };

  const saveAccused = () => {
    if (!accusedFormData.name || !accusedFormData.cid || !accusedFormData.actId || !accusedFormData.sectionId || !accusedFormData.chargeId) {
      showNotification("Please fill all required fields (Name, CID, Act, Section, Charge)", "error");
      return;
    }
    if (editingAccusedIndex !== null) {
      const updated = [...accusedDetails];
      updated[editingAccusedIndex] = { ...accusedFormData };
      setAccusedDetails(updated);
      showNotification("Accused updated", "success");
    } else {
      setAccusedDetails([...accusedDetails, { ...accusedFormData }]);
      showNotification("Accused added", "success");
    }
    setShowAccusedModal(false);
  };

  const deleteAccused = (index: number) => {
    if (confirm("Remove this accused?")) {
      const updated = [...accusedDetails];
      updated.splice(index, 1);
      setAccusedDetails(updated);
    }
  };

  const handleAccusedFormChange = (e: ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setAccusedFormData(prev => ({ ...prev, [name]: value }));
    if (name === "actId") {
      setAccusedFormData(prev => ({ ...prev, sectionId: "", chargeId: "" }));
      fetchSectionsForAct(value);
    }
    if (name === "sectionId") {
      setAccusedFormData(prev => ({ ...prev, chargeId: "" }));
      fetchChargesForSection(value);
    }
  };

  // ----- File handlers -----
  const handleFileSelect = (e: ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length) {
      setAttachments((prev) => [...prev, ...files]);
    }
    e.target.value = "";
  };

  const handleRemoveFile = (index: number) => {
    setAttachments((prev) => prev.filter((_, i) => i !== index));
  };

  const handleRemoveExistingFile = async (fileName: string) => {
    if (!editData) return;
    try {
      const res = await fetch("/api/acc-oag-referral/delete-file", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ caseId: editData._id, fileName }),
      });
      if (!res.ok) throw new Error("Failed to delete file");
      setExistingAttachments((prev) => prev.filter((f) => f !== fileName));
      showNotification("File deleted successfully");
      await fetchCases();
    } catch (error) {
      showNotification((error as Error).message, "error");
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

  // ----- Form handlers -----
  const handleFormChange = (e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const resetForm = () => {
    setEditData(null);
    setFormData({
      caseNo: "",
      caseDescription: "",
      investigatorName: "",
      investigatorDesignation: "",
      investigatorContact: "",
      remarks: "",
    });
    setAccusedDetails([]);
    setAttachments([]);
    setExistingAttachments([]);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.caseNo || !formData.caseDescription || !formData.investigatorName) {
      showNotification("Case No, Description, and Investigator are required", "error");
      return;
    }

    const accusedForApi = accusedDetails.map((acc) => ({
      ...acc,
      actId: getId(acc.actId),
      sectionId: getId(acc.sectionId),
      chargeId: getId(acc.chargeId),
    }));

    const form = new FormData();
    form.append("caseNo", formData.caseNo);
    form.append("caseDescription", formData.caseDescription);
    form.append("investigatorName", formData.investigatorName);
    form.append("investigatorDesignation", formData.investigatorDesignation);
    form.append("investigatorContact", formData.investigatorContact);
    form.append("remarks", formData.remarks);
    form.append("accusedDetails", JSON.stringify(accusedForApi));

    if (editData) {
      form.append("_id", editData._id);
      form.append("existingAttachments", JSON.stringify(existingAttachments));
    }

    attachments.forEach((file) => form.append("attachments", file));

    try {
      const url = "/api/acc-oag-referral";
      const method = editData ? "PUT" : "POST";
      const res = await fetch(url, { method, body: form });
      if (!res.ok) throw new Error();
      await fetchCases();
      setShowForm(false);
      resetForm();
      showNotification(editData ? "Case updated" : "Case created", "success");
    } catch (error) {
      showNotification("Operation failed", "error");
    }
  };

  const handleEdit = (caseItem: Case) => {
    setEditData(caseItem);
    setFormData({
      caseNo: caseItem.caseNo,
      caseDescription: caseItem.caseDescription,
      investigatorName: caseItem.investigatorName,
      investigatorDesignation: caseItem.investigatorDesignation || "",
      investigatorContact: caseItem.investigatorContact || "",
      remarks: caseItem.remarks || "",
    });
    const accused = caseItem.accusedDetails.map((ad) => ({
      ...ad,
      actId: getId(ad.actId),
      sectionId: getId(ad.sectionId),
      chargeId: getId(ad.chargeId),
    }));
    setAccusedDetails(accused);
    setExistingAttachments(caseItem.attachments);
    setAttachments([]);

    accused.forEach((ad) => {
      if (ad.actId) fetchSectionsForAct(ad.actId);
      if (ad.sectionId) fetchChargesForSection(ad.sectionId);
    });

    setShowForm(true);
  };

  const handleDelete = async (caseItem: Case) => {
    if (!confirm(`Delete case "${caseItem.caseNo}"?`)) return;
    try {
      const res = await fetch("/api/acc-oag-referral", {
        method: "DELETE",
        body: JSON.stringify({ _id: caseItem._id }),
        headers: { "Content-Type": "application/json" },
      });
      if (!res.ok) throw new Error();
      await fetchCases();
      showNotification("Case deleted", "success");
    } catch (error) {
      showNotification("Delete failed", "error");
    }
  };

  const showNotification = (msg: string, type: "success" | "error" = "success") => {
    setNotification({ message: msg, type });
    setTimeout(() => setNotification(null), 3000);
  };

  // Filter & pagination
  const filteredCases = cases.filter(
    (c) =>
      c.caseNo.toLowerCase().includes(search.toLowerCase()) ||
      c.caseDescription.toLowerCase().includes(search.toLowerCase()) ||
      c.investigatorName.toLowerCase().includes(search.toLowerCase())
  );

  const totalPages = Math.ceil(filteredCases.length / rowsPerPage);
  const start = (currentPage - 1) * rowsPerPage;
  const paginated = filteredCases.slice(start, start + rowsPerPage);

  const getActName = (actId: string | Act): string => {
    if (typeof actId === "object") return actId.name;
    const act = acts.find((a) => a._id === actId);
    return act ? act.name : "Unknown Act";
  };

  const getSectionName = (sectionId: string | Section): string => {
    if (typeof sectionId === "object") return sectionId.name;
    const sec = Object.values(sections).flat().find((s) => s._id === sectionId);
    return sec ? sec.name : "Unknown Section";
  };

  const getChargeName = (chargeId: string | Charge): string => {
    if (typeof chargeId === "object") return chargeId.name;
    const ch = Object.values(charges).flat().find((c) => c._id === chargeId);
    return ch ? ch.name : "Unknown Charge";
  };

  const totalAttachmentsCount = existingAttachments.length + attachments.length;

  return (
    <>
      <div className="flex">
        <Sidebar />
        <main className="flex-1 p-6 ml-64 bg-gray-100 min-h-screen">
          <div className="flex justify-between items-center mb-6">
            <h1 className="text-2xl font-bold">ACC / OAG Referral Cases</h1>
            {!showForm && (
              <button
                onClick={() => {
                  resetForm();
                  setShowForm(true);
                }}
                className="flex items-center gap-2 px-3 py-1.5 bg-white border rounded-md text-xs font-medium hover:border-black transition"
              >
                <Plus size={14} /> Add New Case
              </button>
            )}
          </div>

          {notification && (
            <div
              className={`mb-4 px-4 py-2 rounded ${
                notification.type === "success" ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"
              }`}
            >
              {notification.message}
            </div>
          )}

          {showForm && (
            <form onSubmit={handleSubmit} className="bg-white shadow rounded-xl p-6 mb-6 space-y-6">
              <div className="flex justify-between items-center border-b pb-2">
                <h2 className="text-lg font-semibold">{editData ? "Edit Case" : "New Case"}</h2>
                <button type="button" onClick={() => setShowForm(false)} className="text-gray-500 hover:text-black">
                  ✕
                </button>
              </div>

              {/* Basic Info */}
              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium">Case No. *</label>
                  <input
                    name="caseNo"
                    value={formData.caseNo}
                    onChange={handleFormChange}
                    className="w-full border rounded px-3 py-2"
                    required
                  />
                </div>
                <div>
                  <label className="text-sm font-medium">Investigator Name *</label>
                  <input
                    name="investigatorName"
                    value={formData.investigatorName}
                    onChange={handleFormChange}
                    className="w-full border rounded px-3 py-2"
                    required
                  />
                </div>
                <div>
                  <label className="text-sm font-medium">Designation</label>
                  <input
                    name="investigatorDesignation"
                    value={formData.investigatorDesignation}
                    onChange={handleFormChange}
                    className="w-full border rounded px-3 py-2"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium">Contact No.</label>
                  <input
                    name="investigatorContact"
                    value={formData.investigatorContact}
                    onChange={handleFormChange}
                    className="w-full border rounded px-3 py-2"
                  />
                </div>
                <div className="md:col-span-2">
                  <label className="text-sm font-medium">Case Description *</label>
                  <textarea
                    name="caseDescription"
                    value={formData.caseDescription}
                    onChange={handleFormChange}
                    rows={3}
                    className="w-full border rounded px-3 py-2"
                    required
                  />
                </div>
                <div className="md:col-span-2">
                  <label className="text-sm font-medium">Remarks</label>
                  <textarea
                    name="remarks"
                    value={formData.remarks}
                    onChange={handleFormChange}
                    rows={2}
                    className="w-full border rounded px-3 py-2"
                  />
                </div>
              </div>

              {/* Attachments Section */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <label className="text-sm font-medium">Attachments</label>
                    <label className="cursor-pointer text-gray-500 hover:text-gray-700 transition">
                      <Upload size={16} />
                      <input type="file" multiple onChange={handleFileSelect} className="hidden" />
                    </label>
                  </div>
                  {totalAttachmentsCount > 0 && (
                    <span className="text-xs text-gray-500">Total: {totalAttachmentsCount} file(s)</span>
                  )}
                </div>

                {existingAttachments.length > 0 && (
                  <div className="space-y-2 mt-3">
                    <label className="text-xs font-medium text-gray-500">Existing Files:</label>
                    {existingAttachments.map((fileName, idx) => (
                      <div
                        key={idx}
                        className="flex justify-between items-center bg-blue-50 px-3 py-2 rounded-lg text-sm border border-blue-200"
                      >
                        <div className="flex items-center gap-2">
                          <FileText size={14} className="text-blue-500" />
                          <span className="text-gray-700">{fileName}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <button onClick={() => handleViewFile(fileName)} className="text-blue-500 hover:text-blue-700">
                            <Eye size={14} />
                          </button>
                          <button
                            onClick={() => handleDownloadFile(fileName)}
                            className="text-green-500 hover:text-green-700"
                          >
                            <Download size={14} />
                          </button>
                          {editData && (
                            <button
                              onClick={() => handleRemoveExistingFile(fileName)}
                              className="text-red-500 hover:text-red-700"
                            >
                              <X size={14} />
                            </button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {attachments.length > 0 && (
                  <div className="space-y-2 mt-3">
                    <label className="text-xs font-medium text-gray-500">New Files to Add:</label>
                    {attachments.map((file, idx) => (
                      <div
                        key={idx}
                        className="flex justify-between items-center bg-green-50 px-3 py-2 rounded-lg text-sm border border-green-200"
                      >
                        <div className="flex items-center gap-2">
                          <FileText size={14} className="text-green-600" />
                          <span className="text-gray-700">{file.name}</span>
                          <span className="text-xs text-gray-500">({(file.size / 1024).toFixed(1)} KB)</span>
                        </div>
                        <button onClick={() => handleRemoveFile(idx)} className="text-red-500 hover:text-red-700">
                          <X size={14} />
                        </button>
                      </div>
                    ))}
                  </div>
                )}

                {totalAttachmentsCount > 0 && (
                  <div className="mt-3 p-3 bg-gray-50 rounded-lg border border-gray-200">
                    <p className="text-sm font-medium text-gray-700">Summary:</p>
                    <ul className="text-xs text-gray-600 mt-1 space-y-1">
                      {existingAttachments.length > 0 && <li>• {existingAttachments.length} existing file(s)</li>}
                      {attachments.length > 0 && <li>• {attachments.length} new file(s) being added</li>}
                      <li className="text-green-600 font-medium mt-1">
                        Total: {totalAttachmentsCount} file(s) will be saved with this case
                      </li>
                    </ul>
                  </div>
                )}
              </div>

              {/* Accused Details Section - List View */}
              <div className="border-t pt-4">
                <div className="flex justify-between items-center mb-3">
                  <h3 className="font-semibold">Accused Details</h3>
                  <button
                    type="button"
                    onClick={openAddAccusedModal}
                    className="flex items-center gap-1 text-xs border rounded px-2 py-1 hover:border-black"
                  >
                    <Plus size={12} /> Add Accused
                  </button>
                </div>
                {accusedDetails.length > 0 ? (
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200 border rounded-lg">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-4 py-2 text-left text-xs font-medium uppercase">Name</th>
                          <th className="px-4 py-2 text-left text-xs font-medium uppercase">CID</th>
                          <th className="px-4 py-2 text-left text-xs font-medium uppercase">Act</th>
                          <th className="px-4 py-2 text-left text-xs font-medium uppercase">Section</th>
                          <th className="px-4 py-2 text-left text-xs font-medium uppercase">Charge</th>
                          <th className="px-4 py-2 text-left text-xs font-medium uppercase">Counts</th>
                          <th className="px-4 py-2 text-left text-xs font-medium uppercase">Prayer</th>
                          <th className="px-4 py-2 text-left text-xs font-medium uppercase">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-200 bg-white">
                        {accusedDetails.map((acc, idx) => (
                          <tr key={idx} className="hover:bg-gray-50">
                            <td className="px-4 py-2 text-sm">{acc.name}</td>
                            <td className="px-4 py-2 text-sm">{acc.cid}</td>
                            <td className="px-4 py-2 text-sm">{getActName(acc.actId)}</td>
                            <td className="px-4 py-2 text-sm">{getSectionName(acc.sectionId)}</td>
                            <td className="px-4 py-2 text-sm">{getChargeName(acc.chargeId)}</td>
                            <td className="px-4 py-2 text-sm">{acc.counts}</td>
                            <td className="px-4 py-2 text-sm max-w-xs truncate">
                              {acc.prayer.length > 30 ? acc.prayer.substring(0, 30) + "..." : acc.prayer}
                            </td>
                            <td className="px-4 py-2 text-sm flex gap-2">
                              <button
                                type="button"
                                onClick={() => openEditAccusedModal(idx)}
                                className="text-blue-500 hover:text-blue-700"
                              >
                                <Pencil size={14} />
                              </button>
                              <button
                                type="button"
                                onClick={() => deleteAccused(idx)}
                                className="text-red-500 hover:text-red-700"
                              >
                                <Trash2 size={14} />
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <p className="text-gray-400 text-sm">No accused added. Click "Add Accused".</p>
                )}
              </div>

              <div className="flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setShowForm(false)}
                  className="flex items-center gap-2 px-3 py-1.5 border rounded-md text-xs"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex items-center gap-2 px-3 py-1.5 bg-blue-600 text-white rounded-md text-xs hover:bg-blue-700"
                >
                  <Check size={14} /> Save Case
                </button>
              </div>
            </form>
          )}

          {/* Toolbar */}
          <div className="flex justify-between items-center mb-4">
            <input
              type="text"
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setCurrentPage(1);
              }}
              placeholder="Search by Case No., Description, Investigator..."
              className="w-80 px-4 py-2 border rounded focus:ring-2 focus:ring-blue-400 outline-none"
            />
            <div className="flex items-center gap-2 text-sm">
              <span>Show</span>
              <select
                value={rowsPerPage}
                onChange={(e) => {
                  setRowsPerPage(Number(e.target.value));
                  setCurrentPage(1);
                }}
                className="border rounded px-2 py-1"
              >
                {[10, 20, 30, 50].map((n) => (
                  <option key={n}>{n}</option>
                ))}
              </select>
              <span>entries</span>
            </div>
          </div>

          {/* List Table */}
          <div className="bg-white shadow rounded-lg overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase">S/N</th>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase">Case No.</th>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase">Description</th>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase">Investigator</th>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase">Accused</th>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase">Status</th>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase">Attachments</th>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {paginated.map((c, idx) => (
                  <tr key={c._id} className="hover:bg-gray-100">
                    <td className="px-6 py-3 text-sm">{start + idx + 1}</td>
                    <td className="px-6 py-3 text-sm font-medium">{c.caseNo}</td>
                    <td className="px-6 py-3 text-sm max-w-xs truncate">
                      <div className="flex items-center gap-2">
                        <span>{c.caseDescription.substring(0, 60)}</span>
                        {c.caseDescription.length > 60 && (
                          <button
                            onClick={() => setSelectedView({ title: "Case Description", data: c.caseDescription })}
                            className="text-blue-500 hover:text-blue-700"
                          >
                            <Maximize2 size={14} />
                          </button>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-3 text-sm">{c.investigatorName}</td>
                    <td className="px-6 py-3 text-sm">{c.accusedDetails?.length || 0}</td>
                    <td className="px-6 py-3 text-sm">
                      <span
                        className={`px-2 py-1 rounded text-xs ${
                          c.status === "Closed"
                            ? "bg-green-100 text-green-800"
                            : c.status === "Under Investigation"
                            ? "bg-yellow-100 text-yellow-800"
                            : "bg-gray-100 text-gray-800"
                        }`}
                      >
                        {c.status}
                      </span>
                    </td>
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
                    <td className="px-6 py-3 text-sm flex gap-2">
                      <button
                        onClick={() => handleEdit(c)}
                        className="flex items-center gap-1 border rounded px-2 py-1 text-xs hover:border-black"
                      >
                        <Pencil size={12} /> Edit
                      </button>
                      <button
                        onClick={() => handleDelete(c)}
                        className="flex items-center gap-1 border rounded px-2 py-1 text-xs hover:border-black text-red-500"
                      >
                        <Trash2 size={12} /> Delete
                      </button>
                    </td>
                  </tr>
                ))}
                {paginated.length === 0 && (
                  <tr>
                    <td colSpan={8} className="text-center py-6 text-gray-500">
                      No cases found
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {totalPages > 1 && (
            <div className="flex justify-end items-center gap-4 mt-5 text-sm">
              <button
                disabled={currentPage === 1}
                onClick={() => setCurrentPage((p) => p - 1)}
                className="font-semibold text-lg disabled:text-gray-400 hover:text-blue-600"
              >
                &lt;
              </button>
              <span>
                Page {currentPage} of {totalPages}
              </span>
              <button
                disabled={currentPage === totalPages}
                onClick={() => setCurrentPage((p) => p + 1)}
                className="font-semibold text-lg disabled:text-gray-400 hover:text-blue-600"
              >
                &gt;
              </button>
            </div>
          )}
        </main>
      </div>

      {/* Modal for long text */}
      {selectedView && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ animation: "fadeIn 0.2s ease-out" }}
        >
          <div className="absolute inset-0 bg-black/50 backdrop-blur-md" onClick={() => setSelectedView(null)} />
          <div
            className="relative bg-white rounded-xl shadow-2xl max-w-4xl w-full max-h-[80vh] flex flex-col"
            style={{ animation: "zoomIn 0.2s ease-out" }}
          >
            <div className="flex justify-between items-center p-6 border-b">
              <h3 className="text-xl font-semibold">{selectedView.title}</h3>
              <button onClick={() => setSelectedView(null)} className="text-gray-500 hover:text-gray-700">
                <X size={24} />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-6">
              <div className="whitespace-pre-wrap text-gray-700 leading-relaxed">{selectedView.data}</div>
            </div>
            <div className="flex justify-end p-6 border-t bg-gray-50 rounded-b-xl">
              <button
                onClick={() => setSelectedView(null)}
                className="px-4 py-2 bg-gray-800 text-white rounded-md hover:bg-gray-700"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal for Add/Edit Accused */}
      {showAccusedModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ animation: "fadeIn 0.2s ease-out" }}
        >
          <div className="absolute inset-0 bg-black/50 backdrop-blur-md" onClick={() => setShowAccusedModal(false)} />
          <div
            className="relative bg-white rounded-xl shadow-2xl max-w-2xl w-full max-h-[90vh] flex flex-col"
            style={{ animation: "zoomIn 0.2s ease-out" }}
          >
            <div className="flex justify-between items-center p-6 border-b">
              <h3 className="text-xl font-semibold">
                {editingAccusedIndex !== null ? "Edit Accused" : "Add Accused"}
              </h3>
              <button onClick={() => setShowAccusedModal(false)} className="text-gray-500 hover:text-gray-700">
                <X size={24} />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-6">
              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium">Name *</label>
                  <input
                    name="name"
                    value={accusedFormData.name}
                    onChange={handleAccusedFormChange}
                    className="w-full border rounded px-3 py-2"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium">CID *</label>
                  <input
                    name="cid"
                    value={accusedFormData.cid}
                    onChange={handleAccusedFormChange}
                    className="w-full border rounded px-3 py-2"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium">Act *</label>
                  <select
                    name="actId"
                    value={getId(accusedFormData.actId)}
                    onChange={handleAccusedFormChange}
                    className="w-full border rounded px-3 py-2"
                  >
                    <option value="">Select Act</option>
                    {acts.map((act) => (
                      <option key={act._id} value={act._id}>{act.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-sm font-medium">Section *</label>
                  <select
                    name="sectionId"
                    value={getId(accusedFormData.sectionId)}
                    onChange={handleAccusedFormChange}
                    disabled={!getId(accusedFormData.actId)}
                    className="w-full border rounded px-3 py-2"
                  >
                    <option value="">Select Section</option>
                    {sections[getId(accusedFormData.actId)]?.map((sec) => (
                      <option key={sec._id} value={sec._id}>{sec.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-sm font-medium">Charge *</label>
                  <select
                    name="chargeId"
                    value={getId(accusedFormData.chargeId)}
                    onChange={handleAccusedFormChange}
                    disabled={!getId(accusedFormData.sectionId)}
                    className="w-full border rounded px-3 py-2"
                  >
                    <option value="">Select Charge</option>
                    {charges[getId(accusedFormData.sectionId)]?.map((ch) => (
                      <option key={ch._id} value={ch._id}>{ch.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-sm font-medium">Counts</label>
                  <input
                    type="number"
                    name="counts"
                    value={accusedFormData.counts}
                    onChange={handleAccusedFormChange}
                    className="w-full border rounded px-3 py-2"
                  />
                </div>
                <div className="md:col-span-2">
                  <label className="text-sm font-medium">Prayer</label>
                  <textarea
                    name="prayer"
                    value={accusedFormData.prayer}
                    onChange={handleAccusedFormChange}
                    rows={3}
                    className="w-full border rounded px-3 py-2"
                  />
                </div>
              </div>
            </div>
            <div className="flex justify-end gap-3 p-6 border-t bg-gray-50 rounded-b-xl">
              <button
                onClick={() => setShowAccusedModal(false)}
                className="px-4 py-2 border rounded-md text-sm hover:border-black"
              >
                Cancel
              </button>
              <button
                onClick={saveAccused}
                className="px-4 py-2 bg-blue-600 text-white rounded-md text-sm hover:bg-blue-700"
              >
                {editingAccusedIndex !== null ? "Update" : "Add"}
              </button>
            </div>
          </div>
        </div>
      )}

      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes zoomIn {
          from { transform: scale(0.95); opacity: 0; }
          to { transform: scale(1); opacity: 1; }
        }
      `}</style>
    </>
  );
}