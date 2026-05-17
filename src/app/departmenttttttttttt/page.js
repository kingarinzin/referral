"use client";


import { useState, useEffect } from "react";
import Sidebar from "@/components/Sidebar";


export default function AddDepartmentPage() {
 const [departments, setDepartments] = useState([]);
 const [showForm, setShowForm] = useState(false);
 const [editData, setEditData] = useState(null); // For editing
 const [search, setSearch] = useState("");
 const [currentPage, setCurrentPage] = useState(1);
 const [rowsPerPage, setRowsPerPage] = useState(10);
 const [sortConfig, setSortConfig] = useState({ key: null, direction: "asc" });
 const [notification, setNotification] = useState(null); // For notifications


 const [formData, setFormData] = useState({ name: "", remarks: "" });


 // ================== FETCH DEPARTMENTS ==================
 const fetchDepartments = async () => {
   try {
     const res = await fetch("/api/departments");
     const data = await res.json();
     setDepartments(data);
   } catch (error) {
     console.error(error);
   }
 };


 useEffect(() => {
   fetchDepartments();
 }, []);


 // ================== HANDLERS ==================
 const handleFormChange = (e) => {
   const { name, value } = e.target;
   setFormData({ ...formData, [name]: value });
 };


 const handleAdd = async () => {
   if (!formData.name) {
     showNotification("Department Name is required", "error");
     return;
   }
   try {
     const res = await fetch("/api/departments", {
       method: "POST",
       body: JSON.stringify(formData),
       headers: { "Content-Type": "application/json" },
     });
     if (!res.ok) throw new Error("Failed to add");
     await fetchDepartments();
     setFormData({ name: "", remarks: "" });
     setShowForm(false);
     showNotification("Department added successfully", "success");
   } catch (error) {
     showNotification(error.message, "error");
   }
 };


 const handleEdit = (dept) => {
   setEditData(dept);
   setFormData({ name: dept.name, remarks: dept.remarks });
   setShowForm(true);
 };


 const handleUpdate = async () => {
   try {
     const res = await fetch("/api/departments", {
       method: "PUT",
       body: JSON.stringify({ ...formData, _id: editData._id }),
       headers: { "Content-Type": "application/json" },
     });
     if (!res.ok) throw new Error("Failed to update");
     await fetchDepartments();
     setFormData({ name: "", remarks: "" });
     setEditData(null);
     setShowForm(false);
     showNotification("Department updated successfully", "success");
   } catch (error) {
     showNotification(error.message, "error");
   }
 };


 const handleDelete = async (dept) => {
   if (!confirm(`Are you sure you want to delete "${dept.name}"?`)) return;
   try {
     const res = await fetch("/api/departments", {
       method: "DELETE",
       body: JSON.stringify({ _id: dept._id }),
       headers: { "Content-Type": "application/json" },
     });
     if (!res.ok) throw new Error("Failed to delete");
     await fetchDepartments();
     showNotification("Department deleted successfully", "success");
   } catch (error) {
     showNotification(error.message, "error");
   }
 };


 const showNotification = (message, type = "success") => {
   setNotification({ message, type });
   setTimeout(() => setNotification(null), 3000);
 };


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


 // ================== FILTER & SORT ==================
 const filteredDepartments = departments.filter(
   (dept) =>
     (dept.name?.toLowerCase() || "").includes(search.toLowerCase()) ||
     (dept.remarks?.toLowerCase() || "").includes(search.toLowerCase())
 );


 const sortedDepartments = [...filteredDepartments];
 if (sortConfig.key) {
   sortedDepartments.sort((a, b) => {
     if (a[sortConfig.key] < b[sortConfig.key]) return sortConfig.direction === "asc" ? -1 : 1;
     if (a[sortConfig.key] > b[sortConfig.key]) return sortConfig.direction === "asc" ? 1 : -1;
     return 0;
   });
 }


 const totalPages = Math.ceil(sortedDepartments.length / rowsPerPage);
 const startIndex = (currentPage - 1) * rowsPerPage;
 const endIndex = startIndex + rowsPerPage;
 const paginatedDepartments = sortedDepartments.slice(startIndex, endIndex);


 return (
   <div className="flex">
     <Sidebar />


     <main className="flex-1 p-6 ml-64 bg-gray-100 min-h-screen">
       {/* Header */}
       <div className="flex justify-between items-center mb-6">
         <h1 className="text-2xl font-bold">Department List</h1>
         {!showForm && (
           <button
             onClick={() => { setShowForm(true); setEditData(null); setFormData({ name: "", remarks: "" }); }}
             className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
           >
             + Add Department
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
             <h2 className="text-lg font-semibold">
               {editData ? "Edit Department" : "Add Department"}
             </h2>
             <button
               onClick={() => setShowForm(false)}
               className="text-xl text-gray-500"
             >✕</button>
           </div>


           <div className="grid md:grid-cols-2 gap-4">
             <div>
               <label className="text-sm font-medium">Department Name</label>
               <input
                 name="name"
                 type="text"
                 value={formData.name}
                 onChange={handleFormChange}
                 className="w-full border rounded px-3 py-2"
               />
             </div>
             <div>
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
               className="px-4 py-2 border rounded"
             >
               Cancel
             </button>
             <button
               onClick={editData ? handleUpdate : handleAdd}
               className="px-4 py-2 bg-blue-600 text-white rounded"
             >
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
           placeholder="Search department..."
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
                 onClick={() => handleSort("name")}
                 className={`px-6 py-3 text-left text-sm font-medium uppercase cursor-pointer select-none
                   ${sortConfig.key === "name" ? "bg-blue-100" : ""}`}
               >
                 Department Name {sortConfig.key === "name" ? (sortConfig.direction === "asc" ? "▲" : "▼") : "▲▼"}
               </th>
               <th
                 onClick={() => handleSort("remarks")}
                 className={`px-6 py-3 text-left text-sm font-medium uppercase cursor-pointer select-none
                   ${sortConfig.key === "remarks" ? "bg-blue-100" : ""}`}
               >
                 Remarks {sortConfig.key === "remarks" ? (sortConfig.direction === "asc" ? "▲" : "▼") : "▲▼"}
               </th>
               <th className="px-6 py-3 text-left text-sm font-medium uppercase">Actions</th>
             </tr>
           </thead>
           <tbody className="divide-y divide-gray-200">
             {paginatedDepartments.length > 0 ? (
               paginatedDepartments.map((dept, index) => (
                 <tr key={dept._id} className="hover:bg-gray-100 transition-colors">
                   <td className="px-6 py-3 text-sm">{startIndex + index + 1}</td>
                   <td className="px-6 py-3 text-sm">{dept.name}</td>
                   <td className="px-6 py-3 text-sm">{dept.remarks}</td>
                   <td className="px-6 py-3 text-sm flex gap-2">
                     <button
                       onClick={() => handleEdit(dept)}
                       className="px-2 py-1 bg-yellow-400 rounded text-white"
                     >
                       Edit
                     </button>
                     <button
                       onClick={() => handleDelete(dept)}
                       className="px-2 py-1 bg-red-500 rounded text-white"
                     >
                       Delete
                     </button>
                   </td>
                 </tr>
               ))
             ) : (
               <tr>
                 <td colSpan="4" className="text-center py-6 text-gray-500">
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
           <span>Page {currentPage} of {totalPages}</span>
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



