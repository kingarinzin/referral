"use client";

import { useState, useEffect } from "react";
import { Trash2, Pencil, Save, Check, X, Plus } from "lucide-react";
import Sidebar from "@/components/Sidebar";

export default function DivisionPage() {
  const [divisions, setDivisions] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [editData, setEditData] = useState(null);
  const [search, setSearch] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [sortConfig, setSortConfig] = useState({ key: null, direction: "asc" });
  const [notification, setNotification] = useState(null);

  const [formData, setFormData] = useState({
    name: "",
    remarks: "",
    departmentId: "",
  });

  // ================== FETCH ==================
  const fetchDepartments = async () => {
    try {
      const res = await fetch("/api/departments");
      const data = await res.json();
      if (Array.isArray(data)) setDepartments(data);
    } catch (err) {
      console.error("Error fetching departments:", err);
    }
  };

  const fetchDivisions = async () => {
    try {
      const res = await fetch("/api/divisions");
      const data = await res.json();
      if (Array.isArray(data)) setDivisions(data);
      else setDivisions([]);
    } catch (err) {
      console.error("Error fetching divisions:", err);
      setDivisions([]);
    }
  };

  useEffect(() => {
    fetchDepartments();
    fetchDivisions();
  }, []);

  // ================== HANDLERS ==================
  const handleFormChange = (e) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });
  };

  const showNotification = (message, type = "success") => {
    setNotification({ message, type });
    setTimeout(() => setNotification(null), 3000);
  };

  const handleAdd = async () => {
    if (!formData.name || !formData.departmentId) {
      showNotification("Division name and department are required", "error");
      return;
    }
    try {
      const res = await fetch("/api/divisions", {
        method: "POST",
        body: JSON.stringify(formData),
        headers: { "Content-Type": "application/json" },
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to add division");

      await fetchDivisions();
      setFormData({ name: "", remarks: "", departmentId: "" });
      setShowForm(false);
      showNotification("Division added successfully", "success");
    } catch (error) {
      console.error("Add Division Error:", error);
      showNotification(error.message, "error");
    }
  };

  const handleUpdate = async () => {
    if (!formData.name || !formData.departmentId) {
      showNotification("Division name and department are required", "error");
      return;
    }
    try {
      const res = await fetch("/api/divisions", {
        method: "PUT",
        body: JSON.stringify({ ...formData, _id: editData._id }),
        headers: { "Content-Type": "application/json" },
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to update division");

      await fetchDivisions();
      setFormData({ name: "", remarks: "", departmentId: "" });
      setEditData(null);
      setShowForm(false);
      showNotification("Division updated successfully", "success");
    } catch (error) {
      console.error("Update Division Error:", error);
      showNotification(error.message, "error");
    }
  };

  const handleDelete = async (division) => {
    if (!confirm(`Are you sure you want to delete "${division.name}"?`)) return;
    try {
      const res = await fetch("/api/divisions", {
        method: "DELETE",
        body: JSON.stringify({ _id: division._id }),
        headers: { "Content-Type": "application/json" },
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to delete division");

      await fetchDivisions();
      showNotification("Division deleted successfully", "success");
    } catch (error) {
      console.error("Delete Division Error:", error);
      showNotification(error.message, "error");
    }
  };

// ================== Edit function ==================
  const handleEdit = (division) => {
  setEditData(division);
  setFormData({
    name: division.name || "",
    remarks: division.remarks || "",
    departmentId: division.departmentId?._id || "",
  });
  setShowForm(true);
};


  // ================== SEARCH, SORT, PAGINATION ==================
  const handleSearchChange = (e) => {
    setSearch(e.target.value);
    setCurrentPage(1);
  };

  const handleRowsChange = (e) => {
    setRowsPerPage(Number(e.target.value));
    setCurrentPage(1);
  };

  const handleSort = (key) => {
    let direction = "asc";
    if (sortConfig.key === key && sortConfig.direction === "asc") direction = "desc";
    setSortConfig({ key, direction });
  };

  const filteredDivisions = Array.isArray(divisions)
    ? divisions.filter(
        (d) =>
          (d.name?.toLowerCase() || "").includes(search.toLowerCase()) ||
          (d.remarks?.toLowerCase() || "").includes(search.toLowerCase()) ||
          (d.departmentId?.name?.toLowerCase() || "").includes(search.toLowerCase())
      )
    : [];

  const sortedDivisions = [...filteredDivisions];
  if (sortConfig.key) {
    sortedDivisions.sort((a, b) => {
      const aVal = sortConfig.key === "departmentId" ? a.departmentId?.name || "" : a[sortConfig.key];
      const bVal = sortConfig.key === "departmentId" ? b.departmentId?.name || "" : b[sortConfig.key];
      if (aVal < bVal) return sortConfig.direction === "asc" ? -1 : 1;
      if (aVal > bVal) return sortConfig.direction === "asc" ? 1 : -1;
      return 0;
    });
  }

  const totalPages = Math.ceil(sortedDivisions.length / rowsPerPage);
  const startIndex = (currentPage - 1) * rowsPerPage;
  const paginatedDivisions = sortedDivisions.slice(startIndex, startIndex + rowsPerPage);

  // ================== RENDER ==================
  return (
    <div className="flex">
      <Sidebar />

      <main className="flex-1 p-6 ml-64 bg-gray-100 min-h-screen">
        {/* Header */}
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold">Division List</h1>
          {!showForm && (
            <button
              onClick={() => {
                setShowForm(true);
                setEditData(null);
                setFormData({ name: "", remarks: "", departmentId: "" });
              }}
              className="flex items-center gap-2 px-3 py-1.5 bg-white border rounded-md text-xs font-medium hover:border-black transition"
            >
              <Plus size={14} /> Division
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
              <h2 className="text-lg font-semibold">{editData ? "Edit Division" : "Add Division"}</h2>
              <button onClick={() => setShowForm(false)} className="text-xl text-gray-500">✕</button>
            </div>

            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium">Department</label>
                <select
                  name="departmentId"
                  value={formData.departmentId}
                  onChange={handleFormChange}
                  className="w-full border rounded px-3 py-2"
                >
                  <option value="">-- Select Department --</option>
                  {departments.map((dept) => (
                    <option key={dept._id} value={dept._id}>
                      {dept.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-sm font-medium">Division Name</label>
                <input
                  type="text"
                  name="name"
                  value={formData.name}
                  onChange={handleFormChange}
                  className="w-full border rounded px-3 py-2"
                />
              </div>
              <div>
                <label className="text-sm font-medium">Remarks</label>
                <input
                  type="text"
                  name="remarks"
                  value={formData.remarks}
                  onChange={handleFormChange}
                  className="w-full border rounded px-3 py-2"
                />
              </div>
            </div>
            <div className="flex justify-end gap-3 mt-5">
              <button onClick={() => setShowForm(false)} className="flex items-center gap-2 px-3 py-1.5 border rounded-md text-xs font-medium hover:border-black transition"
              >
                <X size={14} /> Cancel</button>
              <button onClick={editData ? handleUpdate : handleAdd} className="flex items-center gap-2 px-3 py-1.5 border rounded-md text-xs font-medium hover:border-black transition"
              >
                {editData ? <Check size={14} /> : <Save size={14} />}
                {editData ? "Update" : "Save"}
              </button>
            </div>
          </div>
        )}

        {/* Table & Pagination */}
        <div className="bg-white shadow rounded-lg overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-sm font-medium uppercase">S/N</th>
                <th
                  className="px-6 py-3 text-left text-sm font-medium uppercase cursor-pointer select-none"
                  onClick={() => handleSort("departmentId")}
                >
                  Department {sortConfig.key === "departmentId" ? (sortConfig.direction === "asc" ? "▲" : "▼") : "▲▼"}
                </th>
                <th
                  className="px-6 py-3 text-left text-sm font-medium uppercase cursor-pointer select-none"
                  onClick={() => handleSort("name")}
                >
                  Division Name {sortConfig.key === "name" ? (sortConfig.direction === "asc" ? "▲" : "▼") : "▲▼"}
                </th>
                <th className="px-6 py-3 text-left text-sm font-medium uppercase">Remarks</th>
                <th className="px-6 py-3 text-left text-sm font-medium uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {paginatedDivisions.length > 0 ? (
                paginatedDivisions.map((d, idx) => (
                  <tr key={d._id} className="hover:bg-gray-100 transition-colors">
                    <td className="px-6 py-3 text-sm">{startIndex + idx + 1}</td>
                    <td className="px-6 py-3 text-sm">{d.departmentId?.name || "-"}</td>
                    <td className="px-6 py-3 text-sm">{d.name}</td>
                    <td className="px-6 py-3 text-sm">{d.remarks}</td>
                    <td className="px-6 py-3 text-sm flex gap-2">
                      <button onClick={() => handleEdit(d)} className="flex items-center gap-2 px-3 py-1.5 border rounded-md text-xs font-medium hover:border-black transition"
                    >
                      <Pencil size={14} /> Edit
                      </button>
                      <button onClick={() => handleDelete(d)} className="flex items-center gap-2 px-3 py-1.5 border rounded-md text-xs font-medium hover:border-black transition"
                    >
                      <Trash2 size={14} /> Delete
                      </button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="5" className="text-center py-6 text-gray-500">
                    No records found
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