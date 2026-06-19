"use client";

import { useState, useEffect, useMemo } from "react";
import {
  Search, Save, AlertTriangle, CheckCircle, X, Loader2, User, Trash2, Eye, RefreshCw,
  TrendingUp, PieChart as PieChartIcon, BarChart3
} from "lucide-react";
import Sidebar from "@/components/Sidebar";
import {
  PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, AreaChart, Area
} from "recharts";

// Full type matching the census API response
type CitizenDetails = {
  cid: string;
  country: string | null;
  dob: string;
  fatherName: string;
  firstIssuedDate: string;
  fatherCIDNo: string;
  firstName: string;
  gender: string;
  householdNo: string;
  lastName: string;
  middleName: string | null;
  mobileNumber: string;
  motherCIDNo: string;
  motherName: string;
  occupation: string;
  dzongkhagId: string;
  dzongkhagName: string;
  gewogId: string;
  gewogName: string;
  houseNo: string;
  thramNo: string;
  villageSerialNo: string;
  villageName: string;
  placeOfBirth: string | null;
  firstDzoName: string;
  middleDzoName: string | null;
  lastDzoName: string;
  religion: string;
  qualification: string;
  fullName?: string;
};

type MOPRecord = {
  _id: string;
  cid: string;
  name: string;
  dob: string;
  gender: string;
  status: 'DRAFT' | 'ACTIVE' | 'RESOLVED';
  reportedAt: string | null;
  createdAt: string;
  updatedAt: string;
  remarks: string;
  occupation: string;
  qualification: string;
  mobileNumber: string;
  fatherName: string;
  motherName: string;
  dzongkhagName: string;
  gewogName: string;
  villageName: string;
  photoBase64: string | null;
  reportedBy: string;
  category?: string;
  citizenDetails?: CitizenDetails | null;
};

type Notification = {
  message: string;
  type: "success" | "error" | "info";
};

const COLORS = ['#3B82F6', '#EF4444', '#F59E0B', '#10B981', '#8B5CF6'];

