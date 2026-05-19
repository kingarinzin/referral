"use client";

import { useState, useEffect, ChangeEvent } from "react";
import { Trash2, Pencil, Save, Check, X, Plus, Upload, FileText, Download, Eye, Maximize2, Copy, AlertCircle } from "lucide-react";
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

  // ================== FETCH ==================
  const fetchReferrals = async () => {
    try {
      const res = await fetch("/api/raa-acc-referrals");
      const data = await res.json();
      setReferrals(data);
    } catch (error) {
      showNotification((error as Error).message, "error");
    }
  };

  useEffect(() => {
    fetchReferrals();
  }, []);

  // ================== CHECK FOR EXISTING AIN ==================
  const checkExistingAIN = async (ain: string) => {
    if (!ain) return null;
    try {
      const res = await fetch(`/api/raa-acc-referrals?ain=${ain}`);
      const data = await res.json();
      return data.length > 0 ? data[0] : null;
    } catch (error) {
      console.error("Error checking AIN:", error);
      return null;
    }
  };

  // Auto pre-fill when duplicate AIN is detected
  const handleAINBlur = async () => {
    if (formData.ain && !editData && !isPrefilling) {
      const existing = await checkExistingAIN(formData.ain);
      if (existing) {
        setExistingAIN(existing);
        setShowDuplicateWarning(true);
        
        // Auto pre-fill common fields
        setIsPrefilling(true);
        setFormData({
          ...formData,
          year: existing.year,
          audit_report: existing.audit_report,
          referral_no: existing.referral_no,
          referral_date: existing.referral_date?.split("T")[0] || "",
          // Keep para_no, accountability_entity, acc_observation as they are (empty or user entered)
        });
        // Pre-fill attachments from existing record
        if (existing.attachments) {
          setExistingAttachments(existing.attachments);
        }
        setIsPrefilling(false);
        
        showNotification(`AIN "${formData.ain}" found. Common fields pre-filled. Please add unique information.`, "success");
      } else {
        setExistingAIN(null);
        setShowDuplicateWarning(false);
        // Clear pre-filled data if AIN doesn't exist
        setExistingAttachments([]);
      }
    }
  };

  // ================== FILE HANDLERS ==================
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
      const res = await fetch("/api/raa-acc-referrals/delete-file", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          referralId: editData._id, 
          fileName: fileName 
        }),
      });
      
      if (!res.ok) throw new Error("Failed to delete file");
      
      setExistingAttachments((prev) => prev.filter((f) => f !== fileName));
      showNotification("File deleted successfully");
      
      await fetchReferrals();
    } catch (error) {
      showNotification((error as Error).message, "error");
    }
  };

  // ================== FILE VIEW/DOWNLOAD ==================
  const handleViewFile = (fileName: string) => {
    const fileUrl = `/uploads/raa-acc-referral/${fileName}`;
    window.open(fileUrl, '_blank');
  };

  const handleDownloadFile = (fileName: string) => {
    const fileUrl = `/uploads/raa-acc-referral/${fileName}`;
    const link = document.createElement('a');
    link.href = fileUrl;
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // ================== FORM HANDLERS ==================
  const handleFormChange = (e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });
  };

  const showNotification = (message: string, type: "success" | "error" = "success") => {
    setNotification({ message, type });
    setTimeout(() => setNotification(null), 3000);
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
      
      // Append new attachments
      attachments.forEach((file) => {
        body.append("attachments", file);
      });

      // Append existing attachments if editing or if we have pre-filled attachments
      if ((editData && existingAttachments.length > 0) || (!editData && existingAttachments.length > 0)) {
        body.append("existingAttachments", JSON.stringify(existingAttachments));
      }

      // If this is a new record with existing AIN, mark it as related
      if (!editData && existingAIN) {
        body.append("parent_ain", existingAIN.ain);
      }

      const url = "/api/raa-acc-referrals";
      const method = editData ? "PUT" : "POST";

      if (editData) body.append("_id", editData._id);

      const res = await fetch(url, { method, body });
      if (!res.ok) throw new Error("Failed to save");

      await fetchReferrals();
      resetForm();
      showNotification(editData ? "Referral updated successfully" : "Referral added successfully");
    } catch (error) {
      showNotification((error as Error).message, "error");
    }
  };

  // ================== EDIT ==================
  const handleEdit = (ref: Referral) => {
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
    setExistingAIN(null);
    setShowDuplicateWarning(false);
    setIsPrefilling(false);
  };

  // ================== DELETE ==================
  const handleDelete = async (ref: Referral) => {
    if (!confirm(`Are you sure you want to delete "${ref.ain}"?`)) return;

    try {
      const res = await fetch("/api/raa-acc-referrals", {
        method: "DELETE",
        body: JSON.stringify({ _id: ref._id }),
        headers: { "Content-Type": "application/json" },
      });
      if (!res.ok) throw new Error("Failed to delete");

      await fetchReferrals();
      showNotification("Referral deleted successfully");
    } catch (error) {
      showNotification((error as Error).message, "error");
    }
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

  // Group referrals by AIN for display
  const groupedReferrals = filteredReferrals.reduce((acc, ref) => {
    const ain = ref.ain;
    if (!acc[ain]) {
      acc[ain] = [];
    }
    acc[ain].push(ref);
    return acc;
  }, {} as Record<string, Referral[]>);

  // Flatten grouped referrals for display with group headers
  const flattenedReferrals: (Referral | { isGroupHeader: true; ain: string; count: number })[] = [];
  
  Object.keys(groupedReferrals).forEach(ain => {
    const group = groupedReferrals[ain];
    if (group.length > 1) {
      // Add group header
      flattenedReferrals.push({
        isGroupHeader: true,
        ain: ain,
        count: group.length
      });
      // Add all items in the group
      flattenedReferrals.push(...group);
    } else {
      // Add single item
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
      const comparison = aVal.localeCompare(bVal);
      return sortConfig.direction === "asc" ? comparison : -comparison;
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

  return (
    <>
      <div className={`flex ${selectedView ? 'overflow-hidden h-screen' : ''}`}>
        <Sidebar />
        <main className={`flex-1 p-6 ml-64 bg-gray-100 min-h-screen overflow-x-auto transition-all duration-300 ${selectedView ? 'blur-sm' : ''}`}>
          <div className="min-w-[1024px]">
            {/* Header */}
            <div className="flex justify-between items-center mb-6">
              <h1 className="text-2xl font-bold">RAA - ACC Referral</h1>
              {!showForm && (
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

            {/* Add/Edit Form */}
            {showForm && (
              <div className="bg-white shadow rounded-xl p-6 mb-6">
                <div className="flex justify-between mb-4">
                  <h2 className="text-lg font-semibold">{editData ? "Edit Referral" : "Add Referral"}</h2>
                  <button onClick={resetForm} className="text-xl text-gray-500">
                    ✕
                  </button>
                </div>

                {/* Duplicate AIN Info Message */}
                {showDuplicateWarning && existingAIN && (
                  <div className="mb-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                    <div className="flex items-start gap-3">
                      <Copy className="text-blue-600 mt-0.5" size={20} />
                      <div className="flex-1">
                        <h3 className="font-semibold text-blue-800 mb-1">Duplicate AIN Detected - Auto Pre-filled</h3>
                        <p className="text-sm text-blue-700">
                          AIN "{formData.ain}" already exists in the system. Common fields (Year, Audit Report, Referral No, Referral Date, Attachments) have been auto-filled from the existing record.
                          Please review and add the unique information (Para No, Accountability Entity, ACC Observation) for this new referral.
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium">Year *</label>
                    <input
                      type="text"
                      name="year"
                      value={formData.year}
                      onChange={handleFormChange}
                      className="w-full border rounded px-3 py-2 bg-gray-50"
                      readOnly={!!showDuplicateWarning}
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium">AIN *</label>
                    <input
                      type="text"
                      name="ain"
                      value={formData.ain}
                      onChange={handleFormChange}
                      onBlur={handleAINBlur}
                      className="w-full border rounded px-3 py-2"
                      disabled={!!editData}
                    />
                    {!editData && (
                      <p className="text-xs text-gray-500 mt-1">
                        Enter AIN - system will auto-fill common fields if AIN exists
                      </p>
                    )}
                  </div>
                  <div>
                    <label className="text-sm font-medium">Para No</label>
                    <input
                      type="text"
                      name="para_no"
                      value={formData.para_no}
                      onChange={handleFormChange}
                      className="w-full border rounded px-3 py-2"
                      placeholder="Enter new para number"
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium">Accountability Entity</label>
                    <input
                      type="text"
                      name="accountability_entity"
                      value={formData.accountability_entity}
                      onChange={handleFormChange}
                      className="w-full border rounded px-3 py-2"
                      placeholder="Enter new accountability entity"
                    />
                  </div>
                  <div className="md:col-span-2">
                    <label className="text-sm font-medium">Audit Report</label>
                    <textarea
                      name="audit_report"
                      value={formData.audit_report}
                      onChange={handleFormChange}
                      rows={3}
                      className="w-full border rounded px-3 py-2 bg-gray-50"
                      readOnly={!!showDuplicateWarning}
                    />
                  </div>
                  <div className="md:col-span-2">
                    <label className="text-sm font-medium">ACC Observation</label>
                    <textarea
                      name="acc_observation"
                      value={formData.acc_observation}
                      onChange={handleFormChange}
                      rows={3}
                      className="w-full border rounded px-3 py-2"
                      placeholder="Enter new ACC observation"
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium">Referral No</label>
                    <input
                      type="text"
                      name="referral_no"
                      value={formData.referral_no}
                      onChange={handleFormChange}
                      className="w-full border rounded px-3 py-2 bg-gray-50"
                      readOnly={!!showDuplicateWarning}
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium">Referral Date</label>
                    <input
                      type="date"
                      name="referral_date"
                      value={formData.referral_date}
                      onChange={handleFormChange}
                      className="w-full border rounded px-3 py-2 bg-gray-50"
                      readOnly={!!showDuplicateWarning}
                    />
                  </div>
                </div>

                {/* File Attachments Section */}
                <div className="mt-4">
                  <div className="flex items-center gap-2 mb-2">
                    <label className="text-sm font-medium">Attach Files (optional)</label>
                    <label className="cursor-pointer text-gray-500 hover:text-gray-700 transition">
                      <Upload size={16} />
                      <input
                        type="file"
                        multiple
                        onChange={handleFileSelect}
                        className="hidden"
                      />
                    </label>
                  </div>
                  
                  {/* Existing attachments (pre-filled from duplicate AIN or from edit) */}
                  {existingAttachments.length > 0 && (
                    <div className="space-y-2 mt-3">
                      <label className="text-xs font-medium text-gray-500">
                        {showDuplicateWarning ? 'Pre-filled Files from Existing Record:' : 'Existing Files:'}
                      </label>
                      {existingAttachments.map((fileName, idx) => (
                        <div key={idx} className="flex justify-between items-center bg-blue-50 px-3 py-2 rounded-lg text-sm border border-blue-200">
                          <div className="flex items-center gap-2">
                            <FileText size={14} className="text-blue-500" />
                            <span className="text-gray-700">{fileName}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <button onClick={() => handleViewFile(fileName)} className="text-blue-500 hover:text-blue-700">
                              <Eye size={14} />
                            </button>
                            <button onClick={() => handleDownloadFile(fileName)} className="text-green-500 hover:text-green-700">
                              <Download size={14} />
                            </button>
                            {editData && (
                              <button onClick={() => handleRemoveExistingFile(fileName)} className="text-red-500 hover:text-red-700">
                                <X size={14} />
                              </button>
                            )}
                          </div>
                        </div>
                      ))}
                      {!editData && showDuplicateWarning && (
                        <p className="text-xs text-gray-500 mt-1">
                          These files are from the existing AIN record and will be copied to this new referral.
                        </p>
                      )}
                    </div>
                  )}
                  
                  {/* New attachments */}
                  {attachments.length > 0 && (
                    <div className="space-y-2 mt-3">
                      <label className="text-xs font-medium text-gray-500">New Files:</label>
                      {attachments.map((file, idx) => (
                        <div key={idx} className="flex justify-between items-center bg-gray-50 px-3 py-2 rounded-lg text-sm border">
                          <div className="flex items-center gap-2">
                            <FileText size={14} className="text-gray-500" />
                            <span className="text-gray-700">{file.name}</span>
                          </div>
                          <button onClick={() => handleRemoveFile(idx)} className="text-red-500 hover:text-red-700">
                            <X size={14} />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div className="flex justify-end gap-3 mt-5">
                  <button onClick={resetForm} className="flex items-center gap-2 px-3 py-1.5 border rounded-md text-xs font-medium hover:border-black transition">
                    <X size={14} /> Cancel
                  </button>
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
                    <th onClick={() => handleSort("year")} className="px-4 py-3 text-left text-sm font-medium uppercase cursor-pointer select-none hover:bg-gray-100">
                      Year {getSortIcon("year")}
                    </th>
                    <th onClick={() => handleSort("ain")} className="px-4 py-3 text-left text-sm font-medium uppercase cursor-pointer select-none hover:bg-gray-100">
                      AIN {getSortIcon("ain")}
                    </th>
                    <th onClick={() => handleSort("para_no")} className="px-4 py-3 text-left text-sm font-medium uppercase cursor-pointer select-none hover:bg-gray-100">
                      Para No {getSortIcon("para_no")}
                    </th>
                    <th className="px-4 py-3 text-left text-sm font-medium uppercase">Entity</th>
                    <th className="px-4 py-3 text-left text-sm font-medium uppercase">Audit Report</th>
                    <th className="px-4 py-3 text-left text-sm font-medium uppercase">ACC Observation</th>
                    <th onClick={() => handleSort("referral_no")} className="px-4 py-3 text-left text-sm font-medium uppercase cursor-pointer select-none hover:bg-gray-100">
                      Referral No {getSortIcon("referral_no")}
                    </th>
                    <th onClick={() => handleSort("referral_date")} className="px-4 py-3 text-left text-sm font-medium uppercase cursor-pointer select-none hover:bg-gray-100">
                      Referral Date {getSortIcon("referral_date")}
                    </th>
                    <th onClick={() => handleSort("status")} className="px-4 py-3 text-left text-sm font-medium uppercase cursor-pointer select-none hover:bg-gray-100">
                      Status {getSortIcon("status")}
                    </th>
                    <th className="px-4 py-3 text-left text-sm font-medium uppercase">Attachments</th>
                    <th className="px-4 py-3 text-left text-sm font-medium uppercase">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {paginatedReferrals.length > 0 ? (
                    paginatedReferrals.map((item, idx) => {
                      if ('isGroupHeader' in item && item.isGroupHeader) {
                        return (
                          <tr key={`group-${item.ain}`} className="bg-blue-50">
                            <td colSpan={12} className="px-4 py-2 text-sm font-semibold text-blue-800">
                              <div className="flex items-center gap-2">
                                <Copy size={14} />
                                <span>AIN: {item.ain} - {item.count} related records</span>
                              </div>
                            </td>
                          </tr>
                        );
                      }
                      
                      const ref = item as Referral;
                      return (
                        <tr key={ref._id} className="hover:bg-gray-100 transition-colors">
                          <td className="px-4 py-3 text-sm">{startIndex + idx + 1 - paginatedReferrals.filter(i => 'isGroupHeader' in i && i.isGroupHeader).length}</td>
                          <td className="px-4 py-3 text-sm">{ref.year}</td>
                          <td className="px-4 py-3 text-sm font-mono">{ref.ain}</td>
                          <td className="px-4 py-3 text-sm">{ref.para_no}</td>
                          <td className="px-4 py-3 text-sm">
                            <div className="flex items-center gap-2">
                              <span className="text-gray-600 max-w-[150px] truncate">
                                {ref.accountability_entity?.substring(0, 40) || '-'}
                              </span>
                              {ref.accountability_entity && ref.accountability_entity.length > 40 && (
                                <button
                                  onClick={() => setSelectedView({ type: 'entity', data: ref.accountability_entity })}
                                  className="text-blue-500 hover:text-blue-700"
                                  title="View Full Accountability Entity"
                                >
                                  <Maximize2 size={14} />
                                </button>
                              )}
                            </div>
                          </td>
                          <td className="px-4 py-3 text-sm">
                            <div className="flex items-center gap-2">
                              <span className="text-gray-600 max-w-[200px] truncate">
                                {ref.audit_report?.substring(0, 50) || '-'}
                              </span>
                              {ref.audit_report && ref.audit_report.length > 50 && (
                                <button
                                  onClick={() => setSelectedView({ type: 'audit', data: ref.audit_report })}
                                  className="text-blue-500 hover:text-blue-700"
                                  title="View Full Audit Report"
                                >
                                  <Maximize2 size={14} />
                                </button>
                              )}
                            </div>
                          </td>
                          <td className="px-4 py-3 text-sm">
                            <div className="flex items-center gap-2">
                              <span className="text-gray-600 max-w-[200px] truncate">
                                {ref.acc_observation?.substring(0, 50) || '-'}
                              </span>
                              {ref.acc_observation && ref.acc_observation.length > 50 && (
                                <button
                                  onClick={() => setSelectedView({ type: 'acc', data: ref.acc_observation })}
                                  className="text-blue-500 hover:text-blue-700"
                                  title="View Full ACC Observation"
                                >
                                  <Maximize2 size={14} />
                                </button>
                              )}
                            </div>
                          </td>
                          <td className="px-4 py-3 text-sm">{ref.referral_no}</td>
                          <td className="px-4 py-3 text-sm">{ref.referral_date?.split("T")[0]}</td>
                          <td className="px-4 py-3 text-sm">
                            <span className={`px-2 py-1 rounded-full text-xs whitespace-nowrap ${
                              ref.status === "Pending" ? "bg-yellow-100 text-yellow-800" :
                              ref.status === "Approved" ? "bg-green-100 text-green-800" :
                              "bg-red-100 text-red-800"
                            }`}>
                              {ref.status}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-sm">
                            {ref.attachments && ref.attachments.length > 0 ? (
                              <div className="flex flex-wrap gap-2">
                                {ref.attachments.map((fileName, idx) => (
                                  <div key={idx} className="flex items-center gap-1 bg-gray-100 px-2 py-1 rounded">
                                    <FileText size={12} className="text-gray-500" />
                                    <span className="text-xs truncate max-w-[80px]" title={fileName}>
                                      {fileName.length > 15 ? fileName.substring(0, 15) + '...' : fileName}
                                    </span>
                                    <button onClick={() => handleViewFile(fileName)} className="text-blue-500 hover:text-blue-700">
                                      <Eye size={12} />
                                    </button>
                                    <button onClick={() => handleDownloadFile(fileName)} className="text-green-500 hover:text-green-700">
                                      <Download size={12} />
                                    </button>
                                  </div>
                                ))}
                              </div>
                            ) : (
                              <span className="text-gray-400 text-xs">No files</span>
                            )}
                          </td>
                          <td className="px-4 py-3 text-sm">
                            <div className="flex gap-2">
                              <button onClick={() => handleEdit(ref)} className="flex items-center gap-1 px-2 py-1 border rounded-md text-xs font-medium hover:border-black transition">
                                <Pencil size={12} /> Edit
                              </button>
                              <button onClick={() => handleDelete(ref)} className="flex items-center gap-1 px-2 py-1 border rounded-md text-xs font-medium hover:border-black transition">
                                <Trash2 size={12} /> Delete
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  ) : (
                    <tr>
                      <td colSpan={12} className="text-center py-6 text-gray-500">
                        No records found
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex justify-end items-center gap-4 mt-5 text-sm">
                <button
                  disabled={currentPage === 1}
                  onClick={() => setCurrentPage(currentPage - 1)}
                  className={`font-semibold text-lg ${currentPage === 1 ? "text-gray-400 cursor-not-allowed" : "hover:text-blue-600"}`}
                >
                  &lt;
                </button>
                <span>
                  Page {currentPage} of {totalPages}
                </span>
                <button
                  disabled={currentPage === totalPages}
                  onClick={() => setCurrentPage(currentPage + 1)}
                  className={`font-semibold text-lg ${currentPage === totalPages ? "text-gray-400 cursor-not-allowed" : "hover:text-blue-600"}`}
                >
                  &gt;
                </button>
              </div>
            )}
          </div>
        </main>
      </div>

      {/* Modal with Blur Background */}
      {selectedView && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{
            animation: 'fadeIn 0.2s ease-out'
          }}
        >
          <div 
            className="absolute inset-0 bg-black/50 backdrop-blur-md"
            onClick={() => setSelectedView(null)}
          />
          
          <div 
            className="relative bg-white rounded-xl shadow-2xl max-w-4xl w-full max-h-[80vh] flex flex-col"
            style={{
              animation: 'zoomIn 0.2s ease-out'
            }}
          >
            <div className="flex justify-between items-center p-6 border-b">
              <h3 className="text-xl font-semibold">
                {getModalTitle(selectedView.type)}
              </h3>
              <button
                onClick={() => setSelectedView(null)}
                className="text-gray-500 hover:text-gray-700 transition-colors"
              >
                <X size={24} />
              </button>
            </div>
            
            <div className="flex-1 overflow-y-auto p-6">
              <div className="whitespace-pre-wrap text-gray-700 leading-relaxed">
                {selectedView.data || 'No content available'}
              </div>
            </div>
            
            <div className="flex justify-end p-6 border-t bg-gray-50 rounded-b-xl">
              <button
                onClick={() => setSelectedView(null)}
                className="px-4 py-2 bg-gray-800 text-white rounded-md hover:bg-gray-700 transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      <style>{`
        @keyframes fadeIn {
          from {
            opacity: 0;
          }
          to {
            opacity: 1;
          }
        }
        
        @keyframes zoomIn {
          from {
            transform: scale(0.95);
            opacity: 0;
          }
          to {
            transform: scale(1);
            opacity: 1;
          }
        }
      `}</style>
    </>
  );
}