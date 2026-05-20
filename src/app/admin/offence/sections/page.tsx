"use client";

import { useState, useEffect } from "react";
import { Trash2, Pencil, Save, Check, X, Plus } from "lucide-react";
import Sidebar from "@/components/Sidebar";

interface Act {
  _id: string;
  name: string;
}

interface Section {
  _id: string;
  name: string;
  actId: Act | string;
  actName?: string; // populated from API
  remarks: string;
}

interface Notification {
  message: string;
  type: "success" | "error";
}

export default function SectionsPage() {
  const [sections, setSections] = useState<Section[]>([]);
  const [acts, setActs] = useState<Act[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [editData, setEditData] = useState<Section | null>(null);
  const [search, setSearch] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [sortConfig, setSortConfig] = useState<{
    key: keyof Section | null;
    direction: "asc" | "desc";
  }>({ key: null, direction: "asc" });
  const [notification, setNotification] = useState<Notification | null>(null);
  const [formData, setFormData] = useState({ name: "", actId: "", remarks: "" });

  // Fetch all Acts for dropdown
  const fetchActs = async () => {
    try {
      const res = await fetch("/api/offences/act");
      if (!res.ok) throw new Error();
      const data = await res.json();
      setActs(data);
    } catch (error) {
      showNotification("Failed to load acts", "error");
    }
  };

  // Fetch Sections (all, because we want to show Act name via populate)
  const fetchSections = async () => {
    try {
      const res = await fetch("/api/offences/sections");
      if (!res.ok) throw new Error();
      const data = await res.json();
      // data already has actId populated with { _id, name }
      setSections(data);
    } catch (error) {
      showNotification("Failed to load sections", "error");
    }
  };

  useEffect(() => {
    fetchActs();
    fetchSections();
  }, []);

  const handleFormChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });
  };

  const handleAdd = async () => {
    if (!formData.name.trim()) {
      showNotification("Section name is required", "error");
      return;
    }
    if (!formData.actId) {
      showNotification("Please select an Act", "error");
      return;
    }
    try {
      const res = await fetch("/api/offences/sections", {
        method: "POST",
        body: JSON.stringify({
          name: formData.name,
          actId: formData.actId,
          remarks: formData.remarks,
        }),
        headers: { "Content-Type": "application/json" },
      });
      if (!res.ok) throw new Error();
      await fetchSections();
      setFormData({ name: "", actId: "", remarks: "" });
      setShowForm(false);
      showNotification("Section added successfully", "success");
    } catch (error) {
      showNotification("Failed to add section", "error");
    }
  };

  const handleEdit = (section: Section) => {
    setEditData(section);
    // Extract actId (whether it's object or string)
    const actIdValue =
      typeof section.actId === "object" ? section.actId._id : section.actId;
    setFormData({
      name: section.name,
      actId: actIdValue,
      remarks: section.remarks || "",
    });
    setShowForm(true);
  };

  const handleUpdate = async () => {
    if (!formData.name.trim()) {
      showNotification("Section name is required", "error");
      return;
    }
    if (!formData.actId) {
      showNotification("Please select an Act", "error");
      return;
    }
    try {
      const res = await fetch("/api/offences/sections", {
        method: "PUT",
        body: JSON.stringify({
          _id: editData?._id,
          name: formData.name,
          actId: formData.actId,
          remarks: formData.remarks,
        }),
        headers: { "Content-Type": "application/json" },
      });
      if (!res.ok) throw new Error();
      await fetchSections();
      setFormData({ name: "", actId: "", remarks: "" });
      setEditData(null);
      setShowForm(false);
      showNotification("Section updated successfully", "success");
    } catch (error) {
      showNotification("Failed to update section", "error");
    }
  };

  const handleDelete = async (section: Section) => {
    if (!confirm(`Delete section "${section.name}"?`)) return;
    try {
      const res = await fetch("/api/offences/sections", {
        method: "DELETE",
        body: JSON.stringify({ _id: section._id }),
        headers: { "Content-Type": "application/json" },
      });
      if (!res.ok) throw new Error();
      await fetchSections();
      showNotification("Section deleted successfully", "success");
    } catch (error) {
      showNotification("Failed to delete section", "error");
    }
  };

  const showNotification = (message: string, type: "success" | "error") => {
    setNotification({ message, type });
    setTimeout(() => setNotification(null), 3000);
  };

  const handleSort = (key: keyof Section) => {
    let direction: "asc" | "desc" = "asc";
    if (sortConfig.key === key && sortConfig.direction === "asc")
      direction = "desc";
    setSortConfig({ key, direction });
  };

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearch(e.target.value);
    setCurrentPage(1);
  };

  const handleRowsChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setRowsPerPage(Number(e.target.value));
    setCurrentPage(1);
  };

  // Helper: get Act name from section
  const getActName = (section: Section): string => {
    if (typeof section.actId === "object" && section.actId !== null) {
      return section.actId.name;
    }
    return section.actName || "Unknown Act";
  };

  // Filter & Sort
  const filteredSections = sections.filter((section) => {
    const actName = getActName(section);
    return (
      (section.name?.toLowerCase() || "").includes(search.toLowerCase()) ||
      actName.toLowerCase().includes(search.toLowerCase()) ||
      (section.remarks?.toLowerCase() || "").includes(search.toLowerCase())
    );
  });

  const sortedSections = [...filteredSections];
  if (sortConfig.key) {
    sortedSections.sort((a, b) => {
      let aVal = "",
        bVal = "";
      if (sortConfig.key === "name") {
        aVal = a.name || "";
        bVal = b.name || "";
      } else if (sortConfig.key === "remarks") {
        aVal = a.remarks || "";
        bVal = b.remarks || "";
      } else if (sortConfig.key === "actId") {
        aVal = getActName(a);
        bVal = getActName(b);
      }
      if (aVal < bVal) return sortConfig.direction === "asc" ? -1 : 1;
      if (aVal > bVal) return sortConfig.direction === "asc" ? 1 : -1;
      return 0;
    });
  }

  const totalPages = Math.ceil(sortedSections.length / rowsPerPage);
  const startIndex = (currentPage - 1) * rowsPerPage;
  const paginatedSections = sortedSections.slice(
    startIndex,
    startIndex + rowsPerPage
  );

  return (
    <div className="flex">
      <Sidebar />
      <main className="flex-1 p-6 ml-64 bg-gray-100 min-h-screen">
        {/* Header */}
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold">Section List</h1>
          {!showForm && (
            <button
              onClick={() => {
                setShowForm(true);
                setEditData(null);
                setFormData({ name: "", actId: "", remarks: "" });
              }}
              className="flex items-center gap-2 px-3 py-1.5 bg-white border rounded-md text-xs font-medium hover:border-black transition"
            >
              <Plus size={14} />
              Add Section
            </button>
          )}
        </div>

        {/* Notification */}
        {notification && (
          <div
            className={`mb-4 px-4 py-2 rounded ${
              notification.type === "success"
                ? "bg-green-100 text-green-700"
                : "bg-red-100 text-red-700"
            }`}
          >
            {notification.message}
          </div>
        )}

        {/* Add/Edit Form */}
        {showForm && (
          <div className="bg-white shadow rounded-xl p-6 mb-6">
            <div className="flex justify-between mb-4">
              <h2 className="text-lg font-semibold">
                {editData ? "Edit Section" : "Add Section"}
              </h2>
              <button
                onClick={() => setShowForm(false)}
                className="text-xl text-gray-500"
              >
                ✕
              </button>
            </div>

            <div className="grid md:grid-cols-2 gap-4">
              {/* Act Dropdown */}
              <div>
                <label className="text-sm font-medium">Act</label>
                <select
                  name="actId"
                  value={formData.actId}
                  onChange={handleFormChange}
                  className="w-full border rounded px-3 py-2"
                  required
                >
                  <option value="">Select Act</option>
                  {acts.map((act) => (
                    <option key={act._id} value={act._id}>
                      {act.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-sm font-medium">Section Name</label>
                <input
                  name="name"
                  type="text"
                  value={formData.name}
                  onChange={handleFormChange}
                  className="w-full border rounded px-3 py-2"
                  placeholder="e.g., Section 302, Article 14, etc."
                />
              </div>
              <div className="md:col-span-2">
                <label className="text-sm font-medium">Remarks</label>
                <input
                  name="remarks"
                  type="text"
                  value={formData.remarks}
                  onChange={handleFormChange}
                  className="w-full border rounded px-3 py-2"
                />
              </div>
            </div>

            <div className="flex justify-end gap-3 mt-5">
              <button
                onClick={() => setShowForm(false)}
                className="flex items-center gap-2 px-3 py-1.5 border rounded-md text-xs font-medium hover:border-black transition"
              >
                <X size={14} /> Cancel
              </button>
              <button
                onClick={editData ? handleUpdate : handleAdd}
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
            placeholder="Search by section name, act, or remarks..."
            className="w-64 px-4 py-2 border rounded focus:ring-2 focus:ring-blue-400 outline-none"
          />
          <div className="flex items-center gap-2 text-sm">
            <span>Show</span>
            <select
              value={rowsPerPage}
              onChange={handleRowsChange}
              className="border rounded px-2 py-1"
            >
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
                <th className="px-6 py-3 text-left text-sm font-medium uppercase">
                  S/N
                </th>
                <th
                  onClick={() => handleSort("actId")}
                  className="px-6 py-3 text-left text-sm font-medium uppercase cursor-pointer select-none"
                >
                  Act{" "}
                  {sortConfig.key === "actId"
                    ? sortConfig.direction === "asc"
                      ? "▲"
                      : "▼"
                    : "▲▼"}
                </th>
                <th
                  onClick={() => handleSort("name")}
                  className="px-6 py-3 text-left text-sm font-medium uppercase cursor-pointer select-none"
                >
                  Section Name{" "}
                  {sortConfig.key === "name"
                    ? sortConfig.direction === "asc"
                      ? "▲"
                      : "▼"
                    : "▲▼"}
                </th>
                <th
                  onClick={() => handleSort("remarks")}
                  className="px-6 py-3 text-left text-sm font-medium uppercase cursor-pointer select-none"
                >
                  Remarks{" "}
                  {sortConfig.key === "remarks"
                    ? sortConfig.direction === "asc"
                      ? "▲"
                      : "▼"
                    : "▲▼"}
                </th>
                <th className="px-6 py-3 text-left text-sm font-medium uppercase">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {paginatedSections.length > 0 ? (
                paginatedSections.map((section, idx) => (
                  <tr
                    key={section._id}
                    className="hover:bg-gray-100 transition-colors"
                  >
                    <td className="px-6 py-3 text-sm">{startIndex + idx + 1}</td>
                    <td className="px-6 py-3 text-sm">{getActName(section)}</td>
                    <td className="px-6 py-3 text-sm">{section.name}</td>
                    <td className="px-6 py-3 text-sm">
                      {section.remarks || "—"}
                    </td>
                    <td className="px-6 py-3 text-sm flex gap-2">
                      <button
                        onClick={() => handleEdit(section)}
                        className="flex items-center gap-2 px-3 py-1.5 border rounded-md text-xs font-medium hover:border-black transition"
                      >
                        <Pencil size={14} /> Edit
                      </button>
                      <button
                        onClick={() => handleDelete(section)}
                        className="flex items-center gap-2 px-3 py-1.5 border rounded-md text-xs font-medium hover:border-black transition"
                      >
                        <Trash2 size={14} /> Delete
                      </button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={5} className="text-center py-6 text-gray-500">
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
              className={`font-semibold text-lg ${
                currentPage === 1
                  ? "text-gray-400 cursor-not-allowed"
                  : "hover:text-blue-600"
              }`}
            >
              &lt;
            </button>
            <span>
              Page {currentPage} of {totalPages}
            </span>
            <button
              disabled={currentPage === totalPages}
              onClick={() => setCurrentPage(currentPage + 1)}
              className={`font-semibold text-lg ${
                currentPage === totalPages
                  ? "text-gray-400 cursor-not-allowed"
                  : "hover:text-blue-600"
              }`}
            >
              &gt;
            </button>
          </div>
        )}
      </main>
    </div>
  );
}