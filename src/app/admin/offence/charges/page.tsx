"use client";

import { useState, useEffect } from "react";
import { Trash2, Pencil, Check, X, Plus } from "lucide-react";
import Sidebar from "@/components/Sidebar";

// Types
type Act = { _id: string; name: string };
type Section = { _id: string; name: string; actId: Act | string };
type Charge = { _id: string; name: string; sectionId: Section | string; remarks: string };

export default function ChargesPage() {
  const [charges, setCharges] = useState<Charge[]>([]);
  const [acts, setActs] = useState<Act[]>([]);
  const [sections, setSections] = useState<Section[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [editData, setEditData] = useState<Charge | null>(null);
  const [search, setSearch] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [sortConfig, setSortConfig] = useState<{
    key: string | null;
    direction: "asc" | "desc";
  }>({ key: null, direction: "asc" });
  const [notification, setNotification] = useState<{
    message: string;
    type: "success" | "error";
  } | null>(null);
  const [formData, setFormData] = useState({
    name: "",
    actId: "",
    sectionId: "",
    remarks: "",
  });

  // Fetch all Acts for dropdown
  const fetchActs = async () => {
    try {
      const res = await fetch("/api/offences/act");
      if (!res.ok) throw new Error();
      const data = await res.json();
      setActs(data);
    } catch {
      showNotification("Failed to load acts", "error");
    }
  };

  // Fetch Sections based on selected Act
  const fetchSections = async (actId: string) => {
    if (!actId) {
      setSections([]);
      return;
    }
    try {
      const res = await fetch(`/api/offences/sections?actId=${actId}`);
      if (!res.ok) throw new Error();
      const data = await res.json();
      setSections(data);
    } catch {
      showNotification("Failed to load sections", "error");
    }
  };

  // Fetch all Charges (with populated sectionId)
  const fetchCharges = async () => {
    try {
      const res = await fetch("/api/offences/charges");
      if (!res.ok) throw new Error();
      const data = await res.json();
      setCharges(data);
    } catch {
      showNotification("Failed to load charges", "error");
    }
  };

  useEffect(() => {
    fetchActs();
    fetchCharges();
  }, []);

  // Handle form input changes
  const handleFormChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    if (name === "actId") {
      setFormData((prev) => ({ ...prev, sectionId: "" }));
      fetchSections(value);
    }
  };

  // Add new charge
  const handleAdd = async () => {
    if (!formData.name.trim())
      return showNotification("Charge Name is required", "error");
    if (!formData.sectionId)
      return showNotification("Please select a Section", "error");
    try {
      const res = await fetch("/api/offences/charges", {
        method: "POST",
        body: JSON.stringify({
          name: formData.name,
          sectionId: formData.sectionId,
          remarks: formData.remarks,
        }),
        headers: { "Content-Type": "application/json" },
      });
      if (!res.ok) throw new Error();
      await fetchCharges();
      setFormData({ name: "", actId: "", sectionId: "", remarks: "" });
      setSections([]);
      setShowForm(false);
      showNotification("Charge added successfully", "success");
    } catch {
      showNotification("Failed to add charge", "error");
    }
  };

  // Edit charge
  const handleEdit = (charge: Charge) => {
    // The sectionId should be populated at this point
    const section = charge.sectionId as Section;
    const actId = typeof section.actId === "object" ? section.actId._id : section.actId;
    setEditData(charge);
    setFormData({
      name: charge.name,
      actId,
      sectionId: section._id,
      remarks: charge.remarks || "",
    });
    fetchSections(actId);
    setShowForm(true);
  };

  // Update charge
  const handleUpdate = async () => {
    if (!formData.name.trim())
      return showNotification("Charge Name is required", "error");
    if (!formData.sectionId)
      return showNotification("Please select a Section", "error");
    try {
      const res = await fetch("/api/offences/charges", {
        method: "PUT",
        body: JSON.stringify({
          _id: editData?._id,
          name: formData.name,
          sectionId: formData.sectionId,
          remarks: formData.remarks,
        }),
        headers: { "Content-Type": "application/json" },
      });
      if (!res.ok) throw new Error();
      await fetchCharges();
      setFormData({ name: "", actId: "", sectionId: "", remarks: "" });
      setSections([]);
      setEditData(null);
      setShowForm(false);
      showNotification("Charge updated successfully", "success");
    } catch {
      showNotification("Failed to update charge", "error");
    }
  };

  // Delete charge
  const handleDelete = async (charge: Charge) => {
    if (!confirm(`Delete "${charge.name}"?`)) return;
    try {
      const res = await fetch("/api/offences/charges", {
        method: "DELETE",
        body: JSON.stringify({ _id: charge._id }),
        headers: { "Content-Type": "application/json" },
      });
      if (!res.ok) throw new Error();
      await fetchCharges();
      showNotification("Charge deleted successfully", "success");
    } catch {
      showNotification("Failed to delete charge", "error");
    }
  };

  const showNotification = (message: string, type: "success" | "error") => {
    setNotification({ message, type });
    setTimeout(() => setNotification(null), 3000);
  };

  // Helper to get Act name from a Charge (safe)
  const getActName = (charge: Charge): string => {
    const section = charge.sectionId as any;
    if (section && section.actId) {
      if (typeof section.actId === "object") return section.actId.name;
    }
    return "Unknown Act";
  };

  // Helper to get Section name from a Charge
  const getSectionName = (charge: Charge): string => {
    const section = charge.sectionId as any;
    return section?.name || "Unknown Section";
  };

  // Filter charges by search term (case‑insensitive, includes Act, Section, Charge name, Remarks)
  const filtered = charges.filter((c) => {
    const act = getActName(c).toLowerCase();
    const sec = getSectionName(c).toLowerCase();
    const name = c.name.toLowerCase();
    const rem = (c.remarks || "").toLowerCase();
    const q = search.toLowerCase();
    return act.includes(q) || sec.includes(q) || name.includes(q) || rem.includes(q);
  });

  // Sorting logic
  const sorted = [...filtered];
  if (sortConfig.key) {
    sorted.sort((a, b) => {
      let aVal = "",
        bVal = "";
      if (sortConfig.key === "name") {
        aVal = a.name;
        bVal = b.name;
      } else if (sortConfig.key === "remarks") {
        aVal = a.remarks || "";
        bVal = b.remarks || "";
      } else if (sortConfig.key === "sectionId") {
        aVal = getSectionName(a);
        bVal = getSectionName(b);
      } else if (sortConfig.key === "actId") {
        aVal = getActName(a);
        bVal = getActName(b);
      }
      if (aVal < bVal) return sortConfig.direction === "asc" ? -1 : 1;
      if (aVal > bVal) return sortConfig.direction === "asc" ? 1 : -1;
      return 0;
    });
  }

  // Pagination
  const totalPages = Math.ceil(sorted.length / rowsPerPage);
  const start = (currentPage - 1) * rowsPerPage;
  const paginated = sorted.slice(start, start + rowsPerPage);

  const handleSort = (key: string) => {
    const direction =
      sortConfig.key === key && sortConfig.direction === "asc" ? "desc" : "asc";
    setSortConfig({ key, direction });
  };

  return (
    <div className="flex">
      <Sidebar />
      <main className="flex-1 p-6 ml-64 bg-gray-100 min-h-screen">
        {/* Header */}
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold">Charge List</h1>
          {!showForm && (
            <button
              onClick={() => {
                setShowForm(true);
                setEditData(null);
                setFormData({ name: "", actId: "", sectionId: "", remarks: "" });
                setSections([]);
              }}
              className="flex items-center gap-2 px-3 py-1.5 bg-white border rounded-md text-xs font-medium hover:border-black transition"
            >
              <Plus size={14} /> Add Charge
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
                {editData ? "Edit Charge" : "Add Charge"}
              </h2>
              <button
                onClick={() => setShowForm(false)}
                className="text-xl text-gray-500"
              >
                ✕
              </button>
            </div>
            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium">Act *</label>
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
                <label className="text-sm font-medium">Section *</label>
                <select
                  name="sectionId"
                  value={formData.sectionId}
                  onChange={handleFormChange}
                  className="w-full border rounded px-3 py-2"
                  disabled={!formData.actId}
                  required
                >
                  <option value="">Select Section</option>
                  {sections.map((sec) => (
                    <option key={sec._id} value={sec._id}>
                      {sec.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-sm font-medium">Charge Name *</label>
                <input
                  name="name"
                  type="text"
                  value={formData.name}
                  onChange={handleFormChange}
                  className="w-full border rounded px-3 py-2"
                  placeholder="e.g., Theft, Assault, etc."
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
                {editData ? <Check size={14} /> : <Plus size={14} />}
                {editData ? "Update" : "Save"}
              </button>
            </div>
          </div>
        )}

        {/* Toolbar with search */}
        <div className="flex justify-between items-center mb-4">
          <input
            type="text"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setCurrentPage(1);
            }}
            placeholder="Search by Act, Section, Charge Name, or Remarks..."
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
              {[10, 20, 30, 40].map((n) => (
                <option key={n} value={n}>
                  {n}
                </option>
              ))}
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
                  onClick={() => handleSort("sectionId")}
                  className="px-6 py-3 text-left text-sm font-medium uppercase cursor-pointer select-none"
                >
                  Section{" "}
                  {sortConfig.key === "sectionId"
                    ? sortConfig.direction === "asc"
                      ? "▲"
                      : "▼"
                    : "▲▼"}
                </th>
                <th
                  onClick={() => handleSort("name")}
                  className="px-6 py-3 text-left text-sm font-medium uppercase cursor-pointer select-none"
                >
                  Charge Name{" "}
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
              {paginated.length > 0 ? (
                paginated.map((charge, idx) => (
                  <tr
                    key={charge._id}
                    className="hover:bg-gray-100 transition-colors"
                  >
                    <td className="px-6 py-3 text-sm">{start + idx + 1}</td>
                    <td className="px-6 py-3 text-sm">{getActName(charge)}</td>
                    <td className="px-6 py-3 text-sm">{getSectionName(charge)}</td>
                    <td className="px-6 py-3 text-sm font-medium">
                      {charge.name}
                    </td>
                    <td className="px-6 py-3 text-sm">
                      {charge.remarks || "—"}
                    </td>
                    <td className="px-6 py-3 text-sm flex gap-2">
                      <button
                        onClick={() => handleEdit(charge)}
                        className="flex items-center gap-2 px-3 py-1.5 border rounded-md text-xs font-medium hover:border-black transition"
                      >
                        <Pencil size={14} /> Edit
                      </button>
                      <button
                        onClick={() => handleDelete(charge)}
                        className="flex items-center gap-2 px-3 py-1.5 border rounded-md text-xs font-medium hover:border-black transition"
                      >
                        <Trash2 size={14} /> Delete
                      </button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td
                    colSpan={6}
                    className="text-center py-6 text-gray-500"
                  >
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
              onClick={() => setCurrentPage((p) => p - 1)}
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
              onClick={() => setCurrentPage((p) => p + 1)}
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