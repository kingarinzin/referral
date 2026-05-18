"use client";

import { useState, useEffect } from "react";
import { Trash2, Pencil, Save, Check, X, Plus } from "lucide-react";
import Sidebar from "@/components/Sidebar";

export default function AddReferralPage() {
  const [referrals, setReferrals] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [editData, setEditData] = useState(null);
  const [search, setSearch] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [sortConfig, setSortConfig] = useState({ key: null, direction: "asc" });
  const [notification, setNotification] = useState(null);

  const [formData, setFormData] = useState({
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
      showNotification(error.message, "error");
    }
  };

  useEffect(() => {
    fetchReferrals();
  }, []);

  // ================== FORM HANDLERS ==================
  const handleFormChange = (e) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });
  };

  const showNotification = (message, type = "success") => {
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
        if (formData[key]) body.append(key, formData[key]);
      });

      const url = "/api/acc-raa-referrals";
      const method = editData ? "PUT" : "POST";

      if (editData) body.append("_id", editData._id);

      const res = await fetch(url, { method, body });
      if (!res.ok) throw new Error("Failed to save");

      await fetchReferrals();
      resetForm();
      showNotification(editData ? "Referral updated successfully" : "Referral added successfully");
    } catch (error) {
      showNotification(error.message, "error");
    }
  };

  // ================== EDIT ==================
  const handleEdit = (ref) => {
    setEditData(ref);
    setFormData({
      year: ref.year,
      crn: ref.crn,
      alleged: ref.alleged,
      sharing_letter_no: ref.sharing_letter_no,
      referral_date: ref.referral_date?.split("T")[0] || "",
    });
    setShowForm(true);
  };

  // ================== DELETE ==================
  const handleDelete = async (ref) => {
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
      showNotification(error.message, "error");
    }
  };

  // ================== SORT & SEARCH ==================
  const handleSort = (key) => {
    let direction = "asc";
    if (sortConfig.key === key && sortConfig.direction === "asc") direction = "desc";
    setSortConfig({ key, direction });
  };

  const handleSearchChange = (e) => {
    setSearch(e.target.value);
    setCurrentPage(1);
  };

  const handleRowsChange = (e) => {
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
    if (a[sortConfig.key] < b[sortConfig.key]) return sortConfig.direction === "asc" ? -1 : 1;
    if (a[sortConfig.key] > b[sortConfig.key]) return sortConfig.direction === "asc" ? 1 : -1;
    return 0;
  });

  const totalPages = Math.ceil(sortedReferrals.length / rowsPerPage);
  const startIndex = (currentPage - 1) * rowsPerPage;
  const paginatedReferrals = sortedReferrals.slice(startIndex, startIndex + rowsPerPage);

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
                  className="px-6 py-3 text-left text-sm font-medium uppercase cursor-pointer select-none"
                >
                  Year {sortConfig.key === "year" ? (sortConfig.direction === "asc" ? "▲" : "▼") : "▲▼"}
                </th>
                <th
                  onClick={() => handleSort("crn")}
                  className="px-6 py-3 text-left text-sm font-medium uppercase cursor-pointer select-none"
                >
                  CRN {sortConfig.key === "crn" ? (sortConfig.direction === "asc" ? "▲" : "▼") : "▲▼"}
                </th>
                <th
                  onClick={() => handleSort("alleged")}
                  className="px-6 py-3 text-left text-sm font-medium uppercase cursor-pointer select-none"
                >
                  Alleged {sortConfig.key === "alleged" ? (sortConfig.direction === "asc" ? "▲" : "▼") : "▲▼"}
                </th>
                <th
                  onClick={() => handleSort("sharing_letter_no")}
                  className="px-6 py-3 text-left text-sm font-medium uppercase cursor-pointer select-none"
                >
                  Sharing Letter No {sortConfig.key === "sharing_letter_no" ? (sortConfig.direction === "asc" ? "▲" : "▼") : "▲▼"}
                </th>
                <th
                  onClick={() => handleSort("referral_date")}
                  className="px-6 py-3 text-left text-sm font-medium uppercase cursor-pointer select-none"
                >
                  Referral Date {sortConfig.key === "referral_date" ? (sortConfig.direction === "asc" ? "▲" : "▼") : "▲▼"}
                </th>
                <th
                  onClick={() => handleSort("status")}
                  className="px-6 py-3 text-left text-sm font-medium uppercase cursor-pointer select-none"
                >
                  Status {sortConfig.key === "status" ? (sortConfig.direction === "asc" ? "▲" : "▼") : "▲▼"}
                </th>
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
                    <td className="px-6 py-3 text-sm">{ref.status}</td>
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
                  <td colSpan="8" className="text-center py-6 text-gray-500">
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