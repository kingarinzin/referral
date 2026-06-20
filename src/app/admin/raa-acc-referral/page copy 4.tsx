"use client";

import { useState, useEffect, ChangeEvent } from "react";
import { Trash2, Pencil, Save, Check, X, Plus, Upload, FileText, Download, Eye, Send, UserPlus, UserCheck } from "lucide-react";
import Sidebar from "@/components/Sidebar";

type Referral = {
  _id: string;
  year: string;
  crn: string;
  alleged: string;
  sharing_letter_no: string;
  referral_date: string;
  status: string;
  attachments?: string[];
  referredToRAA?: boolean;
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
  crn: string;
  alleged: string;
  sharing_letter_no: string;
  referral_date: string;
};

type Officer = { _id: string; name: string; email: string; role: string };

export default function AccRaaReferralPage() {
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

  // RAA workflow states
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
    crn: "",
    alleged: "",
    sharing_letter_no: "",
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
      const res = await fetch("/api/acc-raa-referrals", {
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
      const res = await fetch("/api/users?role=Officer&agency=RAA", {
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
          const raaOfficers = all.filter((o: Officer) =>
            o.email?.toLowerCase().includes("raa") || o.email?.toLowerCase().includes("audit")
          );
          setOfficers(raaOfficers);
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

  // ================== FILE HANDLERS (main form) ==================
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
      const res = await fetch("/api/acc-raa-referrals/delete-file", {
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
    window.open(`/uploads/acc-raa-referral/${fileName}`, "_blank");
  };

  const handleDownloadFile = (fileName: string) => {
    const link = document.createElement("a");
    link.href = `/uploads/acc-raa-referral/${fileName}`;
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // ================== FORM HANDLERS ==================
  const handleFormChange = (e: ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const resetForm = () => {
    setFormData({
      year: "",
      crn: "",
      alleged: "",
      sharing_letter_no: "",
      referral_date: "",
    });
    setAttachments([]);
    setExistingAttachments([]);
    setEditData(null);
    setShowForm(false);
  };

  // ================== ADD / UPDATE ==================
  const handleAddOrUpdate = async () => {
    if (!formData.year || !formData.crn) {
      showNotification("Year and CRN are required", "error");
      return;
    }

    try {
      const body = new FormData();
      Object.keys(formData).forEach((key) => {
        if (formData[key as keyof FormData]) body.append(key, formData[key as keyof FormData]);
      });
      attachments.forEach(file => body.append("attachments", file));
      if (editData && existingAttachments.length > 0) {
        body.append("existingAttachments", JSON.stringify(existingAttachments));
      }

      const url = "/api/acc-raa-referrals";
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

  // ================== SUBMIT TO RAA ==================
  const handleSubmitToRAA = async (ref: Referral) => {
    if (!confirm(`Submit referral "${ref.crn}" to RAA?`)) return;
    try {
      const token = getToken();
      const res = await fetch("/api/acc-raa-referrals/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ referralId: ref._id }),
      });
      if (!res.ok) throw new Error("Submission failed");
      await fetchReferrals();
      showNotification("Referral submitted to RAA");
    } catch (error) {
      showNotification((error as Error).message, "error");
    }
  };

  // ================== UPDATE (RAA) - called from combined modal ==================
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
      const res = await fetch("/api/acc-raa-referrals/update", {
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
      const res = await fetch("/api/acc-raa-referrals/assign", {
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
      (ref.crn?.toLowerCase() || "").includes(search.toLowerCase()) ||
      (ref.alleged?.toLowerCase() || "").includes(search.toLowerCase())
  );

  const sortedReferrals = [...filteredReferrals].sort((a, b) => {
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

  const totalPages = Math.ceil(sortedReferrals.length / rowsPerPage);
  const startIndex = (currentPage - 1) * rowsPerPage;
  const paginatedReferrals = sortedReferrals.slice(startIndex, startIndex + rowsPerPage);

  const getSortIcon = (key: keyof Referral) => {
    if (sortConfig.key !== key) return null;
    return sortConfig.direction === "asc" ? "↑" : "↓";
  };

  // Role detection
  const isAccUser = currentUserAgency?.toLowerCase().includes("anti-corruption") || currentUserAgency?.toLowerCase().includes("acc");
  const isRaaUser = currentUserAgency?.toLowerCase().includes("royal audit") || currentUserAgency?.toLowerCase().includes("raa");
  const isRaaAdmin = isRaaUser && isAgencyAdmin;

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
    <div className="flex">
      <Sidebar />
      <main className="flex-1 p-6 ml-64 bg-gray-100 min-h-screen">
        {/* Header */}
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold">ACC - RAA Referral</h1>
          {!showForm && isAccUser && (
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

        {/* Add/Edit Form (ACC only) */}
        {showForm && isAccUser && (
          <div className="bg-white shadow rounded-xl p-6 mb-6">
            <div className="flex justify-between mb-4">
              <h2 className="text-lg font-semibold">{editData ? "Edit Referral" : "Add Referral"}</h2>
              <button onClick={resetForm} className="text-xl text-gray-500">✕</button>
            </div>

            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium">Year</label>
                <input type="text" name="year" value={formData.year} onChange={handleFormChange} className="w-full border rounded px-3 py-2" />
              </div>
              <div>
                <label className="text-sm font-medium">CRN</label>
                <input type="text" name="crn" value={formData.crn} onChange={handleFormChange} className="w-full border rounded px-3 py-2" />
              </div>
              <div>
                <label className="text-sm font-medium">Alleged</label>
                <input type="text" name="alleged" value={formData.alleged} onChange={handleFormChange} className="w-full border rounded px-3 py-2" />
              </div>
              <div>
                <label className="text-sm font-medium">Sharing Letter No</label>
                <input type="text" name="sharing_letter_no" value={formData.sharing_letter_no} onChange={handleFormChange} className="w-full border rounded px-3 py-2" />
              </div>
              <div>
                <label className="text-sm font-medium">Referral Date</label>
                <input type="date" name="referral_date" value={formData.referral_date} onChange={handleFormChange} className="w-full border rounded px-3 py-2" />
              </div>
            </div>

            <div className="mt-4">
              <div className="flex items-center gap-2 mb-2">
                <label className="text-sm font-medium">Attach Files (optional)</label>
                <label className="cursor-pointer text-gray-500 hover:text-gray-700 transition">
                  <Upload size={16} />
                  <input type="file" multiple onChange={handleFileSelect} className="hidden" />
                </label>
              </div>
              {existingAttachments.length > 0 && (
                <div className="space-y-2 mt-3">
                  <label className="text-xs font-medium text-gray-500">Existing Files:</label>
                  {existingAttachments.map((fileName, idx) => (
                    <div key={idx} className="flex justify-between items-center bg-blue-50 px-3 py-2 rounded-lg text-sm border border-blue-200">
                      <div className="flex items-center gap-2">
                        <FileText size={14} className="text-blue-500" />
                        <span className="text-gray-700">{fileName}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <button onClick={() => handleViewFile(fileName)} className="text-blue-500 hover:text-blue-700"><Eye size={14} /></button>
                        <button onClick={() => handleDownloadFile(fileName)} className="text-green-500 hover:text-green-700"><Download size={14} /></button>
                        <button onClick={() => handleRemoveExistingFile(fileName)} className="text-red-500 hover:text-red-700"><X size={14} /></button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
              {attachments.length > 0 && (
                <div className="space-y-2 mt-3">
                  <label className="text-xs font-medium text-gray-500">New Files:</label>
                  {attachments.map((file, idx) => (
                    <div key={idx} className="flex justify-between items-center bg-gray-50 px-3 py-2 rounded-lg text-sm border">
                      <div className="flex items-center gap-2">
                        <FileText size={14} className="text-gray-500" />
                        <span className="text-gray-700">{file.name}</span>
                      </div>
                      <button onClick={() => handleRemoveFile(idx)} className="text-red-500 hover:text-red-700"><X size={14} /></button>
                    </div>
                  ))}
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
            placeholder="Search by Year, CRN, or Alleged..."
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
                <th className="px-6 py-3 text-left text-sm font-medium uppercase">S/N</th>
                <th onClick={() => handleSort("year")} className="px-6 py-3 text-left text-sm font-medium uppercase cursor-pointer select-none hover:bg-gray-100">Year {getSortIcon("year")}</th>
                <th onClick={() => handleSort("crn")} className="px-6 py-3 text-left text-sm font-medium uppercase cursor-pointer select-none hover:bg-gray-100">CRN {getSortIcon("crn")}</th>
                <th onClick={() => handleSort("alleged")} className="px-6 py-3 text-left text-sm font-medium uppercase cursor-pointer select-none hover:bg-gray-100">Alleged {getSortIcon("alleged")}</th>
                <th onClick={() => handleSort("sharing_letter_no")} className="px-6 py-3 text-left text-sm font-medium uppercase cursor-pointer select-none hover:bg-gray-100">Sharing Letter No {getSortIcon("sharing_letter_no")}</th>
                <th onClick={() => handleSort("referral_date")} className="px-6 py-3 text-left text-sm font-medium uppercase cursor-pointer select-none hover:bg-gray-100">Referral Date {getSortIcon("referral_date")}</th>
                <th onClick={() => handleSort("status")} className="px-6 py-3 text-left text-sm font-medium uppercase cursor-pointer select-none hover:bg-gray-100">Status {getSortIcon("status")}</th>
                <th className="px-6 py-3 text-left text-sm font-medium uppercase">Assigned To</th>
                <th className="px-6 py-3 text-left text-sm font-medium uppercase">Attachments</th>
                <th className="px-6 py-3 text-left text-sm font-medium uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {paginatedReferrals.map((ref, index) => {
                const isSubmitted = ref.referredToRAA === true;
                const isAssigned = !!ref.assignedTo;
                const canEdit = isAccUser && !isSubmitted;
                const canDelete = isAccUser && !isSubmitted;
                const canSubmit = isAccUser && !isSubmitted;
                const canUpdate = isRaaUser && isSubmitted;
                const canAssign = isRaaAdmin && isSubmitted && !isAssigned;
                // For view & update: RAA can view and update; ACC can only view (if submitted) or view (if not)
                const showViewUpdate = isRaaUser && isSubmitted;
                const showViewOnly = !showViewUpdate; // ACC or not submitted

                return (
                  <tr key={ref._id} className="hover:bg-gray-100 transition-colors">
                    <td className="px-6 py-3 text-sm">{startIndex + index + 1}</td>
                    <td className="px-6 py-3 text-sm">{ref.year}</td>
                    <td className="px-6 py-3 text-sm">{ref.crn}</td>
                    <td className="px-6 py-3 text-sm">{ref.alleged}</td>
                    <td className="px-6 py-3 text-sm">{ref.sharing_letter_no}</td>
                    <td className="px-6 py-3 text-sm">{ref.referral_date?.split("T")[0]}</td>
                    <td className="px-6 py-3 text-sm">
                      <span className={`px-2 py-1 rounded-full text-xs ${
                        ref.status === "Pending" ? "bg-yellow-100 text-yellow-800" :
                        ref.status === "Ongoing" ? "bg-blue-100 text-blue-800" :
                        ref.status === "Completed" ? "bg-green-100 text-green-800" :
                        "bg-gray-100 text-gray-800"
                      }`}>
                        {ref.status}
                      </span>
                    </td>
                    <td className="px-6 py-3 text-sm">
                      {ref.assignedTo ? (
                        <div className="flex items-center gap-1">
                          <UserCheck size={14} className="text-green-600" />
                          <span>{ref.assignedTo.name}</span>
                        </div>
                      ) : (
                        <span className="text-gray-400 text-xs">Not assigned</span>
                      )}
                    </td>
                    <td className="px-6 py-3 text-sm">
                      {ref.attachments && ref.attachments.length > 0 ? (
                        <div className="flex flex-wrap gap-2">
                          {ref.attachments.slice(0, 2).map((fileName, idx) => (
                            <div key={idx} className="flex items-center gap-1 bg-gray-100 px-2 py-1 rounded">
                              <FileText size={12} className="text-gray-500" />
                              <span className="text-xs truncate max-w-[80px]" title={fileName}>
                                {fileName.length > 15 ? fileName.substring(0, 15) + '...' : fileName}
                              </span>
                              <button onClick={() => handleViewFile(fileName)} className="text-blue-500 hover:text-blue-700"><Eye size={12} /></button>
                              <button onClick={() => handleDownloadFile(fileName)} className="text-green-500 hover:text-green-700"><Download size={12} /></button>
                            </div>
                          ))}
                          {ref.attachments.length > 2 && <span className="text-xs text-gray-500">+{ref.attachments.length - 2}</span>}
                        </div>
                      ) : <span className="text-gray-400 text-xs">No files</span>}
                    </td>
                    <td className="px-6 py-3 text-sm flex flex-wrap gap-2">
                      {/* VIEW & UPDATE (for RAA, submitted) */}
                      {showViewUpdate && (
                        <button onClick={() => openViewUpdateModal(ref)} className="flex items-center gap-1 border rounded px-2 py-1 text-xs hover:border-black text-purple-600">
                          <Eye size={12} /> View & Update
                        </button>
                      )}
                      {/* VIEW ONLY (for ACC or not submitted) */}
                      {showViewOnly && (
                        <button onClick={() => openViewUpdateModal(ref)} className="flex items-center gap-1 border rounded px-2 py-1 text-xs hover:border-black">
                          <Eye size={12} /> View
                        </button>
                      )}
                      {/* Edit (ACC only if not submitted) */}
                      {canEdit && (
                        <button onClick={() => {
                          setEditData(ref);
                          setFormData({
                            year: ref.year,
                            crn: ref.crn,
                            alleged: ref.alleged,
                            sharing_letter_no: ref.sharing_letter_no,
                            referral_date: ref.referral_date?.split("T")[0] || "",
                          });
                          setExistingAttachments(ref.attachments || []);
                          setAttachments([]);
                          setShowForm(true);
                        }} className="flex items-center gap-1 border rounded px-2 py-1 text-xs hover:border-black">
                          <Pencil size={12} /> Edit
                        </button>
                      )}
                      {/* Submit to RAA (ACC only if not submitted) */}
                      {canSubmit && (
                        <button onClick={() => handleSubmitToRAA(ref)} className="flex items-center gap-1 border rounded px-2 py-1 text-xs hover:border-black text-blue-600">
                          <Send size={12} /> Submit
                        </button>
                      )}
                      {/* Assign (RAA admin only if submitted and not assigned) */}
                      {canAssign && (
                        <button onClick={() => openAssignModal(ref)} className="flex items-center gap-1 border rounded px-2 py-1 text-xs hover:border-black">
                          <UserPlus size={12} /> Assign
                        </button>
                      )}
                      {/* Delete (ACC only if not submitted) */}
                      {canDelete && (
                        <button onClick={() => handleDelete(ref)} className="flex items-center gap-1 border rounded px-2 py-1 text-xs hover:border-black text-red-500">
                          <Trash2 size={12} /> Delete
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
              {paginatedReferrals.length === 0 && (
                <tr><td colSpan={10} className="text-center py-6 text-gray-500">No records found</td></tr>
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
      </main>

      {/* --- COMBINED VIEW & UPDATE MODAL --- */}
      {viewUpdateModalOpen && currentViewReferral && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-md overflow-y-auto">
          <div className="bg-white rounded-xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b p-4 flex justify-between items-center">
              <h3 className="text-xl font-semibold">
                {isRaaUser && currentViewReferral.referredToRAA ? "View & Update Referral" : "Referral Details"}
              </h3>
              <button onClick={() => setViewUpdateModalOpen(false)} className="text-gray-500 hover:text-gray-700"><X size={24} /></button>
            </div>
            <div className="p-6 space-y-6">
              {/* --- REFERRAL DETAILS (read-only) --- */}
              <div className="grid md:grid-cols-2 gap-4">
                <div><label className="text-sm font-medium">Year</label><p className="mt-1">{currentViewReferral.year}</p></div>
                <div><label className="text-sm font-medium">CRN</label><p className="mt-1">{currentViewReferral.crn}</p></div>
                <div><label className="text-sm font-medium">Alleged</label><p className="mt-1">{currentViewReferral.alleged}</p></div>
                <div><label className="text-sm font-medium">Sharing Letter No</label><p className="mt-1">{currentViewReferral.sharing_letter_no}</p></div>
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

              {/* --- UPDATE FORM (only if user is RAA and referral is submitted) --- */}
              {isRaaUser && currentViewReferral.referredToRAA && (
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

      {/* --- ASSIGN MODAL --- */}
      {showAssignModal && selectedReferral && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-md">
          <div className="bg-white rounded-xl shadow-2xl max-w-md w-full">
            <div className="flex justify-between items-center p-6 border-b">
              <h3 className="text-xl font-semibold">Assign to RAA Officer</h3>
              <button onClick={() => setShowAssignModal(false)} className="text-gray-500 hover:text-gray-700"><X size={24} /></button>
            </div>
            <div className="p-6">
              <p className="text-sm text-gray-600 mb-4">Referral: <span className="font-medium">{selectedReferral.crn}</span></p>
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
    </div>
  );

  // ================== DELETE (helper) ==================
  async function handleDelete(ref: Referral) {
    if (!confirm(`Are you sure you want to delete "${ref.crn}"?`)) return;
    try {
      const token = getToken();
      const res = await fetch("/api/acc-raa-referrals", {
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