"use client";

import { useState, useEffect, ChangeEvent } from "react";
import { Trash2, Pencil, Save, Check, X, Plus, Upload, FileText, Download, Eye, Maximize2, Copy, Send, UserPlus, UserCheck } from "lucide-react";
import Sidebar from "@/components/Sidebar";

type Referral = {
  _id: string;
  year: string;
  ain: string;
  para_no: string;
  accountability_entity: string;
  audit_report: string;
  acc_observation: string;
  referral_no: string;
  referral_date: string;
  status: string;
  attachments?: string[];
  parent_ain?: string;
  referredToACC?: boolean;
  assignedTo?: { _id: string; name: string; email: string } | null;
  updates?: {
    status: string;
    reply: string;
    attachments: string[];
    updatedBy: { _id: string; name: string; email: string };
    createdAt: string;
  }[];
  createdAt: string;
  updatedAt: string;
};

type Notification = {
  message: string;
  type: "success" | "error";
};

type FormData = {
  year: string;
  ain: string;
  para_no: string;
  accountability_entity: string;
  audit_report: string;
  acc_observation: string;
  referral_no: string;
  referral_date: string;
};

type Officer = { _id: string; name: string; email: string; role: string };

export default function RaaAccReferralPage() {
  const [referrals, setReferrals] = useState<Referral[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [editData, setEditData] = useState<Referral | null>(null);
  const [search, setSearch] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [sortConfig, setSortConfig] = useState<{ key: keyof Referral | null; direction: "asc" | "desc" }>({ key: null, direction: "asc" });
  const [notification, setNotification] = useState<Notification | null>(null);
  const [attachments, setAttachments] = useState<File[]>([]);
  const [existingAttachments, setExistingAttachments] = useState<string[]>([]);
  const [selectedView, setSelectedView] = useState<{ type: 'audit' | 'acc' | 'entity', data: string } | null>(null);
  const [existingAIN, setExistingAIN] = useState<Referral | null>(null);
  const [showDuplicateWarning, setShowDuplicateWarning] = useState(false);
  const [isPrefilling, setIsPrefilling] = useState(false);

  // ACC workflow states
  const [currentUserAgency, setCurrentUserAgency] = useState("");
  const [isAgencyAdmin, setIsAgencyAdmin] = useState(false);
  const [currentUserId, setCurrentUserId] = useState("");
  const [isLoadingUser, setIsLoadingUser] = useState(true);
  const [officers, setOfficers] = useState<Officer[]>([]);
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [selectedReferral, setSelectedReferral] = useState<Referral | null>(null);
  const [selectedOfficerId, setSelectedOfficerId] = useState("");
  const [viewUpdateModalOpen, setViewUpdateModalOpen] = useState(false);
  const [currentViewReferral, setCurrentViewReferral] = useState<Referral | null>(null);
  const [updateForm, setUpdateForm] = useState({ status: "", reply: "" });
  const [updateAttachments, setUpdateAttachments] = useState<File[]>([]);

  const [formData, setFormData] = useState<FormData>({
    year: "",
    ain: "",
    para_no: "",
    accountability_entity: "",
    audit_report: "",
    acc_observation: "",
    referral_no: "",
    referral_date: "",
  });

  // ================== AUTH / ROLE ==================
  const getToken = () => localStorage.getItem("token");

  const deriveAgency = (email: string): string => {
    if (!email) return "";
    const domain = email.split("@")[1]?.toLowerCase();
    if (domain?.includes("oag") || domain?.includes("attorneygeneral")) return "Office of the Attorney General";
    if (domain?.includes("acc") || domain?.includes("anticorruption")) return "Anti-Corruption Commission";
    if (domain?.includes("raa") || domain?.includes("audit")) return "Royal Audit Authority";
    return "";
  };

  useEffect(() => {
    const token = getToken();
    let userEmail = "";
    if (token) {
      try {
        const payload = JSON.parse(atob(token.split(".")[1]));
        setCurrentUserId(payload.id || payload._id || payload.userId || "");
        setIsAgencyAdmin(payload.isAgencyAdmin === true);
        userEmail = payload.email || "";
      } catch (e) { console.error(e); }
    }

    const fetchUserProfile = async () => {
      try {
        const token = getToken();
        if (!token) return;
        const res = await fetch("/api/user/profile", {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (res.ok) {
          const profile = await res.json();
          setCurrentUserAgency(profile.agencyName || deriveAgency(profile.email || userEmail));
        } else {
          setCurrentUserAgency(deriveAgency(userEmail));
        }
      } catch (e) {
        setCurrentUserAgency(deriveAgency(userEmail));
      } finally {
        setIsLoadingUser(false);
      }
    };
    fetchUserProfile();
    fetchReferrals();
  }, []);

  // ================== FETCH REFERRALS ==================
  const fetchReferrals = async () => {
    try {
      const token = getToken();
      const res = await fetch("/api/raa-acc-referrals", {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      const data = await res.json();
      setReferrals(data);
    } catch (error) {
      showNotification((error as Error).message, "error");
    }
  };

  // ================== OFFICERS ==================
  const fetchOfficers = async () => {
    try {
      const token = getToken();
      if (!token) return;
      const res = await fetch("/api/users?role=Officer&agency=ACC", {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setOfficers(data);
      } else {
        const fallbackRes = await fetch("/api/users?role=Officer", {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (fallbackRes.ok) {
          const all = await fallbackRes.json();
          const accOfficers = all.filter((o: Officer) =>
            o.email?.toLowerCase().includes("acc") || o.email?.toLowerCase().includes("anticorruption")
          );
          setOfficers(accOfficers);
        }
      }
    } catch (error) {
      console.error("Failed to load officers", error);
    }
  };

  // ================== NOTIFICATION ==================
  const showNotification = (message: string, type: "success" | "error" = "success") => {
    setNotification({ message, type });
    setTimeout(() => setNotification(null), 3000);
  };

  // ================== CHECK EXISTING AIN ==================
  const checkExistingAIN = async (ain: string) => {
    if (!ain) return null;
    try {
      const token = getToken();
      const res = await fetch(`/api/raa-acc-referrals?ain=${ain}`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      const data = await res.json();
      return data.length > 0 ? data[0] : null;
    } catch (error) {
      console.error("Error checking AIN:", error);
      return null;
    }
  };

  const handleAINBlur = async () => {
    if (formData.ain && !editData && !isPrefilling) {
      const existing = await checkExistingAIN(formData.ain);
      if (existing) {
        setExistingAIN(existing);
        setShowDuplicateWarning(true);
        setIsPrefilling(true);
        setFormData({
          ...formData,
          year: existing.year,
          audit_report: existing.audit_report,
          referral_no: existing.referral_no,
          referral_date: existing.referral_date?.split("T")[0] || "",
        });
        if (existing.attachments) {
          setExistingAttachments(existing.attachments);
        }
        setIsPrefilling(false);
        showNotification(`AIN "${formData.ain}" found. Common fields pre-filled.`, "success");
      } else {
        setExistingAIN(null);
        setShowDuplicateWarning(false);
        setExistingAttachments([]);
      }
    }
  };

  // ================== FILE HANDLERS ==================
  const handleFileSelect = (e: ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length) setAttachments(prev => [...prev, ...files]);
    e.target.value = "";
  };

  const handleRemoveFile = (index: number) => {
    setAttachments(prev => prev.filter((_, i) => i !== index));
  };

  const handleRemoveExistingFile = async (fileName: string) => {
    if (!editData) return;
    try {
      const token = getToken();
      const res = await fetch("/api/raa-acc-referrals/delete-file", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ referralId: editData._id, fileName }),
      });
      if (!res.ok) throw new Error("Failed to delete file");
      setExistingAttachments(prev => prev.filter(f => f !== fileName));
      showNotification("File deleted successfully");
      await fetchReferrals();
    } catch (error) {
      showNotification((error as Error).message, "error");
    }
  };

  const handleViewFile = (fileName: string) => {
    window.open(`/uploads/raa-acc-referral/${fileName}`, "_blank");
  };

  const handleDownloadFile = (fileName: string) => {
    const link = document.createElement("a");
    link.href = `/uploads/raa-acc-referral/${fileName}`;
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // ================== FORM HANDLERS ==================
  const handleFormChange = (e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const resetForm = () => {
    setFormData({
      year: "",
      ain: "",
      para_no: "",
      accountability_entity: "",
      audit_report: "",
      acc_observation: "",
      referral_no: "",
      referral_date: "",
    });
    setAttachments([]);
    setExistingAttachments([]);
    setEditData(null);
    setShowForm(false);
    setExistingAIN(null);
    setShowDuplicateWarning(false);
    setIsPrefilling(false);
  };

  // ================== ADD / UPDATE ==================
  const handleAddOrUpdate = async () => {
    if (!formData.year || !formData.ain) {
      showNotification("Year and AIN are required", "error");
      return;
    }

    try {
      const body = new FormData();
      Object.keys(formData).forEach((key) => {
        if (formData[key as keyof FormData]) body.append(key, formData[key as keyof FormData]);
      });
      attachments.forEach(file => body.append("attachments", file));
      if (existingAttachments.length > 0) {
        body.append("existingAttachments", JSON.stringify(existingAttachments));
      }
      if (!editData && existingAIN) {
        body.append("parent_ain", existingAIN.ain);
      }

      const url = "/api/raa-acc-referrals";
      const method = editData ? "PUT" : "POST";
      if (editData) body.append("_id", editData._id);

      const token = getToken();
      const res = await fetch(url, {
        method,
        body,
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed to save");
      }
      await fetchReferrals();
      resetForm();
      showNotification(editData ? "Referral updated successfully" : "Referral added successfully");
    } catch (error) {
      showNotification((error as Error).message, "error");
    }
  };

  // ================== SUBMIT TO ACC ==================
  const handleSubmitToACC = async (ref: Referral) => {
    if (!confirm(`Submit referral "${ref.ain}" to ACC?`)) return;
    try {
      const token = getToken();
      const res = await fetch("/api/raa-acc-referrals/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ referralId: ref._id }),
      });
      if (!res.ok) throw new Error("Submission failed");
      await fetchReferrals();
      showNotification("Referral submitted to ACC");
    } catch (error) {
      showNotification((error as Error).message, "error");
    }
  };

  // ================== UPDATE (ACC) ==================
  const handleUpdateFormChange = (e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setUpdateForm(prev => ({ ...prev, [name]: value }));
  };

  const handleUpdateFileSelect = (e: ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length) setUpdateAttachments(prev => [...prev, ...files]);
    e.target.value = "";
  };

  const handleRemoveUpdateFile = (index: number) => {
    setUpdateAttachments(prev => prev.filter((_, i) => i !== index));
  };

  const submitUpdate = async () => {
    if (!currentViewReferral) return;
    if (!updateForm.status || !updateForm.reply) {
      showNotification("Status and reply are required", "error");
      return;
    }

    try {
      const body = new FormData();
      body.append("referralId", currentViewReferral._id);
      body.append("status", updateForm.status);
      body.append("reply", updateForm.reply);
      updateAttachments.forEach(file => body.append("attachments", file));

      const token = getToken();
      const res = await fetch("/api/raa-acc-referrals/update", {
        method: "POST",
        body,
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (!res.ok) throw new Error("Failed to add update");
      await fetchReferrals();
      setViewUpdateModalOpen(false);
      setUpdateForm({ status: "", reply: "" });
      setUpdateAttachments([]);
      showNotification("Update added successfully");
    } catch (error) {
      showNotification((error as Error).message, "error");
    }
  };

  // ================== ASSIGN ==================
  const openAssignModal = (ref: Referral) => {
    setSelectedReferral(ref);
    setSelectedOfficerId(ref.assignedTo?._id || "");
    fetchOfficers();
    setShowAssignModal(true);
  };

  const handleAssign = async () => {
    if (!selectedReferral || !selectedOfficerId) {
      showNotification("Please select an officer", "error");
      return;
    }
    try {
      const token = getToken();
      const res = await fetch("/api/raa-acc-referrals/assign", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ referralId: selectedReferral._id, officerId: selectedOfficerId }),
      });
      if (!res.ok) throw new Error("Assignment failed");
      await fetchReferrals();
      showNotification("Assigned successfully");
      setShowAssignModal(false);
    } catch (error) {
      showNotification((error as Error).message, "error");
    }
  };

  // ================== OPEN COMBINED VIEW & UPDATE ==================
  const openViewUpdateModal = (ref: Referral) => {
    setCurrentViewReferral(ref);
    setUpdateForm({ status: "", reply: "" });
    setUpdateAttachments([]);
    setViewUpdateModalOpen(true);
  };

  // ================== SORT & SEARCH ==================
  const handleSort = (key: keyof Referral) => {
    let direction: "asc" | "desc" = "asc";
    if (sortConfig.key === key && sortConfig.direction === "asc") direction = "desc";
    setSortConfig({ key, direction });
  };

  const handleSearchChange = (e: ChangeEvent<HTMLInputElement>) => {
    setSearch(e.target.value);
    setCurrentPage(1);
  };

  const handleRowsChange = (e: ChangeEvent<HTMLSelectElement>) => {
    setRowsPerPage(Number(e.target.value));
    setCurrentPage(1);
  };

  const filteredReferrals = referrals.filter(
    (ref) =>
      (ref.year?.toLowerCase() || "").includes(search.toLowerCase()) ||
      (ref.ain?.toLowerCase() || "").includes(search.toLowerCase()) ||
      (ref.referral_no?.toLowerCase() || "").includes(search.toLowerCase()) ||
      (ref.accountability_entity?.toLowerCase() || "").includes(search.toLowerCase())
  );

  const groupedReferrals = filteredReferrals.reduce((acc, ref) => {
    const ain = ref.ain;
    if (!acc[ain]) acc[ain] = [];
    acc[ain].push(ref);
    return acc;
  }, {} as Record<string, Referral[]>);

  const flattenedReferrals: (Referral | { isGroupHeader: true; ain: string; count: number })[] = [];
  Object.keys(groupedReferrals).forEach(ain => {
    const group = groupedReferrals[ain];
    if (group.length > 1) {
      flattenedReferrals.push({ isGroupHeader: true, ain, count: group.length });
      flattenedReferrals.push(...group);
    } else {
      flattenedReferrals.push(group[0]);
    }
  });

  const sortedFlattened = [...flattenedReferrals].sort((a, b) => {
    if ('isGroupHeader' in a && 'isGroupHeader' in b) return 0;
    if ('isGroupHeader' in a) return -1;
    if ('isGroupHeader' in b) return 1;
    if (!sortConfig.key) return 0;
    const key = sortConfig.key as keyof Referral;
    const aVal = a[key];
    const bVal = b[key];
    if (aVal == null && bVal == null) return 0;
    if (aVal == null) return 1;
    if (bVal == null) return -1;
    if (typeof aVal === 'string' && typeof bVal === 'string') {
      return sortConfig.direction === "asc" ? aVal.localeCompare(bVal) : -aVal.localeCompare(bVal);
    }
    if (aVal < bVal) return sortConfig.direction === "asc" ? -1 : 1;
    if (aVal > bVal) return sortConfig.direction === "asc" ? 1 : -1;
    return 0;
  });

  const totalPages = Math.ceil(sortedFlattened.length / rowsPerPage);
  const startIndex = (currentPage - 1) * rowsPerPage;
  const paginatedReferrals = sortedFlattened.slice(startIndex, startIndex + rowsPerPage);

  const getSortIcon = (key: keyof Referral) => {
    if (sortConfig.key !== key) return null;
    return sortConfig.direction === "asc" ? "↑" : "↓";
  };

  const getModalTitle = (type: string) => {
    switch(type) {
      case 'audit': return 'Audit Report';
      case 'acc': return 'ACC Observation';
      case 'entity': return 'Accountability Entity';
      default: return 'Details';
    }
  };

  const totalAttachmentsCount = existingAttachments.length + attachments.length;

  // Role detection
  const isRaaUser = currentUserAgency?.toLowerCase().includes("royal audit") || currentUserAgency?.toLowerCase().includes("raa");
  const isAccUser = currentUserAgency?.toLowerCase().includes("anti-corruption") || currentUserAgency?.toLowerCase().includes("acc");
  const isAccAdmin = isAccUser && isAgencyAdmin;

  if (isLoadingUser) {
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
    <>
      <div className={`flex ${selectedView ? 'overflow-hidden h-screen' : ''}`}>
        <Sidebar />
        <main className={`flex-1 p-6 ml-64 bg-gray-100 min-h-screen overflow-x-auto transition-all duration-300 ${selectedView ? 'blur-sm' : ''}`}>
          <div className="min-w-[1024px]">
            {/* Header */}
            <div className="flex justify-between items-center mb-6">
              <h1 className="text-2xl font-bold">RAA - ACC Referral</h1>
              {!showForm && isRaaUser && (
                <button
                  onClick={() => setShowForm(true)}
                  className="flex items-center gap-2 px-3 py-1.5 bg-white border rounded-md text-xs font-medium hover:border-black transition"
                >
                  <Plus size={14} />
                  Add Referral
                </button>
              )}
            </div>

            {/* Notification */}
            {notification && (
              <div
                className={`mb-4 px-4 py-2 rounded ${
                  notification.type === "success" ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"
                }`}
              >
                {notification.message}
              </div>
            )}

            {/* Add/Edit Form (RAA only) */}
            {showForm && isRaaUser && (
              <div className="bg-white shadow rounded-xl p-6 mb-6">
                <div className="flex justify-between mb-4">
                  <h2 className="text-lg font-semibold">{editData ? "Edit Referral" : "Add Referral"}</h2>
                  <button onClick={resetForm} className="text-xl text-gray-500">✕</button>
                </div>

                {showDuplicateWarning && existingAIN && (
                  <div className="mb-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                    <div className="flex items-start gap-3">
                      <Copy className="text-blue-600 mt-0.5" size={20} />
                      <div className="flex-1">
                        <h3 className="font-semibold text-blue-800 mb-1">Duplicate AIN Detected - Auto Pre-filled</h3>
                        <p className="text-sm text-blue-700">
                          AIN "{formData.ain}" already exists. Common fields have been auto‑filled.
                          Please add the unique information for this new referral.
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium">Year *</label>
                    <input type="text" name="year" value={formData.year} onChange={handleFormChange} className="w-full border rounded px-3 py-2 bg-gray-50" readOnly={!!showDuplicateWarning} />
                  </div>
                  <div>
                    <label className="text-sm font-medium">AIN *</label>
                    <input type="text" name="ain" value={formData.ain} onChange={handleFormChange} onBlur={handleAINBlur} className="w-full border rounded px-3 py-2" disabled={!!editData} />
                    {!editData && <p className="text-xs text-gray-500 mt-1">Enter AIN - system will auto-fill if exists</p>}
                  </div>
                  <div>
                    <label className="text-sm font-medium">Para No</label>
                    <input type="text" name="para_no" value={formData.para_no} onChange={handleFormChange} className="w-full border rounded px-3 py-2" placeholder="Enter new para number" />
                  </div>
                  <div>
                    <label className="text-sm font-medium">Accountability Entity</label>
                    <input type="text" name="accountability_entity" value={formData.accountability_entity} onChange={handleFormChange} className="w-full border rounded px-3 py-2" placeholder="Enter new entity" />
                  </div>
                  <div className="md:col-span-2">
                    <label className="text-sm font-medium">Audit Report</label>
                    <textarea name="audit_report" value={formData.audit_report} onChange={handleFormChange} rows={3} className="w-full border rounded px-3 py-2 bg-gray-50" readOnly={!!showDuplicateWarning} />
                  </div>
                  <div className="md:col-span-2">
                    <label className="text-sm font-medium">ACC Observation</label>
                    <textarea name="acc_observation" value={formData.acc_observation} onChange={handleFormChange} rows={3} className="w-full border rounded px-3 py-2" placeholder="Enter new ACC observation" />
                  </div>
                  <div>
                    <label className="text-sm font-medium">Referral No</label>
                    <input type="text" name="referral_no" value={formData.referral_no} onChange={handleFormChange} className="w-full border rounded px-3 py-2 bg-gray-50" readOnly={!!showDuplicateWarning} />
                  </div>
                  <div>
                    <label className="text-sm font-medium">Referral Date</label>
                    <input type="date" name="referral_date" value={formData.referral_date} onChange={handleFormChange} className="w-full border rounded px-3 py-2 bg-gray-50" readOnly={!!showDuplicateWarning} />
                  </div>
                </div>

                <div className="mt-4">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <label className="text-sm font-medium">Attach Files (optional)</label>
                      <label className="cursor-pointer text-gray-500 hover:text-gray-700 transition">
                        <Upload size={16} />
                        <input type="file" multiple onChange={handleFileSelect} className="hidden" />
                      </label>
                    </div>
                    {totalAttachmentsCount > 0 && <span className="text-xs text-gray-500">Total: {totalAttachmentsCount} file(s)</span>}
                  </div>
                  {existingAttachments.length > 0 && (
                    <div className="space-y-2 mt-3">
                      <label className="text-xs font-medium text-gray-500">
                        {showDuplicateWarning ? 'Pre-filled Files from Existing Record (will be copied):' : 'Existing Files:'}
                      </label>
                      {existingAttachments.map((fileName, idx) => (
                        <div key={idx} className="flex justify-between items-center bg-blue-50 px-3 py-2 rounded-lg text-sm border border-blue-200">
                          <div className="flex items-center gap-2">
                            <FileText size={14} className="text-blue-500" />
                            <span className="text-gray-700">{fileName}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <button onClick={() => handleViewFile(fileName)} className="text-blue-500 hover:text-blue-700"><Eye size={14} /></button>
                            <button onClick={() => handleDownloadFile(fileName)} className="text-green-500 hover:text-green-700"><Download size={14} /></button>
                            {editData && <button onClick={() => handleRemoveExistingFile(fileName)} className="text-red-500 hover:text-red-700"><X size={14} /></button>}
                          </div>
                        </div>
                      ))}
                      {!editData && showDuplicateWarning && <p className="text-xs text-green-600 mt-1">✓ These {existingAttachments.length} file(s) will be copied</p>}
                    </div>
                  )}
                  {attachments.length > 0 && (
                    <div className="space-y-2 mt-3">
                      <label className="text-xs font-medium text-gray-500">New Files to Add:</label>
                      {attachments.map((file, idx) => (
                        <div key={idx} className="flex justify-between items-center bg-green-50 px-3 py-2 rounded-lg text-sm border border-green-200">
                          <div className="flex items-center gap-2">
                            <FileText size={14} className="text-green-600" />
                            <span className="text-gray-700">{file.name}</span>
                            <span className="text-xs text-gray-500">({(file.size / 1024).toFixed(1)} KB)</span>
                          </div>
                          <button onClick={() => handleRemoveFile(idx)} className="text-red-500 hover:text-red-700"><X size={14} /></button>
                        </div>
                      ))}
                    </div>
                  )}
                  {totalAttachmentsCount > 0 && (
                    <div className="mt-3 p-3 bg-gray-50 rounded-lg border border-gray-200">
                      <p className="text-sm font-medium text-gray-700">Summary:</p>
                      <ul className="text-xs text-gray-600 mt-1 space-y-1">
                        {existingAttachments.length > 0 && <li>• {existingAttachments.length} existing file(s) from original record</li>}
                        {attachments.length > 0 && <li>• {attachments.length} new file(s) being added</li>}
                        <li className="text-green-600 font-medium mt-1">Total: {totalAttachmentsCount} file(s) will be saved</li>
                      </ul>
                    </div>
                  )}
                </div>

                <div className="flex justify-end gap-3 mt-5">
                  <button onClick={resetForm} className="flex items-center gap-2 px-3 py-1.5 border rounded-md text-xs font-medium hover:border-black transition"><X size={14} /> Cancel</button>
                  <button onClick={handleAddOrUpdate} className="flex items-center gap-2 px-3 py-1.5 border rounded-md text-xs font-medium hover:border-black transition">
                    {editData ? <Check size={14} /> : <Save size={14} />}
                    {editData ? "Update" : "Save"}
                  </button>
                </div>
              </div>
            )}

            {/* Toolbar */}
            <div className="flex justify-between items-center mb-4">
              <input
                type="text"
                value={search}
                onChange={handleSearchChange}
                placeholder="Search by Year, AIN, Referral No, or Entity..."
                className="w-64 px-4 py-2 border rounded focus:ring-2 focus:ring-blue-400 outline-none"
              />
              <div className="flex items-center gap-2 text-sm">
                <span>Show</span>
                <select value={rowsPerPage} onChange={handleRowsChange} className="border rounded px-2 py-1">
                  <option value={10}>10</option>
                  <option value={20}>20</option>
                  <option value={30}>30</option>
                  <option value={40}>40</option>
                </select>
                <span>entries</span>
              </div>
            </div>

            {/* Table */}
            <div className="bg-white shadow rounded-lg overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-sm font-medium uppercase">S/N</th>
                    <th onClick={() => handleSort("year")} className="px-4 py-3 text-left text-sm font-medium uppercase cursor-pointer select-none hover:bg-gray-100">Year {getSortIcon("year")}</th>
                    <th onClick={() => handleSort("ain")} className="px-4 py-3 text-left text-sm font-medium uppercase cursor-pointer select-none hover:bg-gray-100">AIN {getSortIcon("ain")}</th>
                    <th onClick={() => handleSort("para_no")} className="px-4 py-3 text-left text-sm font-medium uppercase cursor-pointer select-none hover:bg-gray-100">Para No {getSortIcon("para_no")}</th>
                    <th className="px-4 py-3 text-left text-sm font-medium uppercase">Entity</th>
                    <th className="px-4 py-3 text-left text-sm font-medium uppercase">Audit Report</th>
                    <th className="px-4 py-3 text-left text-sm font-medium uppercase">ACC Observation</th>
                    <th onClick={() => handleSort("referral_no")} className="px-4 py-3 text-left text-sm font-medium uppercase cursor-pointer select-none hover:bg-gray-100">Referral No {getSortIcon("referral_no")}</th>
                    <th onClick={() => handleSort("referral_date")} className="px-4 py-3 text-left text-sm font-medium uppercase cursor-pointer select-none hover:bg-gray-100">Referral Date {getSortIcon("referral_date")}</th>
                    <th onClick={() => handleSort("status")} className="px-4 py-3 text-left text-sm font-medium uppercase cursor-pointer select-none hover:bg-gray-100">Status {getSortIcon("status")}</th>
                    <th className="px-4 py-3 text-left text-sm font-medium uppercase">Assigned To</th>
                    <th className="px-4 py-3 text-left text-sm font-medium uppercase">Attachments</th>
                    <th className="px-4 py-3 text-left text-sm font-medium uppercase">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {paginatedReferrals.map((item, idx) => {
                    if ('isGroupHeader' in item && item.isGroupHeader) {
                      return (
                        <tr key={`group-${item.ain}`} className="bg-blue-50">
                          <td colSpan={13} className="px-4 py-2 text-sm font-semibold text-blue-800">
                            <div className="flex items-center gap-2">
                              <Copy size={14} />
                              <span>AIN: {item.ain} - {item.count} related records</span>
                            </div>
                          </td>
                        </tr>
                      );
                    }
                    const ref = item as Referral;
                    const isSubmitted = ref.referredToACC === true;
                    const isAssigned = !!ref.assignedTo;
                    const canEdit = isRaaUser && !isSubmitted;
                    const canDelete = isRaaUser && !isSubmitted;
                    const canSubmit = isRaaUser && !isSubmitted;
                    const canUpdate = isAccUser && isSubmitted;
                    const canAssign = isAccAdmin && isSubmitted && !isAssigned;
                    const showViewUpdate = isAccUser && isSubmitted;
                    const showViewOnly = !showViewUpdate;

                    return (
                      <tr key={ref._id} className="hover:bg-gray-100 transition-colors">
                        <td className="px-4 py-3 text-sm">{startIndex + idx + 1}</td>
                        <td className="px-4 py-3 text-sm">{ref.year}</td>
                        <td className="px-4 py-3 text-sm font-mono">{ref.ain}</td>
                        <td className="px-4 py-3 text-sm">{ref.para_no}</td>
                        <td className="px-4 py-3 text-sm">
                          <div className="flex items-center gap-2">
                            <span className="text-gray-600 max-w-[150px] truncate">{ref.accountability_entity?.substring(0, 40) || '-'}</span>
                            {ref.accountability_entity && ref.accountability_entity.length > 40 && (
                              <button onClick={() => setSelectedView({ type: 'entity', data: ref.accountability_entity })} className="text-blue-500 hover:text-blue-700"><Maximize2 size={14} /></button>
                            )}
                          </div>
                        </td>
                        <td className="px-4 py-3 text-sm">
                          <div className="flex items-center gap-2">
                            <span className="text-gray-600 max-w-[200px] truncate">{ref.audit_report?.substring(0, 50) || '-'}</span>
                            {ref.audit_report && ref.audit_report.length > 50 && (
                              <button onClick={() => setSelectedView({ type: 'audit', data: ref.audit_report })} className="text-blue-500 hover:text-blue-700"><Maximize2 size={14} /></button>
                            )}
                          </div>
                        </td>
                        <td className="px-4 py-3 text-sm">
                          <div className="flex items-center gap-2">
                            <span className="text-gray-600 max-w-[200px] truncate">{ref.acc_observation?.substring(0, 50) || '-'}</span>
                            {ref.acc_observation && ref.acc_observation.length > 50 && (
                              <button onClick={() => setSelectedView({ type: 'acc', data: ref.acc_observation })} className="text-blue-500 hover:text-blue-700"><Maximize2 size={14} /></button>
                            )}
                          </div>
                        </td>
                        <td className="px-4 py-3 text-sm">{ref.referral_no}</td>
                        <td className="px-4 py-3 text-sm">{ref.referral_date?.split("T")[0]}</td>
                        <td className="px-4 py-3 text-sm">
                          <span className={`px-2 py-1 rounded-full text-xs whitespace-nowrap ${
                            ref.status === "Pending" ? "bg-yellow-100 text-yellow-800" :
                            ref.status === "Ongoing" ? "bg-blue-100 text-blue-800" :
                            ref.status === "Completed" ? "bg-green-100 text-green-800" :
                            "bg-gray-100 text-gray-800"
                          }`}>
                            {ref.status}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-sm">
                          {ref.assignedTo ? (
                            <div className="flex items-center gap-1">
                              <UserCheck size={14} className="text-green-600" />
                              <span>{ref.assignedTo.name}</span>
                            </div>
                          ) : (
                            <span className="text-gray-400 text-xs">Not assigned</span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-sm">
                          {ref.attachments && ref.attachments.length > 0 ? (
                            <div className="flex flex-wrap gap-2">
                              {ref.attachments.slice(0, 2).map((fileName, idx) => (
                                <div key={idx} className="flex items-center gap-1 bg-gray-100 px-2 py-1 rounded">
                                  <FileText size={12} className="text-gray-500" />
                                  <span className="text-xs truncate max-w-[80px]" title={fileName}>{fileName.length > 15 ? fileName.substring(0, 15) + '...' : fileName}</span>
                                  <button onClick={() => handleViewFile(fileName)} className="text-blue-500 hover:text-blue-700"><Eye size={12} /></button>
                                  <button onClick={() => handleDownloadFile(fileName)} className="text-green-500 hover:text-green-700"><Download size={12} /></button>
                                </div>
                              ))}
                              {ref.attachments.length > 2 && <span className="text-xs text-gray-500">+{ref.attachments.length - 2}</span>}
                            </div>
                          ) : <span className="text-gray-400 text-xs">No files</span>}
                        </td>
                        <td className="px-4 py-3 text-sm">
                          <div className="flex flex-wrap gap-2">
                            {/* VIEW & UPDATE (for ACC, submitted) */}
                            {showViewUpdate && (
                              <button onClick={() => openViewUpdateModal(ref)} className="flex items-center gap-1 border rounded px-2 py-1 text-xs hover:border-black text-purple-600">
                                <Eye size={12} /> View & Update
                              </button>
                            )}
                            {/* VIEW ONLY (for RAA or not submitted) */}
                            {showViewOnly && (
                              <button onClick={() => openViewUpdateModal(ref)} className="flex items-center gap-1 border rounded px-2 py-1 text-xs hover:border-black">
                                <Eye size={12} /> View
                              </button>
                            )}
                            {/* Edit (RAA only if not submitted) */}
                            {canEdit && (
                              <button onClick={() => {
                                setEditData(ref);
                                setFormData({
                                  year: ref.year,
                                  ain: ref.ain,
                                  para_no: ref.para_no,
                                  accountability_entity: ref.accountability_entity,
                                  audit_report: ref.audit_report,
                                  acc_observation: ref.acc_observation,
                                  referral_no: ref.referral_no,
                                  referral_date: ref.referral_date?.split("T")[0] || "",
                                });
                                setExistingAttachments(ref.attachments || []);
                                setAttachments([]);
                                setShowForm(true);
                              }} className="flex items-center gap-1 border rounded px-2 py-1 text-xs hover:border-black">
                                <Pencil size={12} /> Edit
                              </button>
                            )}
                            {/* Submit to ACC (RAA only if not submitted) */}
                            {canSubmit && (
                              <button onClick={() => handleSubmitToACC(ref)} className="flex items-center gap-1 border rounded px-2 py-1 text-xs hover:border-black text-blue-600">
                                <Send size={12} /> Submit
                              </button>
                            )}
                            {/* Assign (ACC admin only if submitted and not assigned) */}
                            {canAssign && (
                              <button onClick={() => openAssignModal(ref)} className="flex items-center gap-1 border rounded px-2 py-1 text-xs hover:border-black">
                                <UserPlus size={12} /> Assign
                              </button>
                            )}
                            {/* Delete (RAA only if not submitted) */}
                            {canDelete && (
                              <button onClick={() => handleDelete(ref)} className="flex items-center gap-1 border rounded px-2 py-1 text-xs hover:border-black text-red-500">
                                <Trash2 size={12} /> Delete
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                  {paginatedReferrals.length === 0 && (
                    <tr><td colSpan={13} className="text-center py-6 text-gray-500">No records found</td></tr>
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex justify-end items-center gap-4 mt-5 text-sm">
                <button disabled={currentPage === 1} onClick={() => setCurrentPage(p => p-1)} className="font-semibold text-lg disabled:text-gray-400 hover:text-blue-600">&lt;</button>
                <span>Page {currentPage} of {totalPages}</span>
                <button disabled={currentPage === totalPages} onClick={() => setCurrentPage(p => p+1)} className="font-semibold text-lg disabled:text-gray-400 hover:text-blue-600">&gt;</button>
              </div>
            )}
          </div>
        </main>
      </div>

      {/* --- COMBINED VIEW & UPDATE MODAL --- */}
      {viewUpdateModalOpen && currentViewReferral && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-md overflow-y-auto">
          <div className="bg-white rounded-xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b p-4 flex justify-between items-center">
              <h3 className="text-xl font-semibold">
                {isAccUser && currentViewReferral.referredToACC ? "View & Update Referral" : "Referral Details"}
              </h3>
              <button onClick={() => setViewUpdateModalOpen(false)} className="text-gray-500 hover:text-gray-700"><X size={24} /></button>
            </div>
            <div className="p-6 space-y-6">
              {/* Referral details */}
              <div className="grid md:grid-cols-2 gap-4">
                <div><label className="text-sm font-medium">Year</label><p className="mt-1">{currentViewReferral.year}</p></div>
                <div><label className="text-sm font-medium">AIN</label><p className="mt-1">{currentViewReferral.ain}</p></div>
                <div><label className="text-sm font-medium">Para No</label><p className="mt-1">{currentViewReferral.para_no}</p></div>
                <div><label className="text-sm font-medium">Accountability Entity</label><p className="mt-1">{currentViewReferral.accountability_entity}</p></div>
                <div className="md:col-span-2"><label className="text-sm font-medium">Audit Report</label><p className="mt-1 whitespace-pre-wrap">{currentViewReferral.audit_report}</p></div>
                <div className="md:col-span-2"><label className="text-sm font-medium">ACC Observation</label><p className="mt-1 whitespace-pre-wrap">{currentViewReferral.acc_observation}</p></div>
                <div><label className="text-sm font-medium">Referral No</label><p className="mt-1">{currentViewReferral.referral_no}</p></div>
                <div><label className="text-sm font-medium">Referral Date</label><p className="mt-1">{currentViewReferral.referral_date?.split("T")[0]}</p></div>
                <div><label className="text-sm font-medium">Status</label><p className="mt-1">{currentViewReferral.status}</p></div>
                <div><label className="text-sm font-medium">Assigned To</label><p className="mt-1">{currentViewReferral.assignedTo?.name || "Not assigned"}</p></div>
              </div>

              {/* Attachments */}
              {currentViewReferral.attachments && currentViewReferral.attachments.length > 0 && (
                <div>
                  <h4 className="font-semibold mb-2">Attachments</h4>
                  <div className="space-y-2">
                    {currentViewReferral.attachments.map((file, idx) => (
                      <div key={idx} className="flex items-center gap-2 bg-gray-50 p-2 rounded">
                        <FileText size={14} className="text-gray-500" />
                        <span>{file}</span>
                        <button onClick={() => handleViewFile(file)} className="text-blue-500 ml-auto"><Eye size={14} /></button>
                        <button onClick={() => handleDownloadFile(file)} className="text-green-500"><Download size={14} /></button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Updates timeline */}
              {currentViewReferral.updates && currentViewReferral.updates.length > 0 && (
                <div>
                  <h4 className="font-semibold mb-2">Updates</h4>
                  <div className="space-y-4">
                    {currentViewReferral.updates.map((upd, idx) => (
                      <div key={idx} className="border-l-4 border-blue-500 pl-4 py-2 bg-gray-50 rounded">
                        <div className="flex justify-between">
                          <span className="font-medium">Status: {upd.status}</span>
                          <span className="text-xs text-gray-500">{new Date(upd.createdAt).toLocaleString()}</span>
                        </div>
                        <p className="text-sm mt-1">{upd.reply}</p>
                        {upd.attachments && upd.attachments.length > 0 && (
                          <div className="mt-2 flex flex-wrap gap-2">
                            {upd.attachments.map((file) => (
                              <div key={file} className="flex items-center gap-1 bg-blue-50 px-2 py-1 rounded">
                                <FileText size={12} className="text-blue-500" />
                                <span className="text-xs">{file}</span>
                                <button onClick={() => handleViewFile(file)} className="text-blue-500"><Eye size={12} /></button>
                                <button onClick={() => handleDownloadFile(file)} className="text-green-500"><Download size={12} /></button>
                              </div>
                            ))}
                          </div>
                        )}
                        <div className="text-xs text-gray-400 mt-1">by {upd.updatedBy.name}</div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Update form (ACC only) */}
              {isAccUser && currentViewReferral.referredToACC && (
                <div className="border-t pt-4 mt-6">
                  <h4 className="font-semibold mb-3">Add Update</h4>
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium mb-1">Status *</label>
                      <select name="status" value={updateForm.status} onChange={handleUpdateFormChange} className="w-full border rounded px-3 py-2">
                        <option value="">Select status</option>
                        <option value="Pending">Pending</option>
                        <option value="Ongoing">Ongoing</option>
                        <option value="Completed">Completed</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-1">Reply *</label>
                      <textarea name="reply" value={updateForm.reply} onChange={handleUpdateFormChange} rows={4} className="w-full border rounded px-3 py-2" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-1">Attachments (optional)</label>
                      <div className="flex items-center gap-2">
                        <label className="cursor-pointer text-blue-600">
                          <Upload size={16} />
                          <input type="file" multiple onChange={handleUpdateFileSelect} className="hidden" />
                        </label>
                        <span className="text-xs text-gray-500">Upload additional files</span>
                      </div>
                      {updateAttachments.length > 0 && (
                        <div className="mt-2 space-y-1">
                          {updateAttachments.map((file, idx) => (
                            <div key={idx} className="flex justify-between items-center bg-gray-50 p-2 rounded">
                              <span className="text-sm">{file.name}</span>
                              <button onClick={() => handleRemoveUpdateFile(idx)} className="text-red-500"><X size={14} /></button>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                    <div className="flex justify-end">
                      <button onClick={submitUpdate} className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700">Add Update</button>
                    </div>
                  </div>
                </div>
              )}
            </div>
            <div className="sticky bottom-0 bg-gray-50 p-4 text-right border-t">
              <button onClick={() => setViewUpdateModalOpen(false)} className="px-4 py-2 bg-gray-800 text-white rounded-md hover:bg-gray-700">Close</button>
            </div>
          </div>
        </div>
      )}

      {/* Assign Modal (ACC admin) */}
      {showAssignModal && selectedReferral && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-md">
          <div className="bg-white rounded-xl shadow-2xl max-w-md w-full">
            <div className="flex justify-between items-center p-6 border-b">
              <h3 className="text-xl font-semibold">Assign to ACC Officer</h3>
              <button onClick={() => setShowAssignModal(false)} className="text-gray-500 hover:text-gray-700"><X size={24} /></button>
            </div>
            <div className="p-6">
              <p className="text-sm text-gray-600 mb-4">Referral: <span className="font-medium">{selectedReferral.ain}</span></p>
              <label className="block text-sm font-medium mb-1">Select Officer</label>
              <select value={selectedOfficerId} onChange={(e) => setSelectedOfficerId(e.target.value)} className="w-full border rounded px-3 py-2">
                <option value="">-- Choose officer --</option>
                {officers.map((o) => <option key={o._id} value={o._id}>{o.name} ({o.email})</option>)}
              </select>
            </div>
            <div className="flex justify-end gap-3 p-6 border-t bg-gray-50 rounded-b-xl">
              <button onClick={() => setShowAssignModal(false)} className="px-4 py-2 border rounded-md">Cancel</button>
              <button onClick={handleAssign} className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700">Assign</button>
            </div>
          </div>
        </div>
      )}

      {/* Modal for long text (unchanged) */}
      {selectedView && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-md" style={{ animation: 'fadeIn 0.2s ease-out' }}>
          <div className="absolute inset-0 bg-black/50 backdrop-blur-md" onClick={() => setSelectedView(null)} />
          <div className="relative bg-white rounded-xl shadow-2xl max-w-4xl w-full max-h-[80vh] flex flex-col" style={{ animation: 'zoomIn 0.2s ease-out' }}>
            <div className="flex justify-between items-center p-6 border-b">
              <h3 className="text-xl font-semibold">{getModalTitle(selectedView.type)}</h3>
              <button onClick={() => setSelectedView(null)} className="text-gray-500 hover:text-gray-700"><X size={24} /></button>
            </div>
            <div className="flex-1 overflow-y-auto p-6"><div className="whitespace-pre-wrap text-gray-700 leading-relaxed">{selectedView.data || 'No content available'}</div></div>
            <div className="flex justify-end p-6 border-t bg-gray-50 rounded-b-xl">
              <button onClick={() => setSelectedView(null)} className="px-4 py-2 bg-gray-800 text-white rounded-md hover:bg-gray-700">Close</button>
            </div>
          </div>
        </div>
      )}

      <style>{`
        @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
        @keyframes zoomIn { from { transform: scale(0.95); opacity: 0; } to { transform: scale(1); opacity: 1; } }
      `}</style>
    </>
  );

  // ================== DELETE (helper) ==================
  async function handleDelete(ref: Referral) {
    if (!confirm(`Are you sure you want to delete "${ref.ain}"?`)) return;
    try {
      const token = getToken();
      const res = await fetch("/api/raa-acc-referrals", {
        method: "DELETE",
        body: JSON.stringify({ _id: ref._id }),
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error("Failed to delete");
      await fetchReferrals();
      showNotification("Referral deleted successfully");
    } catch (error) {
      showNotification((error as Error).message, "error");
    }
  }
}