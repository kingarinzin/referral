"use client";

import { useState, useEffect, ChangeEvent } from "react";
import { Trash2, Pencil, Save, Check, X, Plus, Upload, FileText, Download, Eye } from "lucide-react";
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

export default function AddReferralPage() {
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

  const [formData, setFormData] = useState<FormData>({
    year: "",
    crn: "",
    alleged: "",
    sharing_letter_no: "",
    referral_date: "",
  });

  // ================== FETCH ==================
  const fetchReferrals = async () => {
    try {
      const res = await fetch("/api/acc-raa-referrals");
      const data = await res.json();
      setReferrals(data);
    } catch (error) {
      showNotification((error as Error).message, "error");
    }
  };

  useEffect(() => {
    fetchReferrals();
  }, []);

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
      const res = await fetch("/api/acc-raa-referrals/delete-file", {
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
      
      // Refresh the referrals list to update the table
      await fetchReferrals();
    } catch (error) {
      showNotification((error as Error).message, "error");
    }
  };

  // ================== FILE VIEW/DOWNLOAD ==================
  const handleViewFile = (fileName: string) => {
    const fileUrl = `/uploads/acc-raa-referral/${fileName}`;
    window.open(fileUrl, '_blank');
  };

  const handleDownloadFile = (fileName: string) => {
    const fileUrl = `/uploads/acc-raa-referral/${fileName}`;
    const link = document.createElement('a');
    link.href = fileUrl;
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // ================== FORM HANDLERS ==================
  const handleFormChange = (e: ChangeEvent<HTMLInputElement>) => {
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
      
      // Append new attachments
      attachments.forEach((file) => {
        body.append("attachments", file);
      });

      // Append existing attachments if editing
      if (editData && existingAttachments.length > 0) {
        body.append("existingAttachments", JSON.stringify(existingAttachments));
      }

      const url = "/api/acc-raa-referrals";
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
      crn: ref.crn,
      alleged: ref.alleged,
      sharing_letter_no: ref.sharing_letter_no,
      referral_date: ref.referral_date?.split("T")[0] || "",
    });
    setExistingAttachments(ref.attachments || []);
    setAttachments([]);
    setShowForm(true);
  };

  // ================== DELETE ==================
  const handleDelete = async (ref: Referral) => {
    if (!confirm(`Are you sure you want to delete "${ref.crn}"?`)) return;

    try {
      const res = await fetch("/api/acc-raa-referrals", {
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
      (ref.crn?.toLowerCase() || "").includes(search.toLowerCase()) ||
      (ref.alleged?.toLowerCase() || "").includes(search.toLowerCase())
  );

  // FIXED: Type-safe sorting with undefined handling
  const sortedReferrals = [...filteredReferrals].sort((a, b) => {
    if (!sortConfig.key) return 0;
    const key = sortConfig.key as keyof Referral;
    const aVal = a[key];
    const bVal = b[key];
    
    // Handle undefined/null values - put them at the end
    if (aVal == null && bVal == null) return 0;
    if (aVal == null) return 1;
    if (bVal == null) return -1;
    
    // For string comparison (case insensitive)
    if (typeof aVal === 'string' && typeof bVal === 'string') {
      const comparison = aVal.localeCompare(bVal);
      return sortConfig.direction === "asc" ? comparison : -comparison;
    }
    
    // For numbers and dates
    if (aVal < bVal) return sortConfig.direction === "asc" ? -1 : 1;
    if (aVal > bVal) return sortConfig.direction === "asc" ? 1 : -1;
    return 0;
  });

  const totalPages = Math.ceil(sortedReferrals.length / rowsPerPage);
  const startIndex = (currentPage - 1) * rowsPerPage;
  const paginatedReferrals = sortedReferrals.slice(startIndex, startIndex + rowsPerPage);

  // Get sort icon
  const getSortIcon = (key: keyof Referral) => {
    if (sortConfig.key !== key) return null;
    return sortConfig.direction === "asc" ? "↑" : "↓";
  };

  return (
    <div className="flex">
      <Sidebar />
      <main className="flex-1 p-6 ml-64 bg-gray-100 min-h-screen">
        {/* Header */}
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold">ACC - RAA Referral</h1>
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

            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium">Year</label>
                <input
                  type="text"
                  name="year"
                  value={formData.year}
                  onChange={handleFormChange}
                  className="w-full border rounded px-3 py-2"
                />
              </div>
              <div>
                <label className="text-sm font-medium">CRN</label>
                <input
                  type="text"
                  name="crn"
                  value={formData.crn}
                  onChange={handleFormChange}
                  className="w-full border rounded px-3 py-2"
                />
              </div>
              <div>
                <label className="text-sm font-medium">Alleged</label>
                <input
                  type="text"
                  name="alleged"
                  value={formData.alleged}
                  onChange={handleFormChange}
                  className="w-full border rounded px-3 py-2"
                />
              </div>
              <div>
                <label className="text-sm font-medium">Sharing Letter No</label>
                <input
                  type="text"
                  name="sharing_letter_no"
                  value={formData.sharing_letter_no}
                  onChange={handleFormChange}
                  className="w-full border rounded px-3 py-2"
                />
              </div>
              <div>
                <label className="text-sm font-medium">Referral Date</label>
                <input
                  type="date"
                  name="referral_date"
                  value={formData.referral_date}
                  onChange={handleFormChange}
                  className="w-full border rounded px-3 py-2"
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
              
              {/* Existing attachments (for edit mode) */}
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
                        <button
                          type="button"
                          onClick={() => handleViewFile(fileName)}
                          className="text-blue-500 hover:text-blue-700 transition"
                          title="View"
                        >
                          <Eye size={14} />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDownloadFile(fileName)}
                          className="text-green-500 hover:text-green-700 transition"
                          title="Download"
                        >
                          <Download size={14} />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleRemoveExistingFile(fileName)}
                          className="text-red-500 hover:text-red-700 transition"
                          title="Delete"
                        >
                          <X size={14} />
                        </button>
                      </div>
                    </div>
                  ))}
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
                      <button
                        type="button"
                        onClick={() => handleRemoveFile(idx)}
                        className="text-red-500 hover:text-red-700 transition"
                      >
                        <X size={14} />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="flex justify-end gap-3 mt-5">
              <button
                onClick={resetForm}
                className="flex items-center gap-2 px-3 py-1.5 border rounded-md text-xs font-medium hover:border-black transition"
              >
                <X size={14} /> Cancel
              </button>
              <button
                onClick={handleAddOrUpdate}
                className="flex items-center gap-2 px-3 py-1.5 border rounded-md text-xs font-medium hover:border-black transition"
              >
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
                <th
                  onClick={() => handleSort("year")}
                  className="px-6 py-3 text-left text-sm font-medium uppercase cursor-pointer select-none hover:bg-gray-100"
                >
                  Year {getSortIcon("year")}
                </th>
                <th
                  onClick={() => handleSort("crn")}
                  className="px-6 py-3 text-left text-sm font-medium uppercase cursor-pointer select-none hover:bg-gray-100"
                >
                  CRN {getSortIcon("crn")}
                </th>
                <th
                  onClick={() => handleSort("alleged")}
                  className="px-6 py-3 text-left text-sm font-medium uppercase cursor-pointer select-none hover:bg-gray-100"
                >
                  Alleged {getSortIcon("alleged")}
                </th>
                <th
                  onClick={() => handleSort("sharing_letter_no")}
                  className="px-6 py-3 text-left text-sm font-medium uppercase cursor-pointer select-none hover:bg-gray-100"
                >
                  Sharing Letter No {getSortIcon("sharing_letter_no")}
                </th>
                <th
                  onClick={() => handleSort("referral_date")}
                  className="px-6 py-3 text-left text-sm font-medium uppercase cursor-pointer select-none hover:bg-gray-100"
                >
                  Referral Date {getSortIcon("referral_date")}
                </th>
                <th
                  onClick={() => handleSort("status")}
                  className="px-6 py-3 text-left text-sm font-medium uppercase cursor-pointer select-none hover:bg-gray-100"
                >
                  Status {getSortIcon("status")}
                </th>
                <th className="px-6 py-3 text-left text-sm font-medium uppercase">Attachments</th>
                <th className="px-6 py-3 text-left text-sm font-medium uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {paginatedReferrals.length > 0 ? (
                paginatedReferrals.map((ref, index) => (
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
                        ref.status === "Approved" ? "bg-green-100 text-green-800" :
                        "bg-red-100 text-red-800"
                      }`}>
                        {ref.status}
                      </span>
                    </td>
                    <td className="px-6 py-3 text-sm">
                      {ref.attachments && ref.attachments.length > 0 ? (
                        <div className="flex flex-wrap gap-2">
                          {ref.attachments.map((fileName, idx) => (
                            <div key={idx} className="flex items-center gap-1 bg-gray-100 px-2 py-1 rounded">
                              <FileText size={12} className="text-gray-500" />
                              <span className="text-xs truncate max-w-[100px]" title={fileName}>
                                {fileName.length > 20 ? fileName.substring(0, 20) + '...' : fileName}
                              </span>
                              <button
                                onClick={() => handleViewFile(fileName)}
                                className="text-blue-500 hover:text-blue-700"
                                title="View"
                              >
                                <Eye size={12} />
                              </button>
                              <button
                                onClick={() => handleDownloadFile(fileName)}
                                className="text-green-500 hover:text-green-700"
                                title="Download"
                              >
                                <Download size={12} />
                              </button>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <span className="text-gray-400 text-xs">No files</span>
                      )}
                    </td>
                    <td className="px-6 py-3 text-sm flex gap-2">
                      <button
                        onClick={() => handleEdit(ref)}
                        className="flex items-center gap-2 px-3 py-1.5 border rounded-md text-xs font-medium hover:border-black transition"
                      >
                        <Pencil size={14} /> Edit
                      </button>
                      <button
                        onClick={() => handleDelete(ref)}
                        className="flex items-center gap-2 px-3 py-1.5 border rounded-md text-xs font-medium hover:border-black transition"
                      >
                        <Trash2 size={14} /> Delete
                      </button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={9} className="text-center py-6 text-gray-500">
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
      </main>
    </div>
  );
}