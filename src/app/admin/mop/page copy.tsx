"use client";

import { useState, useEffect } from "react";
import { Search, Save, AlertTriangle, CheckCircle, X, Loader2, User, Trash2 } from "lucide-react";
import Sidebar from "@/components/Sidebar";

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
  fullName?: string; // computed
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
  photoUrl: string | null;
  reportedBy: string;
};

type Notification = {
  message: string;
  type: "success" | "error" | "info";
};

export default function MOPPage() {
  // State for CID input and search
  const [cid, setCid] = useState("");
  const [loading, setLoading] = useState(false);
  const [fetchError, setFetchError] = useState<string | null>(null);
  
  // Fetched person data
  const [person, setPerson] = useState<CitizenDetails | null>(null);
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);
  
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
    setReportSuccess(false);

    try {
      const personApiUrl = `/api/census/person/${cid}`;
      const photoApiUrl = `/api/census/photo/${cid}`;

      // Fetch person details
      const personRes = await fetch(personApiUrl);
      if (!personRes.ok) {
        if (personRes.status === 404) throw new Error("CID not found in census");
        throw new Error("Failed to fetch person details");
      }
      const personData: CitizenDetails = await personRes.json();
      setPerson(personData);

      // Fetch photo (optional – if fails, just skip)
      try {
        const photoRes = await fetch(photoApiUrl);
        if (photoRes.ok) {
          const blob = await photoRes.blob();
          const url = URL.createObjectURL(blob);
          setPhotoUrl(url);
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

  // 2. Save to MOP List as DRAFT
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
        photoUrl: photoUrl,
        remarks: remarks,
        reportedBy: "current_user_id", // replace with auth
      };
      const res = await fetch('/api/mop/save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Save failed');
      showNotification('Saved to MOP list as draft. You can report later from the list.', 'success');
      // Refresh list
      fetchMOPList();
    } catch (err: any) {
      showNotification(err.message, 'error');
    } finally {
      setSaving(false);
    }
  };

  // 3. Report Missing (immediate)
  const handleReportMissing = async () => {
    if (!person) return;
    setReporting(true);
    try {
      const res = await fetch('/api/mop/report', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          cid: person.cid,
          remarks,
          reportedBy: "current_user_id",
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Report failed');
      setReportSuccess(true);
      showNotification('Missing person reported and alerts sent.', 'success');
      setRemarks('');
      fetchMOPList();
    } catch (err: any) {
      showNotification(err.message, 'error');
    } finally {
      setReporting(false);
    }
  };

  // 4. Delete a record
  const handleDeleteRecord = async (id: string) => {
    if (!confirm('Delete this record permanently?')) return;
    setActionId(id);
    try {
      const res = await fetch(`/api/mop/delete?id=${id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Delete failed');
      showNotification('Record deleted.', 'success');
      fetchMOPList();
    } catch (err: any) {
      showNotification(err.message, 'error');
    } finally {
      setActionId(null);
    }
  };

  // 5. Report from the list (for DRAFT records)
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
      fetchMOPList();
    } catch (err: any) {
      showNotification(err.message, 'error');
    } finally {
      setActionId(null);
    }
  };

  // Reset the form
  const handleReset = () => {
    setCid("");
    setPerson(null);
    setPhotoUrl(null);
    setFetchError(null);
    setReportSuccess(false);
    setRemarks("");
    if (photoUrl) URL.revokeObjectURL(photoUrl);
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
        </div>

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

        {/* Person Details Display (if fetched) */}
        {person && (
          <div className="bg-white shadow rounded-xl p-6 mb-6">
            <h2 className="text-lg font-semibold border-b pb-2 mb-4">Person Details (from Census)</h2>
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

            {/* Remarks and Action Buttons */}
            {!reportSuccess ? (
              <div className="mt-6 pt-4 border-t">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Additional Remarks (optional)
                </label>
                <textarea
                  rows={2}
                  value={remarks}
                  onChange={(e) => setRemarks(e.target.value)}
                  placeholder="e.g., Last seen wearing uniform, vehicle number, etc."
                  className="w-full border rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-400 outline-none"
                  disabled={reporting || saving}
                />
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
                <p className="text-xs text-gray-400 mt-2">
                  ⚠️ "Save to MOP List" saves as draft (no alerts). "Report Missing & Alert Agencies" sends alerts immediately.
                </p>
              </div>
            ) : (
              <div className="mt-6 pt-4 border-t bg-green-50 p-4 rounded-lg flex items-center justify-between">
                <div className="flex items-center gap-2 text-green-700">
                  <CheckCircle size={20} />
                  <span>Missing person reported successfully. Case is now active.</span>
                </div>
                <button
                  onClick={handleReset}
                  className="flex items-center gap-1 text-sm text-green-700 hover:underline"
                >
                  <X size={14} /> Report another
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
                    <th className="px-4 py-2 text-left text-xs font-medium uppercase">CID</th>
                    <th className="px-4 py-2 text-left text-xs font-medium uppercase">Name</th>
                    <th className="px-4 py-2 text-left text-xs font-medium uppercase">DOB</th>
                    <th className="px-4 py-2 text-left text-xs font-medium uppercase">Status</th>
                    <th className="px-4 py-2 text-left text-xs font-medium uppercase">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {records.map((record) => (
                    <tr key={record._id} className="hover:bg-gray-50">
                      <td className="px-4 py-2 text-sm">{record.cid}</td>
                      <td className="px-4 py-2 text-sm font-medium">{record.name}</td>
                      <td className="px-4 py-2 text-sm">{record.dob}</td>
                      <td className="px-4 py-2 text-sm">{getStatusBadge(record.status)}</td>
                      <td className="px-4 py-2 text-sm">
                        <div className="flex gap-2">
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