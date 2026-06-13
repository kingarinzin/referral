"use client";

import { useState, useEffect, ChangeEvent } from "react";
import {
  Trash2, Pencil, Plus, X, Check, Upload, FileText, Eye, Download, Maximize2,
  UserPlus, UserCheck, Send
} from "lucide-react";
import Sidebar from "@/components/Sidebar";

// ==================== TYPES ====================
type Act = { _id: string; name: string };
type Section = { _id: string; name: string; actId: string };
type Charge = { _id: string; name: string; sectionId: string };
type Prosecutor = { _id: string; name: string; email: string; role: string };

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
  newFiles?: File[];
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

type Notification = { message: string; type: "success" | "error" };

// ==================== COMPONENT ====================
export default function AccOagReferralPage() {
  // ---------- State ----------
  const [cases, setCases] = useState<Case[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [editData, setEditData] = useState<Case | null>(null);
  const [search, setSearch] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [notification, setNotification] = useState<Notification | null>(null);
  const [selectedView, setSelectedView] = useState<{ title: string; data: string } | null>(null);
  const [filterStatus, setFilterStatus] = useState("all");

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
  const [meetings, setMeetings] = useState<Meeting[]>([]);
  const [attachments, setAttachments] = useState<File[]>([]);
  const [existingAttachments, setExistingAttachments] = useState<string[]>([]);

  // Accused modal
  const [showAccusedModal, setShowAccusedModal] = useState(false);
  const [editingAccusedIndex, setEditingAccusedIndex] = useState<number | null>(null);
  const [accusedFormData, setAccusedFormData] = useState<AccusedDetail>({
    name: "", cid: "", actId: "", sectionId: "", chargeId: "", prayer: "", counts: 1,
  });

  // Meeting modal
  const [showMeetingModal, setShowMeetingModal] = useState(false);
  const [editingMeetingIndex, setEditingMeetingIndex] = useState<number | null>(null);
  const [meetingFormData, setMeetingFormData] = useState<Meeting>({
    date: "", type: "", agenda: "", participants: "", minutes: "", attachments: [], newFiles: [],
  });

  // Master data
  const [acts, setActs] = useState<Act[]>([]);
  const [sections, setSections] = useState<{ [actId: string]: Section[] }>({});
  const [charges, setCharges] = useState<{ [sectionId: string]: Charge[] }>({});

  // Assignment / user context
  const [prosecutors, setProsecutors] = useState<Prosecutor[]>([]);
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [selectedCase, setSelectedCase] = useState<Case | null>(null);
  const [selectedProsecutorId, setSelectedProsecutorId] = useState("");
  const [currentUserRole, setCurrentUserRole] = useState("");
  const [isAgencyAdmin, setIsAgencyAdmin] = useState(false);
  const [currentUserAgency, setCurrentUserAgency] = useState("");

  // Helper
  const getId = (val: string | { _id: string }): string => {
    if (typeof val === "string") return val;
    return val?._id || "";
  };

  // ---------- API calls ----------
  const fetchCases = async () => {
    try {
      const res = await fetch("/api/acc-oag-referral");
      if (!res.ok) throw new Error();
      const data = await res.json();
      const normalized = data.map((c: Case) => ({
        ...c,
        assignedProsecutor: c.assignedProsecutor || null,
        referredToOAG: c.referredToOAG || false,
      }));
      setCases(normalized);
    } catch (error) {
      showNotification("Failed to load cases", "error");
    }
  };

  const fetchActs = async () => {
    try {
      const res = await fetch("/api/offences/act");
      const data = await res.json();
      setActs(data);
    } catch (error) { console.error("Failed to load acts"); }
  };

  const fetchSectionsForAct = async (actId: string) => {
    if (!actId || sections[actId]) return;
    try {
      const res = await fetch(`/api/offences/sections?actId=${actId}`);
      const data = await res.json();
      setSections(prev => ({ ...prev, [actId]: data }));
    } catch (error) { console.error("Failed to load sections"); }
  };

  const fetchChargesForSection = async (sectionId: string) => {
    if (!sectionId || charges[sectionId]) return;
    try {
      const res = await fetch(`/api/offences/charges?sectionId=${sectionId}`);
      const data = await res.json();
      setCharges(prev => ({ ...prev, [sectionId]: data }));
    } catch (error) { console.error("Failed to load charges"); }
  };

  const fetchProsecutors = async () => {
    try {
      const res = await fetch("/api/users?role=Prosecutor");
      if (res.ok) {
        const data = await res.json();
        setProsecutors(data);
      }
    } catch (error) { console.error("Failed to load prosecutors"); }
  };

  // ---------- User context ----------
  useEffect(() => {
    const token = localStorage.getItem("token");
    if (token) {
      try {
        const payload = JSON.parse(atob(token.split(".")[1]));
        setCurrentUserRole(payload.role || "");
        setIsAgencyAdmin(payload.isAgencyAdmin === true);
      } catch (e) { console.error(e); }
    }
    const fetchUserProfile = async () => {
      try {
        const res = await fetch("/api/user/profile");
        if (res.ok) {
          const profile = await res.json();
          setCurrentUserAgency(profile.agencyName || "");
        }
      } catch (e) {}
    };
    fetchUserProfile();
    fetchCases();
    fetchActs();
  }, []);

  // Role‑based button visibility
  const canRefer = !isAgencyAdmin && currentUserRole !== "Admin" && currentUserAgency?.toLowerCase().includes("anti-corruption");
  const canAssign = isAgencyAdmin && currentUserRole !== "Admin";

  // ---------- Accused handlers ----------
  const openAddAccusedModal = () => {
    setEditingAccusedIndex(null);
    setAccusedFormData({ name: "", cid: "", actId: "", sectionId: "", chargeId: "", prayer: "", counts: 1 });
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
      showNotification("Please fill all required fields", "error");
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

  // ---------- Meeting handlers ----------
  const openAddMeetingModal = () => {
    setEditingMeetingIndex(null);
    setMeetingFormData({ date: "", type: "", agenda: "", participants: "", minutes: "", attachments: [], newFiles: [] });
    setShowMeetingModal(true);
  };

  const openEditMeetingModal = (index: number) => {
    const meeting = meetings[index];
    setEditingMeetingIndex(index);
    setMeetingFormData({
      ...meeting,
      date: meeting.date ? new Date(meeting.date).toISOString().split('T')[0] : "",
      newFiles: [],
    });
    setShowMeetingModal(true);
  };

  const handleMeetingFormChange = (e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setMeetingFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleMeetingFileSelect = (e: ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length) setMeetingFormData(prev => ({ ...prev, newFiles: [...(prev.newFiles || []), ...files] }));
    e.target.value = "";
  };

  const removeMeetingNewFile = (index: number) => {
    setMeetingFormData(prev => ({ ...prev, newFiles: prev.newFiles?.filter((_, i) => i !== index) || [] }));
  };

  const removeMeetingExistingFile = (fileName: string) => {
    setMeetingFormData(prev => ({ ...prev, attachments: prev.attachments.filter(f => f !== fileName) }));
  };

  const saveMeeting = () => {
    if (!meetingFormData.date || !meetingFormData.type) {
      showNotification("Date and Type are required", "error");
      return;
    }
    const meetingToSave: Meeting = {
      date: meetingFormData.date,
      type: meetingFormData.type,
      agenda: meetingFormData.agenda,
      participants: meetingFormData.participants,
      minutes: meetingFormData.minutes,
      attachments: meetingFormData.attachments,
      newFiles: meetingFormData.newFiles,
    };
    if (editingMeetingIndex !== null) {
      const updated = [...meetings];
      updated[editingMeetingIndex] = meetingToSave;
      setMeetings(updated);
      showNotification("Meeting updated", "success");
    } else {
      setMeetings([...meetings, meetingToSave]);
      showNotification("Meeting added", "success");
    }
    setShowMeetingModal(false);
  };

  const deleteMeeting = (index: number) => {
    if (confirm("Remove this meeting?")) {
      const updated = [...meetings];
      updated.splice(index, 1);
      setMeetings(updated);
    }
  };

  // ---------- File handlers (case attachments) ----------
  const handleFileSelect = (e: ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length) setAttachments(prev => [...prev, ...files]);
    e.target.value = "";
  };

  const handleRemoveFile = (index: number) => setAttachments(prev => prev.filter((_, i) => i !== index));

  const handleRemoveExistingFile = async (fileName: string) => {
    if (!editData) return;
    try {
      const res = await fetch("/api/acc-oag-referral/delete-file", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ caseId: editData._id, fileName }),
      });
      if (!res.ok) throw new Error("Failed to delete file");
      setExistingAttachments(prev => prev.filter(f => f !== fileName));
      showNotification("File deleted successfully");
      await fetchCases();
    } catch (error) {
      showNotification((error as Error).message, "error");
    }
  };

  const handleViewFile = (fileName: string) => window.open(`/uploads/acc-oag-referral/${fileName}`, "_blank");
  const handleDownloadFile = (fileName: string) => {
    const link = document.createElement("a");
    link.href = `/uploads/acc-oag-referral/${fileName}`;
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // ---------- Assignment handlers ----------
  const openAssignModal = (caseItem: Case) => {
    setSelectedCase(caseItem);
    setSelectedProsecutorId(caseItem.assignedProsecutor?._id || "");
    fetchProsecutors();
    setShowAssignModal(true);
  };

  const handleAssign = async () => {
    if (!selectedCase || !selectedProsecutorId) {
      showNotification("Please select a prosecutor", "error");
      return;
    }
    try {
      const res = await fetch("/api/acc-oag-referral/assign", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ caseId: selectedCase._id, prosecutorId: selectedProsecutorId }),
      });
      if (!res.ok) throw new Error();
      await fetchCases();
      showNotification("Case assigned to prosecutor successfully");
      setShowAssignModal(false);
    } catch (error) {
      showNotification("Assignment failed", "error");
    }
  };

  // ---------- Refer to OAG handler ----------
  const handleReferToOAG = async (caseItem: Case) => {
    if (!confirm(`Refer case "${caseItem.caseNo}" to OAG?`)) return;
    try {
      const res = await fetch("/api/acc-oag-referral/refer-to-oag", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ caseId: caseItem._id }),
      });
      if (!res.ok) throw new Error();
      showNotification("Case referred to OAG successfully");
      await fetchCases();
    } catch (error) {
      showNotification("Referral failed", "error");
    }
  };

  // ---------- Form CRUD ----------
  const handleFormChange = (e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const resetForm = () => {
    setEditData(null);
    setFormData({ caseNo: "", caseDescription: "", investigatorName: "", investigatorDesignation: "", investigatorContact: "", remarks: "" });
    setAccusedDetails([]);
    setMeetings([]);
    setAttachments([]);
    setExistingAttachments([]);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.caseNo || !formData.caseDescription || !formData.investigatorName) {
      showNotification("Case No, Description, and Investigator are required", "error");
      return;
    }

    const accusedForApi = accusedDetails.map(acc => ({
      ...acc,
      actId: getId(acc.actId),
      sectionId: getId(acc.sectionId),
      chargeId: getId(acc.chargeId),
    }));

    const meetingsForApi = meetings.map(m => ({ ...m, newFiles: undefined }));

    const form = new FormData();
    form.append("caseNo", formData.caseNo);
    form.append("caseDescription", formData.caseDescription);
    form.append("investigatorName", formData.investigatorName);
    form.append("investigatorDesignation", formData.investigatorDesignation);
    form.append("investigatorContact", formData.investigatorContact);
    form.append("remarks", formData.remarks);
    form.append("accusedDetails", JSON.stringify(accusedForApi));
    form.append("meetings", JSON.stringify(meetingsForApi));

    attachments.forEach(file => form.append("attachments", file));
    meetings.forEach((meeting, idx) => {
      if (meeting.newFiles?.length) {
        meeting.newFiles.forEach(file => form.append(`meeting_attachments_${idx}`, file));
      }
    });

    if (editData) {
      form.append("_id", editData._id);
      form.append("existingAttachments", JSON.stringify(existingAttachments));
    }

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
    const accused = caseItem.accusedDetails.map(ad => ({
      ...ad,
      actId: getId(ad.actId),
      sectionId: getId(ad.sectionId),
      chargeId: getId(ad.chargeId),
    }));
    setAccusedDetails(accused);
    setMeetings((caseItem.meetings || []).map(m => ({ ...m, newFiles: [] })));
    setExistingAttachments(caseItem.attachments);
    setAttachments([]);
    accused.forEach(ad => {
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

  // ---------- Filter & pagination ----------
  const filteredCases = cases.filter(c => {
    const matchesSearch = c.caseNo.toLowerCase().includes(search.toLowerCase()) ||
      c.caseDescription.toLowerCase().includes(search.toLowerCase()) ||
      c.investigatorName.toLowerCase().includes(search.toLowerCase());
    if (!matchesSearch) return false;
    if (filterStatus === "referred") return c.referredToOAG === true;
    return true;
  });

  const totalPages = Math.ceil(filteredCases.length / rowsPerPage);
  const start = (currentPage - 1) * rowsPerPage;
  const paginated = filteredCases.slice(start, start + rowsPerPage);

  // Helper display functions
  const getActName = (actId: string | Act) => {
    if (typeof actId === "object") return actId.name;
    const act = acts.find(a => a._id === actId);
    return act ? act.name : "Unknown Act";
  };
  const getSectionName = (sectionId: string | Section) => {
    if (typeof sectionId === "object") return sectionId.name;
    const sec = Object.values(sections).flat().find(s => s._id === sectionId);
    return sec ? sec.name : "Unknown Section";
  };
  const getChargeName = (chargeId: string | Charge) => {
    if (typeof chargeId === "object") return chargeId.name;
    const ch = Object.values(charges).flat().find(c => c._id === chargeId);
    return ch ? ch.name : "Unknown Charge";
  };
  const totalAttachmentsCount = existingAttachments.length + attachments.length;
  const meetingAttachmentsCount = (meeting: Meeting) => (meeting.attachments?.length || 0) + (meeting.newFiles?.length || 0);

  // ---------- Render ----------
  return (
    <>
      <div className="flex">
        <Sidebar />
        <main className="flex-1 p-6 ml-64 bg-gray-100 min-h-screen">
          {/* Header */}
          <div className="flex justify-between items-center mb-6">
            <h1 className="text-2xl font-bold">ACC / OAG Referral Cases</h1>
            {!showForm && (
              <button onClick={() => { resetForm(); setShowForm(true); }} className="flex items-center gap-2 px-3 py-1.5 bg-white border rounded-md text-xs font-medium hover:border-black">
                <Plus size={14} /> Add New Case
              </button>
            )}
          </div>

          {notification && (
            <div className={`mb-4 px-4 py-2 rounded ${notification.type === "success" ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"}`}>
              {notification.message}
            </div>
          )}

          {/* Create/Edit Form */}
          {showForm && (
            <form onSubmit={handleSubmit} className="bg-white shadow rounded-xl p-6 mb-6 space-y-6">
              <div className="flex justify-between items-center border-b pb-2">
                <h2 className="text-lg font-semibold">{editData ? "Edit Case" : "New Case"}</h2>
                <button type="button" onClick={() => setShowForm(false)} className="text-gray-500 hover:text-black">✕</button>
              </div>

              <div className="grid md:grid-cols-2 gap-4">
                <div><label className="text-sm font-medium">Case No. *</label><input name="caseNo" value={formData.caseNo} onChange={handleFormChange} className="w-full border rounded px-3 py-2" required /></div>
                <div><label className="text-sm font-medium">Investigator Name *</label><input name="investigatorName" value={formData.investigatorName} onChange={handleFormChange} className="w-full border rounded px-3 py-2" required /></div>
                <div><label className="text-sm font-medium">Designation</label><input name="investigatorDesignation" value={formData.investigatorDesignation} onChange={handleFormChange} className="w-full border rounded px-3 py-2" /></div>
                <div><label className="text-sm font-medium">Contact No.</label><input name="investigatorContact" value={formData.investigatorContact} onChange={handleFormChange} className="w-full border rounded px-3 py-2" /></div>
                <div className="md:col-span-2"><label className="text-sm font-medium">Case Description *</label><textarea name="caseDescription" value={formData.caseDescription} onChange={handleFormChange} rows={3} className="w-full border rounded px-3 py-2" required /></div>
                <div className="md:col-span-2"><label className="text-sm font-medium">Remarks</label><textarea name="remarks" value={formData.remarks} onChange={handleFormChange} rows={2} className="w-full border rounded px-3 py-2" /></div>
              </div>

              {/* Attachments */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <label className="text-sm font-medium">Attachments</label>
                    <label className="cursor-pointer text-gray-500 hover:text-gray-700"><Upload size={16} /><input type="file" multiple onChange={handleFileSelect} className="hidden" /></label>
                  </div>
                  {totalAttachmentsCount > 0 && <span className="text-xs text-gray-500">Total: {totalAttachmentsCount} file(s)</span>}
                </div>
                {existingAttachments.length > 0 && (
                  <div className="space-y-2 mt-3">
                    <label className="text-xs font-medium text-gray-500">Existing Files:</label>
                    {existingAttachments.map((fileName, idx) => (
                      <div key={idx} className="flex justify-between items-center bg-blue-50 px-3 py-2 rounded-lg text-sm border border-blue-200">
                        <div className="flex items-center gap-2"><FileText size={14} className="text-blue-500" /><span>{fileName}</span></div>
                        <div className="flex items-center gap-2">
                          <button onClick={() => handleViewFile(fileName)} className="text-blue-500"><Eye size={14} /></button>
                          <button onClick={() => handleDownloadFile(fileName)} className="text-green-500"><Download size={14} /></button>
                          {editData && <button onClick={() => handleRemoveExistingFile(fileName)} className="text-red-500"><X size={14} /></button>}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
                {attachments.length > 0 && (
                  <div className="space-y-2 mt-3">
                    <label className="text-xs font-medium text-gray-500">New Files to Add:</label>
                    {attachments.map((file, idx) => (
                      <div key={idx} className="flex justify-between items-center bg-green-50 px-3 py-2 rounded-lg text-sm border border-green-200">
                        <div className="flex items-center gap-2"><FileText size={14} className="text-green-600" /><span>{file.name}</span><span className="text-xs text-gray-500">({(file.size / 1024).toFixed(1)} KB)</span></div>
                        <button onClick={() => handleRemoveFile(idx)} className="text-red-500"><X size={14} /></button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Accused Details Table */}
              <div className="border-t pt-4">
                <div className="flex justify-between items-center mb-3"><h3 className="font-semibold">Accused Details</h3><button type="button" onClick={openAddAccusedModal} className="flex items-center gap-1 text-xs border rounded px-2 py-1 hover:border-black"><Plus size={12} /> Add Accused</button></div>
                {accusedDetails.length > 0 ? (
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200 border rounded-lg">
                      <thead className="bg-gray-50"><tr><th className="px-4 py-2 text-left text-xs font-medium uppercase">Name</th><th className="px-4 py-2 text-left text-xs font-medium uppercase">CID</th><th className="px-4 py-2 text-left text-xs font-medium uppercase">Act</th><th className="px-4 py-2 text-left text-xs font-medium uppercase">Section</th><th className="px-4 py-2 text-left text-xs font-medium uppercase">Charge</th><th className="px-4 py-2 text-left text-xs font-medium uppercase">Counts</th><th className="px-4 py-2 text-left text-xs font-medium uppercase">Prayer</th><th className="px-4 py-2 text-left text-xs font-medium uppercase">Actions</th></tr></thead>
                      <tbody className="divide-y divide-gray-200 bg-white">
                        {accusedDetails.map((acc, idx) => (
                          <tr key={idx}>
                            <td className="px-4 py-2 text-sm">{acc.name}</td><td className="px-4 py-2 text-sm">{acc.cid}</td><td className="px-4 py-2 text-sm">{getActName(acc.actId)}</td><td className="px-4 py-2 text-sm">{getSectionName(acc.sectionId)}</td><td className="px-4 py-2 text-sm">{getChargeName(acc.chargeId)}</td><td className="px-4 py-2 text-sm">{acc.counts}</td><td className="px-4 py-2 text-sm max-w-xs truncate">{acc.prayer}</td>
                            <td className="px-4 py-2 text-sm flex gap-2"><button type="button" onClick={() => openEditAccusedModal(idx)} className="text-blue-500"><Pencil size={14} /></button><button type="button" onClick={() => deleteAccused(idx)} className="text-red-500"><Trash2 size={14} /></button></td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : <p className="text-gray-400 text-sm">No accused added. Click "Add Accused".</p>}
              </div>

              {/* Meetings Table */}
              <div className="border-t pt-4">
                <div className="flex justify-between items-center mb-3"><h3 className="font-semibold">Meetings</h3><button type="button" onClick={openAddMeetingModal} className="flex items-center gap-1 text-xs border rounded px-2 py-1 hover:border-black"><Plus size={12} /> Add Meeting</button></div>
                {meetings.length > 0 ? (
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200 border rounded-lg">
                      <thead className="bg-gray-50"><tr><th className="px-4 py-2 text-left text-xs font-medium uppercase">Date</th><th className="px-4 py-2 text-left text-xs font-medium uppercase">Type</th><th className="px-4 py-2 text-left text-xs font-medium uppercase">Agenda</th><th className="px-4 py-2 text-left text-xs font-medium uppercase">Participants</th><th className="px-4 py-2 text-left text-xs font-medium uppercase">Minutes</th><th className="px-4 py-2 text-left text-xs font-medium uppercase">Attachments</th><th className="px-4 py-2 text-left text-xs font-medium uppercase">Actions</th></tr></thead>
                      <tbody className="divide-y divide-gray-200 bg-white">
                        {meetings.map((m, idx) => (
                          <tr key={idx}>
                            <td className="px-4 py-2 text-sm">{new Date(m.date).toLocaleDateString()}</td><td className="px-4 py-2 text-sm">{m.type}</td><td className="px-4 py-2 text-sm max-w-xs truncate">{m.agenda}</td><td className="px-4 py-2 text-sm max-w-xs truncate">{m.participants}</td><td className="px-4 py-2 text-sm max-w-xs truncate">{m.minutes}</td>
                            <td className="px-4 py-2 text-sm">{meetingAttachmentsCount(m) > 0 ? <span className="text-xs text-blue-600">{meetingAttachmentsCount(m)} file(s)</span> : <span className="text-gray-400">-</span>}</td>
                            <td className="px-4 py-2 text-sm flex gap-2"><button type="button" onClick={() => openEditMeetingModal(idx)} className="text-blue-500"><Pencil size={14} /></button><button type="button" onClick={() => deleteMeeting(idx)} className="text-red-500"><Trash2 size={14} /></button></td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : <p className="text-gray-400 text-sm">No meetings added. Click "Add Meeting".</p>}
              </div>

              <div className="flex justify-end gap-3">
                <button type="button" onClick={() => setShowForm(false)} className="px-3 py-1.5 border rounded-md text-xs">Cancel</button>
                <button type="submit" className="flex items-center gap-2 px-3 py-1.5 bg-blue-600 text-white rounded-md text-xs hover:bg-blue-700"><Check size={14} /> Save Case</button>
              </div>
            </form>
          )}

          {/* Toolbar with search and filter */}
          <div className="flex justify-between items-center mb-4">
            <div className="flex gap-2">
              <input type="text" value={search} onChange={(e) => { setSearch(e.target.value); setCurrentPage(1); }} placeholder="Search by Case No., Description, Investigator..." className="w-80 px-4 py-2 border rounded focus:ring-2 focus:ring-blue-400 outline-none" />
              <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)} className="border rounded px-2 py-1 text-sm">
                <option value="all">All Cases</option>
                <option value="referred">Referred to OAG</option>
              </select>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <span>Show</span>
              <select value={rowsPerPage} onChange={(e) => { setRowsPerPage(Number(e.target.value)); setCurrentPage(1); }} className="border rounded px-2 py-1">
                {[10,20,30,50].map(n => <option key={n}>{n}</option>)}
              </select>
              <span>entries</span>
            </div>
          </div>

          {/* Cases Table */}
          <div className="bg-white shadow rounded-lg overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr><th className="px-6 py-3 text-left text-xs font-medium uppercase">S/N</th><th className="px-6 py-3 text-left text-xs font-medium uppercase">Case No.</th><th className="px-6 py-3 text-left text-xs font-medium uppercase">Description</th><th className="px-6 py-3 text-left text-xs font-medium uppercase">Investigator</th><th className="px-6 py-3 text-left text-xs font-medium uppercase">Assigned Prosecutor</th><th className="px-6 py-3 text-left text-xs font-medium uppercase">Accused</th><th className="px-6 py-3 text-left text-xs font-medium uppercase">Meetings</th><th className="px-6 py-3 text-left text-xs font-medium uppercase">Status</th><th className="px-6 py-3 text-left text-xs font-medium uppercase">Attachments</th><th className="px-6 py-3 text-left text-xs font-medium uppercase">Actions</th></tr></thead>
              <tbody className="divide-y divide-gray-200">
                {paginated.map((c, idx) => (
                  <tr key={c._id} className="hover:bg-gray-100">
                    <td className="px-6 py-3 text-sm">{start + idx + 1}</td>
                    <td className="px-6 py-3 text-sm font-medium">{c.caseNo}</td>
                    <td className="px-6 py-3 text-sm max-w-xs truncate"><div className="flex items-center gap-2"><span>{c.caseDescription.substring(0, 60)}</span>{c.caseDescription.length > 60 && <button onClick={() => setSelectedView({ title: "Case Description", data: c.caseDescription })} className="text-blue-500"><Maximize2 size={14} /></button>}</div></td>
                    <td className="px-6 py-3 text-sm">{c.investigatorName}</td>
                    <td className="px-6 py-3 text-sm">{c.assignedProsecutor?.name ? <div className="flex items-center gap-1"><UserCheck size={14} className="text-green-600" /><span>{c.assignedProsecutor.name}</span></div> : <span className="text-gray-400 text-xs">Not assigned</span>}</td>
                    <td className="px-6 py-3 text-sm">{c.accusedDetails?.length || 0}</td><td className="px-6 py-3 text-sm">{c.meetings?.length || 0}</td>
                    <td className="px-6 py-3 text-sm"><span className={`px-2 py-1 rounded text-xs ${c.referredToOAG ? "bg-blue-100 text-blue-800" : "bg-gray-100 text-gray-800"}`}>{c.referredToOAG ? "Referred to OAG" : "Draft"}</span></td>
                    <td className="px-6 py-3 text-sm">{c.attachments && c.attachments.length > 0 ? (<div className="flex flex-wrap gap-2">{c.attachments.slice(0,2).map((file,i) => (<div key={i} className="flex items-center gap-1 bg-gray-100 px-2 py-1 rounded"><FileText size={12} className="text-gray-500" /><span className="text-xs truncate max-w-[80px]" title={file}>{file.length > 15 ? file.substring(0,15)+"..." : file}</span><button onClick={() => handleViewFile(file)} className="text-blue-500"><Eye size={12} /></button><button onClick={() => handleDownloadFile(file)} className="text-green-500"><Download size={12} /></button></div>))}{c.attachments.length > 2 && <span className="text-xs text-gray-500">+{c.attachments.length-2}</span>}</div>) : <span className="text-gray-400 text-xs">No files</span>}</td>
                    <td className="px-6 py-3 text-sm flex gap-2">
                      <button onClick={() => handleEdit(c)} className="flex items-center gap-1 border rounded px-2 py-1 text-xs hover:border-black"><Pencil size={12} /> Edit</button>
                      {canRefer && !c.referredToOAG && <button onClick={() => handleReferToOAG(c)} className="flex items-center gap-1 border rounded px-2 py-1 text-xs hover:border-black text-blue-600"><Send size={12} /> Refer</button>}
                      {canAssign && c.referredToOAG && <button onClick={() => openAssignModal(c)} className="flex items-center gap-1 border rounded px-2 py-1 text-xs hover:border-black"><UserPlus size={12} /> Assign</button>}
                      <button onClick={() => handleDelete(c)} className="flex items-center gap-1 border rounded px-2 py-1 text-xs hover:border-black text-red-500"><Trash2 size={12} /> Delete</button>
                    </td>
                  </tr>
                ))}
                {paginated.length === 0 && <tr><td colSpan={10} className="text-center py-6 text-gray-500">No cases found</td></tr>}
              </tbody>
            </table>
          </div>

          {totalPages > 1 && (
            <div className="flex justify-end items-center gap-4 mt-5 text-sm">
              <button disabled={currentPage === 1} onClick={() => setCurrentPage(p => p-1)} className="font-semibold text-lg disabled:text-gray-400 hover:text-blue-600">&lt;</button>
              <span>Page {currentPage} of {totalPages}</span>
              <button disabled={currentPage === totalPages} onClick={() => setCurrentPage(p => p+1)} className="font-semibold text-lg disabled:text-gray-400 hover:text-blue-600">&gt;</button>
            </div>
          )}
        </main>
      </div>

      {/* Assignment Modal */}
      {showAssignModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-md">
          <div className="bg-white rounded-xl shadow-2xl max-w-md w-full">
            <div className="flex justify-between items-center p-6 border-b"><h3 className="text-xl font-semibold">Assign Prosecutor</h3><button onClick={() => setShowAssignModal(false)} className="text-gray-500 hover:text-gray-700"><X size={24} /></button></div>
            <div className="p-6"><p className="text-sm text-gray-600 mb-4">Case: <span className="font-medium">{selectedCase?.caseNo}</span></p><label className="block text-sm font-medium mb-1">Select Prosecutor</label><select value={selectedProsecutorId} onChange={(e) => setSelectedProsecutorId(e.target.value)} className="w-full border rounded px-3 py-2"><option value="">-- Choose prosecutor --</option>{prosecutors.map(p => <option key={p._id} value={p._id}>{p.name} ({p.email})</option>)}</select></div>
            <div className="flex justify-end gap-3 p-6 border-t bg-gray-50 rounded-b-xl"><button onClick={() => setShowAssignModal(false)} className="px-4 py-2 border rounded-md">Cancel</button><button onClick={handleAssign} className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700">Assign</button></div>
          </div>
        </div>
      )}

      {/* Accused Modal */}
      {showAccusedModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-md">
          <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full">
            <div className="flex justify-between items-center p-6 border-b"><h3 className="text-xl font-semibold">{editingAccusedIndex !== null ? "Edit Accused" : "Add Accused"}</h3><button onClick={() => setShowAccusedModal(false)} className="text-gray-500 hover:text-gray-700"><X size={24} /></button></div>
            <div className="p-6 space-y-4">
              <div className="grid md:grid-cols-2 gap-4">
                <div><label className="text-sm font-medium">Name *</label><input name="name" value={accusedFormData.name} onChange={handleAccusedFormChange} className="w-full border rounded px-3 py-2" /></div>
                <div><label className="text-sm font-medium">CID *</label><input name="cid" value={accusedFormData.cid} onChange={handleAccusedFormChange} className="w-full border rounded px-3 py-2" /></div>
                <div><label className="text-sm font-medium">Act *</label><select name="actId" value={getId(accusedFormData.actId)} onChange={handleAccusedFormChange} className="w-full border rounded px-3 py-2"><option value="">Select Act</option>{acts.map(act => <option key={act._id} value={act._id}>{act.name}</option>)}</select></div>
                <div><label className="text-sm font-medium">Section *</label><select name="sectionId" value={getId(accusedFormData.sectionId)} onChange={handleAccusedFormChange} disabled={!getId(accusedFormData.actId)} className="w-full border rounded px-3 py-2"><option value="">Select Section</option>{sections[getId(accusedFormData.actId)]?.map(sec => <option key={sec._id} value={sec._id}>{sec.name}</option>)}</select></div>
                <div><label className="text-sm font-medium">Charge *</label><select name="chargeId" value={getId(accusedFormData.chargeId)} onChange={handleAccusedFormChange} disabled={!getId(accusedFormData.sectionId)} className="w-full border rounded px-3 py-2"><option value="">Select Charge</option>{charges[getId(accusedFormData.sectionId)]?.map(ch => <option key={ch._id} value={ch._id}>{ch.name}</option>)}</select></div>
                <div><label className="text-sm font-medium">Counts</label><input type="number" name="counts" value={accusedFormData.counts} onChange={handleAccusedFormChange} className="w-full border rounded px-3 py-2" /></div>
                <div className="md:col-span-2"><label className="text-sm font-medium">Prayer</label><textarea name="prayer" value={accusedFormData.prayer} onChange={handleAccusedFormChange} rows={3} className="w-full border rounded px-3 py-2" /></div>
              </div>
            </div>
            <div className="flex justify-end gap-3 p-6 border-t bg-gray-50 rounded-b-xl"><button onClick={() => setShowAccusedModal(false)} className="px-4 py-2 border rounded-md">Cancel</button><button onClick={saveAccused} className="px-4 py-2 bg-blue-600 text-white rounded-md">{editingAccusedIndex !== null ? "Update" : "Add"}</button></div>
          </div>
        </div>
      )}

      {/* Meeting Modal */}
      {showMeetingModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-md">
          <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full">
            <div className="flex justify-between items-center p-6 border-b"><h3 className="text-xl font-semibold">{editingMeetingIndex !== null ? "Edit Meeting" : "Add Meeting"}</h3><button onClick={() => setShowMeetingModal(false)} className="text-gray-500 hover:text-gray-700"><X size={24} /></button></div>
            <div className="p-6 space-y-4">
              <div className="grid md:grid-cols-2 gap-4">
                <div><label className="text-sm font-medium">Case No. (auto)</label><input type="text" value={formData.caseNo} readOnly className="w-full border rounded px-3 py-2 bg-gray-100" /></div>
                <div><label className="text-sm font-medium">Date *</label><input type="date" name="date" value={meetingFormData.date} onChange={handleMeetingFormChange} className="w-full border rounded px-3 py-2" /></div>
                <div className="md:col-span-2"><label className="text-sm font-medium">Type *</label><input name="type" value={meetingFormData.type} onChange={handleMeetingFormChange} placeholder="e.g., Bilateral, Coordination, Review" className="w-full border rounded px-3 py-2" /></div>
                <div className="md:col-span-2"><label className="text-sm font-medium">Agenda</label><textarea name="agenda" value={meetingFormData.agenda} onChange={handleMeetingFormChange} rows={2} className="w-full border rounded px-3 py-2" /></div>
                <div className="md:col-span-2"><label className="text-sm font-medium">Participants</label><textarea name="participants" value={meetingFormData.participants} onChange={handleMeetingFormChange} rows={2} className="w-full border rounded px-3 py-2" /></div>
                <div className="md:col-span-2"><label className="text-sm font-medium">Minutes / Decisions</label><textarea name="minutes" value={meetingFormData.minutes} onChange={handleMeetingFormChange} rows={3} className="w-full border rounded px-3 py-2" /></div>
                <div className="md:col-span-2"><label className="text-sm font-medium">Attachments</label><div className="flex items-center gap-2"><label className="cursor-pointer text-blue-600"><Upload size={16} /><input type="file" multiple onChange={handleMeetingFileSelect} className="hidden" /></label><span className="text-xs text-gray-500">Upload relevant files for this meeting</span></div>
                  {meetingFormData.attachments.length > 0 && (<div className="mt-2 space-y-1"><p className="text-xs font-medium text-gray-600">Existing files:</p>{meetingFormData.attachments.map((fileName,i) => (<div key={i} className="flex justify-between items-center bg-blue-50 p-1 rounded"><span className="text-xs truncate">{fileName}</span><button onClick={() => removeMeetingExistingFile(fileName)} className="text-red-500"><X size={14} /></button></div>))}</div>)}
                  {meetingFormData.newFiles && meetingFormData.newFiles.length > 0 && (<div className="mt-2 space-y-1"><p className="text-xs font-medium text-gray-600">New files:</p>{meetingFormData.newFiles.map((file,i) => (<div key={i} className="flex justify-between items-center bg-green-50 p-1 rounded"><span className="text-xs truncate">{file.name}</span><button onClick={() => removeMeetingNewFile(i)} className="text-red-500"><X size={14} /></button></div>))}</div>)}
                </div>
              </div>
            </div>
            <div className="flex justify-end gap-3 p-6 border-t bg-gray-50 rounded-b-xl"><button onClick={() => setShowMeetingModal(false)} className="px-4 py-2 border rounded-md">Cancel</button><button onClick={saveMeeting} className="px-4 py-2 bg-blue-600 text-white rounded-md">{editingMeetingIndex !== null ? "Update" : "Add"}</button></div>
          </div>
        </div>
      )}

      {/* Long text modal */}
      {selectedView && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-md">
          <div className="bg-white rounded-xl shadow-2xl max-w-4xl w-full max-h-[80vh] flex flex-col">
            <div className="flex justify-between items-center p-6 border-b"><h3 className="text-xl font-semibold">{selectedView.title}</h3><button onClick={() => setSelectedView(null)} className="text-gray-500 hover:text-gray-700"><X size={24} /></button></div>
            <div className="flex-1 overflow-y-auto p-6"><div className="whitespace-pre-wrap text-gray-700 leading-relaxed">{selectedView.data}</div></div>
            <div className="flex justify-end p-6 border-t bg-gray-50 rounded-b-xl"><button onClick={() => setSelectedView(null)} className="px-4 py-2 bg-gray-800 text-white rounded-md hover:bg-gray-700">Close</button></div>
          </div>
        </div>
      )}

      <style>{`@keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } } @keyframes zoomIn { from { transform: scale(0.95); opacity: 0; } to { transform: scale(1); opacity: 1; } }`}</style>
    </>
  );
}