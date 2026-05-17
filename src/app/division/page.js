"use client";

import { useState, useEffect } from "react";
import { Trash2, Pencil, Save, Check, X, Plus } from "lucide-react";
import Sidebar from "@/components/Sidebar";

export default function DivisionPage() {
  const [divisions, setDivisions] = useState([]);
  const [agencies, setAgencies] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [filteredDepartments, setFilteredDepartments] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [editData, setEditData] = useState(null);
  const [search, setSearch] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [sortConfig, setSortConfig] = useState({ key: null, direction: "asc" });
  const [notification, setNotification] = useState(null);
  const [formData, setFormData] = useState({ name: "", remarks: "", agencyId: "", departmentId: "" });

  const fetchAgencies = async () => {
    try {
      const res = await fetch("/api/agencies");
      const data = await res.json();
      setAgencies(Array.isArray(data) ? data : []);
    } catch (err) {
      setAgencies([]);
    }
  };

  const fetchDepartments = async () => {
    try {
      const res = await fetch("/api/departments");
      const data = await res.json();
      setDepartments(Array.isArray(data) ? data : []);
    } catch (err) {
      setDepartments([]);
    }
  };

  const fetchDivisions = async () => {
    try {
      const res = await fetch("/api/divisions");
      const data = await res.json();
      setDivisions(Array.isArray(data) ? data : []);
    } catch (err) {
      setDivisions([]);
    }
  };

  useEffect(() => {
    fetchAgencies();
    fetchDepartments();
    fetchDivisions();
  }, []);

  useEffect(() => {
    if (formData.agencyId && departments.length) {
      const filtered = departments.filter((dept) => dept.agencyId === formData.agencyId);
      setFilteredDepartments(filtered);
      setFormData((prev) => ({ ...prev, departmentId: "" }));
    } else {
      setFilteredDepartments([]);
      setFormData((prev) => ({ ...prev, departmentId: "" }));
    }
  }, [formData.agencyId, departments]);

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
        body: JSON.stringify({ name: formData.name, departmentId: formData.departmentId, remarks: formData.remarks }),
        headers: { "Content-Type": "application/json" },
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to add");
      await fetchDivisions();
      setFormData({ name: "", remarks: "", agencyId: "", departmentId: "" });
      setShowForm(false);
      showNotification("Division added successfully", "success");
    } catch (error) {
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
      if (!res.ok) throw new Error(data.error || "Failed to update");
      await fetchDivisions();
      setFormData({ name: "", remarks: "", agencyId: "", departmentId: "" });
      setEditData(null);
      setShowForm(false);
      showNotification("Division updated successfully", "success");
    } catch (error) {
      showNotification(error.message, "error");
    }
  };

  const handleDelete = async (division) => {
    if (!confirm(`Delete "${division.name}"?`)) return;
    try {
      const res = await fetch("/api/divisions", {
        method: "DELETE",
        body: JSON.stringify({ _id: division._id }),
        headers: { "Content-Type": "application/json" },
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to delete");
      await fetchDivisions();
      showNotification("Division deleted successfully", "success");
    } catch (error) {
      showNotification(error.message, "error");
    }
  };

  const handleEdit = (division) => {
    setEditData(division);
    const agencyId = division.departmentId?.agencyId || "";
    setFormData({
      name: division.name || "",
      remarks: division.remarks || "",
      agencyId: agencyId,
      departmentId: division.departmentId?._id || "",
    });
    setShowForm(true);
  };

  // Filter, sort, pagination
  const filteredDivisions = divisions.filter(
    (d) =>
      (d.name?.toLowerCase() || "").includes(search.toLowerCase()) ||
      (d.remarks?.toLowerCase() || "").includes(search.toLowerCase()) ||
      (d.departmentName?.toLowerCase() || "").includes(search.toLowerCase()) ||
      (d.agencyName?.toLowerCase() || "").includes(search.toLowerCase())
  );

  const sortedDivisions = [...filteredDivisions];
  if (sortConfig.key) {
    sortedDivisions.sort((a, b) => {
      let aVal, bVal;
      if (sortConfig.key === "departmentName") {
        aVal = a.departmentName || "";
        bVal = b.departmentName || "";
      } else if (sortConfig.key === "agencyName") {
        aVal = a.agencyName || "";
        bVal = b.agencyName || "";
      } else {
        aVal = a[sortConfig.key] || "";
        bVal = b[sortConfig.key] || "";
      }
      if (aVal < bVal) return sortConfig.direction === "asc" ? -1 : 1;
      if (aVal > bVal) return sortConfig.direction === "asc" ? 1 : -1;
      return 0;
    });
  }

  const totalPages = Math.ceil(sortedDivisions.length / rowsPerPage);
  const startIndex = (currentPage - 1) * rowsPerPage;
  const paginatedDivisions = sortedDivisions.slice(startIndex, startIndex + rowsPerPage);

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
                setFormData({ name: "", remarks: "", agencyId: "", departmentId: "" });
              }}
              className="flex items-center gap-2 px-3 py-1.5 bg-white border rounded-md text-xs font-medium hover:border-black transition"
            >
              <Plus size={14} /> Division
            </button>
          )}
        </div>

        {/* Notification */}
        {notification && (
          <div className={`mb-4 px-4 py-2 rounded ${notification.type === "success" ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"}`}>
            {notification.message}
          </div>
        )}

        {/* Form */}
        {showForm && (
          <div className="bg-white shadow rounded-xl p-6 mb-6">
            <div className="flex justify-between mb-4">
              <h2 className="text-lg font-semibold">{editData ? "Edit Division" : "Add Division"}</h2>
              <button onClick={() => setShowForm(false)} className="text-xl text-gray-500">✕</button>
            </div>
            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium">Agency</label>
                <select name="agencyId" value={formData.agencyId} onChange={handleFormChange} className="w-full border rounded px-3 py-2">
                  <option value="">-- Select Agency --</option>
                  {agencies.map((a) => (
                    <option key={a._id} value={a._id}>{a.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-sm font-medium">Department</label>
                <select name="departmentId" value={formData.departmentId} onChange={handleFormChange} className="w-full border rounded px-3 py-2" disabled={!formData.agencyId}>
                  <option value="">-- Select Department --</option>
                  {filteredDepartments.map((d) => (
                    <option key={d._id} value={d._id}>{d.name}</option>
                  ))}
                </select>
                {!formData.agencyId && <p className="text-xs text-gray-500">Select an agency first</p>}
              </div>
              <div>
                <label className="text-sm font-medium">Division Name</label>
                <input type="text" name="name" value={formData.name} onChange={handleFormChange} className="w-full border rounded px-3 py-2" />
              </div>
              <div>
                <label className="text-sm font-medium">Remarks</label>
                <input type="text" name="remarks" value={formData.remarks} onChange={handleFormChange} className="w-full border rounded px-3 py-2" />
              </div>
            </div>
            <div className="flex justify-end gap-3 mt-5">
              <button onClick={() => setShowForm(false)} className="px-4 py-2 border rounded">Cancel</button>
              <button onClick={editData ? handleUpdate : handleAdd} className="px-4 py-2 bg-blue-600 text-white rounded">Save</button>
            </div>
          </div>
        )}

        {/* Table */}
        <div className="bg-white shadow rounded-lg overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-sm font-medium uppercase">S/N</th>
                <th onClick={() => handleSort("agencyName")} className="cursor-pointer px-6 py-3 text-left text-sm font-medium uppercase">Agency</th>
                <th onClick={() => handleSort("departmentName")} className="cursor-pointer px-6 py-3 text-left text-sm font-medium uppercase">Department</th>
                <th onClick={() => handleSort("name")} className="cursor-pointer px-6 py-3 text-left text-sm font-medium uppercase">Division</th>
                <th className="px-6 py-3 text-left text-sm font-medium uppercase">Remarks</th>
                <th className="px-6 py-3 text-left text-sm font-medium uppercase">Actions</th>
              </tr>
            </thead>
            <tbody>
              {paginatedDivisions.length > 0 ? (
                paginatedDivisions.map((d, idx) => (
                  <tr key={d._id}>
                    <td className="px-6 py-3 text-sm">{startIndex + idx + 1}</td>
                    <td className="px-6 py-3 text-sm">{d.agencyName || "-"}</td>
                    <td className="px-6 py-3 text-sm">{d.departmentName || "-"}</td>
                    <td className="px-6 py-3 text-sm">{d.name}</td>
                    <td className="px-6 py-3 text-sm">{d.remarks}</td>
                    <td className="px-6 py-3 text-sm flex gap-2">
                      <button onClick={() => handleEdit(d)} className="px-2 py-1 bg-yellow-400 text-white rounded">Edit</button>
                      <button onClick={() => handleDelete(d)} className="px-2 py-1 bg-red-500 text-white rounded">Delete</button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr><td colSpan="6" className="text-center py-6">No records found</td></tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex justify-end gap-4 mt-5 text-sm">
            <button disabled={currentPage === 1} onClick={() => setCurrentPage(p => p-1)}>&lt;</button>
            <span>Page {currentPage} of {totalPages}</span>
            <button disabled={currentPage === totalPages} onClick={() => setCurrentPage(p => p+1)}>&gt;</button>
          </div>
        )}
      </main>
    </div>
  );
}