export default function MOPPage() {
  // State for CID input and search
  const [cid, setCid] = useState("");
  const [loading, setLoading] = useState(false);
  const [fetchError, setFetchError] = useState<string | null>(null);
  
  // Fetched person data
  const [person, setPerson] = useState<CitizenDetails | null>(null);
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);
  const [photoBase64, setPhotoBase64] = useState<string | null>(null);
  
  // Viewing state (from list)
  const [viewingRecord, setViewingRecord] = useState<MOPRecord | null>(null);
  
  // Reporting state
  const [reporting, setReporting] = useState(false);
  const [reportSuccess, setReportSuccess] = useState(false);
  const [saving, setSaving] = useState(false);
  
  // MOP list
  const [records, setRecords] = useState<MOPRecord[]>([]);
  const [listLoading, setListLoading] = useState(false);
  const [actionId, setActionId] = useState<string | null>(null);
  
  // Notification
  const [notification, setNotification] = useState<Notification | null>(null);
  
  // Remarks
  const [remarks, setRemarks] = useState("");
  const [category, setCategory] = useState<string>("INVESTIGATION");

  // Show notification helper
  const showNotification = (message: string, type: "success" | "error" | "info" = "success") => {
    setNotification({ message, type });
    setTimeout(() => setNotification(null), 4000);
  };

  // Fetch MOP list from API
  const fetchMOPList = async () => {
    setListLoading(true);
    try {
      const res = await fetch('/api/mop/list');
      if (!res.ok) throw new Error('Failed to fetch list');
      const data = await res.json();
      setRecords(data);
      return data;
    } catch (err: any) {
      console.error('List fetch error:', err);
    } finally {
      setListLoading(false);
    }
  };

  // Load list on mount
  useEffect(() => {
    fetchMOPList();
  }, []);

  // ========== Dashboard Computations ==========
  const total = records.length;
  const activeCount = records.filter(r => r.status === 'ACTIVE').length;
  const draftCount = records.filter(r => r.status === 'DRAFT').length;
  const resolvedCount = records.filter(r => r.status === 'RESOLVED').length;

  // Status distribution for pie chart
  const statusData = [
    { name: 'Active', value: activeCount },
    { name: 'Draft', value: draftCount },
    { name: 'Resolved', value: resolvedCount },
  ].filter(d => d.value > 0);

  // Category distribution for bar chart
  const categoryCounts: Record<string, number> = {};
  records.forEach(r => {
    const cat = r.category || 'UNKNOWN';
    categoryCounts[cat] = (categoryCounts[cat] || 0) + 1;
  });
  const categoryData = Object.entries(categoryCounts).map(([name, value]) => ({
    name: name.replace('_', ' '),
    value,
  }));

  // Trend data: group by date (last 7 days)
  const trendData = useMemo(() => {
    const last7Days = Array.from({ length: 7 }, (_, i) => {
      const d = new Date();
      d.setDate(d.getDate() - i);
      return d.toISOString().split('T')[0];
    }).reverse();

    const counts = last7Days.map(date => {
      const count = records.filter(r => r.createdAt.startsWith(date)).length;
      return { date, count };
    });
    return counts;
  }, [records]);

  // Recent 5 records
  const recentRecords = records.slice(0, 5);

  // Determine if we are viewing a draft (editable)
  const isViewingDraft = viewingRecord && viewingRecord.status === 'DRAFT';
  const isViewingActive = viewingRecord && viewingRecord.status === 'ACTIVE';

  // ========== End Dashboard Computations ==========

  // Helper: compute time elapsed since reportedAt with date display
  const getTimeElapsed = (reportedAt: string | null) => {
    if (!reportedAt) return '-';
    const now = new Date().getTime();
    const then = new Date(reportedAt).getTime();
    const diff = now - then;
    if (diff < 0) return '—';
    const seconds = Math.floor(diff / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);
    let elapsed = '';
    if (days > 0) {
      elapsed = `${days}d ${hours % 24}h`;
    } else if (hours > 0) {
      elapsed = `${hours}h ${minutes % 60}m`;
    } else if (minutes > 0) {
      elapsed = `${minutes}m`;
    } else {
      elapsed = `${seconds}s`;
    }
    const date = new Date(reportedAt);
    const dateStr = date.toLocaleString('en-GB', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    });
    let result = `Reported ${dateStr} (${elapsed} ago`;
    if (days > 0) {
      result += ` - ${days} days`;
    }
    result += `)`;
    return result;
  };

  // 1. Search by CID → call census APIs
  const handleSearch = async () => {
    if (!cid.trim()) {
      showNotification("Please enter a valid CID number", "error");
      return;
    }
    setLoading(true);
    setFetchError(null);
    setPerson(null);
    setPhotoUrl(null);
    setPhotoBase64(null);
    setReportSuccess(false);
    setViewingRecord(null);
    setCategory("INVESTIGATION");
    setRemarks("");

    try {
      const personApiUrl = `/api/census/person/${cid}`;
      const photoApiUrl = `/api/census/photo/${cid}`;
      const personRes = await fetch(personApiUrl);
      if (!personRes.ok) {
        if (personRes.status === 404) throw new Error("CID not found in census");
        throw new Error("Failed to fetch person details");
      }
      const personData: CitizenDetails = await personRes.json();
      setPerson(personData);

      // Fetch photo
      try {
        const photoRes = await fetch(photoApiUrl);
        if (photoRes.ok) {
          const blob = await photoRes.blob();
          const reader = new FileReader();
          reader.onloadend = () => {
            const base64 = (reader.result as string).split(',')[1];
            setPhotoBase64(base64);
            setPhotoUrl(`data:image/jpeg;base64,${base64}`);
          };
          reader.readAsDataURL(blob);
        } else {
          console.warn("Photo not available");
        }
      } catch (err) {
        console.warn("Photo fetch failed", err);
      }

      showNotification("Person details fetched successfully", "success");
    } catch (err: any) {
      setFetchError(err.message);
      showNotification(err.message, "error");
    } finally {
      setLoading(false);
    }
  };

  // 2. Save to MOP List as DRAFT (also used for updating draft from view)
  const saveDraft = async (payload: any) => {
    const res = await fetch('/api/mop/save', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Save failed');
    return data;
  };

  // 3. Save Draft (from search)
  const handleSaveDraft = async () => {
    if (!person) return;
    setSaving(true);
    try {
      const payload = {
        cid: person.cid,
        name: person.fullName || `${person.firstName} ${person.lastName}`.trim(),
        dob: person.dob,
        gender: person.gender,
        occupation: person.occupation,
        qualification: person.qualification || "",
        mobileNumber: person.mobileNumber,
        fatherName: person.fatherName,
        motherName: person.motherName,
        dzongkhagName: person.dzongkhagName,
        gewogName: person.gewogName,
        villageName: person.villageName,
        photoBase64: photoBase64,
        remarks: remarks,
        reportedBy: "current_user_id",
        citizenDetails: person,
        category: category,
      };
      await saveDraft(payload);
      showNotification('Saved to MOP list as draft.', 'success');
      // Clear details
      setPerson(null);
      setPhotoUrl(null);
      setPhotoBase64(null);
      setViewingRecord(null);
      setRemarks('');
      setCategory('INVESTIGATION');
      fetchMOPList();
    } catch (err: any) {
      showNotification(err.message, 'error');
    } finally {
      setSaving(false);
    }
  };

  // 4. Update Draft (when viewing a draft record)
  const handleUpdateDraft = async () => {
    if (!person || !viewingRecord) return;
    setSaving(true);
    try {
      const payload = {
        cid: person.cid,
        name: person.fullName || `${person.firstName} ${person.lastName}`.trim(),
        dob: person.dob,
        gender: person.gender,
        occupation: person.occupation,
        qualification: person.qualification || "",
        mobileNumber: person.mobileNumber,
        fatherName: person.fatherName,
        motherName: person.motherName,
        dzongkhagName: person.dzongkhagName,
        gewogName: person.gewogName,
        villageName: person.villageName,
        photoBase64: photoBase64,
        remarks: remarks,
        reportedBy: "current_user_id",
        citizenDetails: person,
        category: category,
      };
      await saveDraft(payload);
      showNotification('Draft updated successfully.', 'success');
      // Refresh list and re‑fetch the updated record
      const updatedList = await fetchMOPList();
      const updatedRecord = updatedList.find((r: MOPRecord) => r.cid === person.cid);
      if (updatedRecord) {
        handleViewRecord(updatedRecord); // re‑open with updated data
      } else {
        handleCloseDetails();
      }
    } catch (err: any) {
      showNotification(err.message, 'error');
    } finally {
      setSaving(false);
    }
  };

  // 5. Report Missing (immediate) - saves draft first then reports
  const handleReportMissing = async () => {
    if (!person) return;
    setReporting(true);
    try {
      // Save draft first
      const payload = {
        cid: person.cid,
        name: person.fullName || `${person.firstName} ${person.lastName}`.trim(),
        dob: person.dob,
        gender: person.gender,
        occupation: person.occupation,
        qualification: person.qualification || "",
        mobileNumber: person.mobileNumber,
        fatherName: person.fatherName,
        motherName: person.motherName,
        dzongkhagName: person.dzongkhagName,
        gewogName: person.gewogName,
        villageName: person.villageName,
        photoBase64: photoBase64,
        remarks: remarks,
        reportedBy: "current_user_id",
        citizenDetails: person,
        category: category,
      };
      await saveDraft(payload);

      // Then report
      const reportRes = await fetch('/api/mop/report', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          cid: person.cid,
          remarks,
          reportedBy: "current_user_id",
        }),
      });
      const data = await reportRes.json();
      if (!reportRes.ok) throw new Error(data.error || 'Report failed');

      setReportSuccess(true);
      showNotification('Missing person reported and alerts sent.', 'success');
      setPerson(null);
      setPhotoUrl(null);
      setPhotoBase64(null);
      setViewingRecord(null);
      setRemarks('');
      setCategory('INVESTIGATION');
      fetchMOPList();
    } catch (err: any) {
      showNotification(err.message, 'error');
    } finally {
      setReporting(false);
    }
  };

  // 6. Delete a record
  const handleDeleteRecord = async (id: string) => {
    if (!confirm('Delete this record permanently?')) return;
    setActionId(id);
    try {
      const res = await fetch(`/api/mop/delete?id=${id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Delete failed');
      showNotification('Record deleted.', 'success');
      if (viewingRecord && viewingRecord._id === id) handleCloseDetails();
      fetchMOPList();
    } catch (err: any) {
      showNotification(err.message, 'error');
    } finally {
      setActionId(null);
    }
  };

  // 7. Report from the list (for DRAFT records)
  const handleReportFromList = async (id: string, cid: string) => {
    if (!confirm('Report this person as missing? Alerts will be sent.')) return;
    setActionId(id);
    try {
      const res = await fetch('/api/mop/report', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ cid, reportedBy: "current_user_id" }),
      });
      if (!res.ok) throw new Error('Report failed');
      showNotification('Person reported and alerts sent.', 'success');
      if (viewingRecord && viewingRecord._id === id) handleCloseDetails();
      fetchMOPList();
    } catch (err: any) {
      showNotification(err.message, 'error');
    } finally {
      setActionId(null);
    }
  };

  // 8. View record from list
  const handleViewRecord = (record: MOPRecord) => {
    setViewingRecord(record);
    if (record.citizenDetails) {
      setPerson(record.citizenDetails);
    } else {
      // Fallback: construct from stored fields
      const fallback: CitizenDetails = {
        cid: record.cid,
        country: null,
        dob: record.dob,
        fatherName: record.fatherName,
        firstIssuedDate: '',
        fatherCIDNo: '',
        firstName: record.name.split(' ')[0] || '',
        gender: record.gender,
        householdNo: '',
        lastName: record.name.split(' ').slice(1).join(' ') || '',
        middleName: null,
        mobileNumber: record.mobileNumber,
        motherCIDNo: '',
        motherName: record.motherName,
        occupation: record.occupation,
        dzongkhagId: '',
        dzongkhagName: record.dzongkhagName,
        gewogId: '',
        gewogName: record.gewogName,
        houseNo: '',
        thramNo: '',
        villageSerialNo: '',
        villageName: record.villageName,
        placeOfBirth: null,
        firstDzoName: '',
        middleDzoName: null,
        lastDzoName: '',
        religion: '',
        qualification: record.qualification,
        fullName: record.name,
      };
      setPerson(fallback);
    }
    if (record.photoBase64) {
      setPhotoUrl(`data:image/jpeg;base64,${record.photoBase64}`);
      setPhotoBase64(record.photoBase64);
    } else {
      setPhotoUrl(null);
      setPhotoBase64(null);
    }
    setRemarks(record.remarks || '');
    setCategory(record.category || 'INVESTIGATION');
    setReportSuccess(false);
  };

  // 9. Close details (clear viewing state)
  const handleCloseDetails = () => {
    setPerson(null);
    setPhotoUrl(null);
    setPhotoBase64(null);
    setViewingRecord(null);
    setReportSuccess(false);
    setRemarks('');
    setCategory('INVESTIGATION');
    setCid('');
  };

  // Reset the form
  const handleReset = () => {
    setCid("");
    setPerson(null);
    setPhotoUrl(null);
    setPhotoBase64(null);
    setFetchError(null);
    setReportSuccess(false);
    setRemarks("");
    setCategory("INVESTIGATION");
    setViewingRecord(null);
  };

  // Helper to render a detail row
  const DetailRow = ({ label, value }: { label: string; value?: string | null }) => (
    <div className="py-1 border-b border-gray-100 last:border-0">
      <span className="text-sm text-gray-500">{label}:</span>
      <span className="ml-2 font-medium">{value || "—"}</span>
    </div>
  );

  // Get status badge
  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'DRAFT':
        return <span className="px-2 py-1 rounded-full text-xs bg-gray-200 text-gray-700">Draft</span>;
      case 'ACTIVE':
        return <span className="px-2 py-1 rounded-full text-xs bg-red-100 text-red-700">Active</span>;
      case 'RESOLVED':
        return <span className="px-2 py-1 rounded-full text-xs bg-green-100 text-green-700">Resolved</span>;
      default:
        return null;
    }
  };

  return (
    <div className="flex">
      <Sidebar />
      <main className="flex-1 p-6 ml-64 bg-gray-100 min-h-screen">
        {/* Header */}
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold">MOP – Inter‑Agency Alert</h1>
          <div className="flex items-center gap-2">
            <span className="bg-red-100 text-red-800 text-xs font-medium px-3 py-1 rounded-full">
              Active: {activeCount}
            </span>
          </div>
        </div>

        {/* ====== COMPACT KPI INFORMATION STRIP ====== */}
        <div className="bg-white rounded-xl shadow-sm px-4 py-2 mb-6 flex flex-wrap items-center justify-around gap-3 text-sm">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-blue-500"></span>
            <span className="text-gray-600">Total:</span>
            <span className="font-bold text-gray-800">{total}</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-red-500"></span>
            <span className="text-gray-600">Active:</span>
            <span className="font-bold text-gray-800">{activeCount}</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-yellow-500"></span>
            <span className="text-gray-600">Drafts:</span>
            <span className="font-bold text-gray-800">{draftCount}</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-green-500"></span>
            <span className="text-gray-600">Resolved:</span>
            <span className="font-bold text-gray-800">{resolvedCount}</span>
          </div>
        </div>
        {/* ====== END KPI STRIP ====== */}

        {/* Charts Row */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
          {/* Status Pie Chart */}
          <div className="bg-white rounded-xl shadow p-4">
            <h3 className="text-sm font-medium text-gray-700 mb-4 flex items-center gap-2">
              <PieChartIcon size={16} /> Status Distribution
            </h3>
            {statusData.length === 0 ? (
              <div className="h-[200px] flex items-center justify-center text-gray-400">
                No data to display
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={200}>
                <PieChart>
                  <Pie
                    data={statusData}
                    cx="50%"
                    cy="50%"
                    innerRadius={40}
                    outerRadius={70}
                    fill="#8884d8"
                    paddingAngle={2}
                    dataKey="value"
                    label={({ name, percent = 0 }) => `${name} ${(percent * 100).toFixed(0)}%`}
                  >
                    {statusData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            )}
          </div>

          {/* Category Bar Chart - Responsive with full labels */}
          <div className="bg-white rounded-xl shadow p-4">
            <h3 className="text-sm font-medium text-gray-700 mb-4 flex items-center gap-2">
              <BarChart3 size={16} /> Category Breakdown
            </h3>
            {categoryData.length === 0 ? (
              <div className="h-[200px] flex items-center justify-center text-gray-400">
                No data to display
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={200}>
                <BarChart
                  data={categoryData}
                  layout="vertical"
                  margin={{ left: 100, right: 20, top: 10, bottom: 10 }}
                >
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                  <XAxis type="number" />
                  <YAxis
                    dataKey="name"
                    type="category"
                    width={90}
                    tick={{ fontSize: 11, fill: '#374151' }}
                    tickLine={false}
                    axisLine={false}
                  />
                  <Tooltip
                    formatter={(value, name, props) => [value, props.payload.name]}
                  />
                  <Bar dataKey="value" fill="#3B82F6" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        {/* Trend Line Chart */}
        <div className="bg-white rounded-xl shadow p-4 mb-6">
          <h3 className="text-sm font-medium text-gray-700 mb-4 flex items-center gap-2">
            <TrendingUp size={16} /> Records Created (Last 7 Days)
          </h3>
          <ResponsiveContainer width="100%" height={150}>
            <AreaChart data={trendData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" />
              <YAxis allowDecimals={false} />
              <Tooltip />
              <Area type="monotone" dataKey="count" stroke="#3B82F6" fill="#93C5FD" />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Recent Activity Table */}
        <div className="bg-white rounded-xl shadow p-4 mb-6">
          <h3 className="text-sm font-medium text-gray-700 mb-4">Recent Activity</h3>
          {recentRecords.length === 0 ? (
            <p className="text-gray-500 text-sm">No recent records.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-2 text-left text-xs font-medium uppercase">CID</th>
                    <th className="px-4 py-2 text-left text-xs font-medium uppercase">Name</th>
                    <th className="px-4 py-2 text-left text-xs font-medium uppercase">Status</th>
                    <th className="px-4 py-2 text-left text-xs font-medium uppercase">Category</th>
                    <th className="px-4 py-2 text-left text-xs font-medium uppercase">Created</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {recentRecords.map((rec) => (
                    <tr key={rec._id} className="hover:bg-gray-50">
                      <td className="px-4 py-2 text-sm">{rec.cid}</td>
                      <td className="px-4 py-2 text-sm font-medium">{rec.name}</td>
                      <td className="px-4 py-2 text-sm">{getStatusBadge(rec.status)}</td>
                      <td className="px-4 py-2 text-sm">{rec.category?.replace('_', ' ') || '-'}</td>
                      <td className="px-4 py-2 text-sm text-gray-500">
                        {new Date(rec.createdAt).toLocaleDateString('en-GB', {
                          day: '2-digit',
                          month: 'short',
                          year: 'numeric',
                        })}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
        {/* ========== END DASHBOARD ========== */}

        {/* Notification */}
        {notification && (
          <div
            className={`mb-4 px-4 py-2 rounded flex items-center gap-2 ${
              notification.type === "success"
                ? "bg-green-100 text-green-700"
                : notification.type === "error"
                ? "bg-red-100 text-red-700"
                : "bg-blue-100 text-blue-700"
            }`}
          >
            {notification.type === "success" && <CheckCircle size={16} />}
            {notification.type === "error" && <AlertTriangle size={16} />}
            {notification.message}
          </div>
        )}

        {/* CID Search Section */}
        <div className="bg-white shadow rounded-xl p-6 mb-6">
          <div className="flex flex-col md:flex-row gap-4 items-end">
            <div className="flex-1">
              <label className="block text-sm font-medium text-gray-700 mb-1">CID Number *</label>
              <input
                type="text"
                value={cid}
                onChange={(e) => setCid(e.target.value)}
                placeholder="e.g., 12345678901"
                className="w-full border rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-400 outline-none"
                disabled={loading || reporting || saving}
              />
            </div>
            <button
              onClick={handleSearch}
              disabled={loading || reporting || saving || !cid.trim()}
              className="flex items-center gap-2 px-5 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 transition"
            >
              {loading ? <Loader2 size={16} className="animate-spin" /> : <Search size={16} />}
              {loading ? "Searching..." : "Search CID"}
            </button>
            <button
              onClick={handleReset}
              disabled={loading || reporting || saving}
              className="px-5 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition"
            >
              Reset
            </button>
          </div>
          {fetchError && (
            <p className="mt-2 text-red-600 text-sm">{fetchError}</p>
          )}
        </div>

        {/* Person Details Display (if fetched or viewed) */}
        {person && (
          <div className="bg-white shadow rounded-xl p-6 mb-6">
            <div className="flex justify-between items-start mb-4">
              <h2 className="text-lg font-semibold">
                {viewingRecord ? 'Person Details (from saved record)' : 'Person Details (from Census)'}
              </h2>
              {viewingRecord && (
                <button
                  onClick={handleCloseDetails}
                  className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700"
                >
                  <X size={16} /> Close
                </button>
              )}
            </div>
            <div className="flex flex-col md:flex-row gap-6">
              {/* Photo Section */}
              <div className="flex-shrink-0">
                {photoUrl ? (
                  <img
                    src={photoUrl}
                    alt="Profile"
                    className="w-40 h-40 object-cover rounded-full border-2 border-gray-200"
                  />
                ) : (
                  <div className="w-40 h-40 bg-gray-100 rounded-full flex items-center justify-center border">
                    <User size={48} className="text-gray-400" />
                  </div>
                )}
              </div>

              {/* All Details – organized in two columns */}
              <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-1">
                <DetailRow label="Full Name" value={person.fullName} />
                <DetailRow label="CID" value={person.cid} />
                <DetailRow label="Date of Birth" value={person.dob} />
                <DetailRow label="Gender" value={person.gender} />
                <DetailRow label="Religion" value={person.religion} />
                <DetailRow label="Qualification" value={person.qualification} />
                <DetailRow label="Occupation" value={person.occupation} />
                <DetailRow label="Mobile Number" value={person.mobileNumber} />

                <DetailRow label="Father's Name" value={person.fatherName} />
                <DetailRow label="Father's CID" value={person.fatherCIDNo} />
                <DetailRow label="Mother's Name" value={person.motherName} />
                <DetailRow label="Mother's CID" value={person.motherCIDNo} />

                <DetailRow label="Dzongkhag" value={person.dzongkhagName} />
                <DetailRow label="Gewog" value={person.gewogName} />
                <DetailRow label="Village" value={person.villageName} />
                <DetailRow label="House No" value={person.houseNo} />
                <DetailRow label="Thram No" value={person.thramNo} />
                <DetailRow label="Household No" value={person.householdNo} />

                <DetailRow label="First Issued Date" value={person.firstIssuedDate} />
                <DetailRow label="Place of Birth" value={person.placeOfBirth} />
                <DetailRow label="Country" value={person.country} />
                <DetailRow label="First Name (Dzongkha)" value={person.firstDzoName} />
                <DetailRow label="Last Name (Dzongkha)" value={person.lastDzoName} />
              </div>
            </div>

            {/* Editable fields: Category and Remarks */}
            {!reportSuccess && (
              <div className="mt-6 pt-4 border-t">
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Category *</label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    className="w-full border rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-400 outline-none"
                    disabled={saving || reporting || isViewingActive || (!isViewingDraft && viewingRecord !== null)}
                  >
                    <option value="INVESTIGATION">Investigation Reason</option>
                    <option value="WARRANT">Warrant</option>
                    <option value="OTHER">Other</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Additional Remarks (optional)</label>
                  <textarea
                    rows={2}
                    value={remarks}
                    onChange={(e) => setRemarks(e.target.value)}
                    placeholder="e.g., Last seen wearing uniform, vehicle number, etc."
                    className="w-full border rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-400 outline-none"
                    disabled={saving || reporting || isViewingActive || (!isViewingDraft && viewingRecord !== null)}
                  />
                </div>

                {!viewingRecord && (
                  <div className="flex flex-wrap gap-4 mt-4">
                    <button
                      onClick={handleSaveDraft}
                      disabled={saving || reporting}
                      className="flex items-center gap-2 px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 transition"
                    >
                      {saving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
                      {saving ? "Saving..." : "Save to MOP List"}
                    </button>
                    <button
                      onClick={handleReportMissing}
                      disabled={reporting || saving}
                      className="flex items-center gap-2 px-6 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 transition"
                    >
                      {reporting ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
                      {reporting ? "Reporting..." : "Report Missing & Alert Agencies"}
                    </button>
                  </div>
                )}

                {isViewingDraft && (
                  <div className="flex flex-wrap gap-4 mt-4">
                    <button
                      onClick={handleUpdateDraft}
                      disabled={saving || reporting}
                      className="flex items-center gap-2 px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 transition"
                    >
                      {saving ? <Loader2 size={16} className="animate-spin" /> : <RefreshCw size={16} />}
                      {saving ? "Updating..." : "Update Draft"}
                    </button>
                  </div>
                )}

                {isViewingActive && (
                  <div className="mt-4 text-sm text-gray-500 italic">
                    This record has been reported as missing. Category and remarks are read-only.
                  </div>
                )}

                <p className="text-xs text-gray-400 mt-2">
                  ⚠️ "Save to MOP List" saves as draft (no alerts). "Report Missing & Alert Agencies" sends alerts immediately.
                </p>
              </div>
            )}

            {reportSuccess && (
              <div className="mt-6 pt-4 border-t bg-green-50 p-4 rounded-lg flex items-center justify-between">
                <div className="flex items-center gap-2 text-green-700">
                  <CheckCircle size={20} />
                  <span>Missing person reported successfully. Case is now active.</span>
                </div>
                <button
                  onClick={handleCloseDetails}
                  className="flex items-center gap-1 text-sm text-green-700 hover:underline"
                >
                  <X size={14} /> Close
                </button>
              </div>
            )}
          </div>
        )}

        {/* MOP List Section */}
        <div className="bg-white shadow rounded-xl p-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-lg font-semibold">MOP Records</h2>
            <button
              onClick={fetchMOPList}
              disabled={listLoading}
              className="text-sm text-blue-600 hover:underline disabled:opacity-50"
            >
              {listLoading ? 'Refreshing...' : 'Refresh'}
            </button>
          </div>
          {listLoading && records.length === 0 ? (
            <div className="text-center py-6 text-gray-500">Loading records...</div>
          ) : records.length === 0 ? (
            <div className="text-center py-6 text-gray-500">No records saved yet.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-2 text-left text-xs font-medium uppercase">Photo</th>
                    <th className="px-4 py-2 text-left text-xs font-medium uppercase">CID</th>
                    <th className="px-4 py-2 text-left text-xs font-medium uppercase">Name</th>
                    <th className="px-4 py-2 text-left text-xs font-medium uppercase">DOB</th>
                    <th className="px-4 py-2 text-left text-xs font-medium uppercase">Status</th>
                    <th className="px-4 py-2 text-left text-xs font-medium uppercase">Time Elapsed</th>
                    <th className="px-4 py-2 text-left text-xs font-medium uppercase">Category</th>
                    <th className="px-4 py-2 text-left text-xs font-medium uppercase">Remarks</th>
                    <th className="px-4 py-2 text-left text-xs font-medium uppercase">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {records.map((record) => (
                    <tr key={record._id} className="hover:bg-gray-50">
                      <td className="px-4 py-2 text-sm">
                        {record.photoBase64 ? (
                          <img
                            src={`data:image/jpeg;base64,${record.photoBase64}`}
                            alt="Profile"
                            className="w-10 h-10 object-cover rounded-full border"
                          />
                        ) : (
                          <div className="w-10 h-10 bg-gray-200 rounded-full flex items-center justify-center">
                            <User size={16} className="text-gray-400" />
                          </div>
                        )}
                      </td>
                      <td className="px-4 py-2 text-sm">{record.cid}</td>
                      <td className="px-4 py-2 text-sm font-medium">{record.name}</td>
                      <td className="px-4 py-2 text-sm">{record.dob}</td>
                      <td className="px-4 py-2 text-sm">{getStatusBadge(record.status)}</td>
                      <td className="px-4 py-2 text-sm">
                        {record.status === 'ACTIVE' ? (
                          <div className="flex flex-col text-xs">
                            <span className="font-mono text-gray-800">{getTimeElapsed(record.reportedAt)}</span>
                          </div>
                        ) : '-'}
                      </td>
                      <td className="px-4 py-2 text-sm">
                        {record.category ? record.category.replace('_', ' ') : '-'}
                      </td>
                      <td className="px-4 py-2 text-sm">
                        {record.remarks ? (
                          record.remarks.length > 30 ? record.remarks.substring(0, 30) + '...' : record.remarks
                        ) : '-'}
                      </td>
                      <td className="px-4 py-2 text-sm">
                        <div className="flex gap-2">
                          <button
                            onClick={() => handleViewRecord(record)}
                            className="px-3 py-1 bg-blue-100 text-blue-700 rounded hover:bg-blue-200 text-xs"
                            title="View details"
                          >
                            <Eye size={14} />
                          </button>
                          {record.status === 'DRAFT' && (
                            <button
                              onClick={() => handleReportFromList(record._id, record.cid)}
                              disabled={actionId === record._id}
                              className="px-3 py-1 bg-red-600 text-white rounded hover:bg-red-700 disabled:opacity-50 text-xs"
                            >
                              Report
                            </button>
                          )}
                          <button
                            onClick={() => handleDeleteRecord(record._id)}
                            disabled={actionId === record._id}
                            className="px-3 py-1 bg-gray-200 text-gray-700 rounded hover:bg-gray-300 disabled:opacity-50 text-xs"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Info box for agencies */}
        <div className="mt-6 bg-blue-50 border-l-4 border-blue-500 p-4 rounded-md text-sm text-blue-800">
          <p className="font-semibold">📢 Note for focal persons</p>
          <p>
            When a missing person is reported, an alert will be sent to <strong>ACC, RAA, and OAG</strong> focal persons.
            You can view all active missing cases and acknowledge alerts from the dashboard.
          </p>
        </div>
      </main>
    </div>
  );
}