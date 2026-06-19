"use client";

import { useState } from "react";
import { Search, Save, AlertTriangle, CheckCircle, X, Loader2, User } from "lucide-react";
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

type Notification = {
  message: string;
  type: "success" | "error" | "info";
};

export default function MissingPersonPage() {
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
  const [notification, setNotification] = useState<Notification | null>(null);
  
  // For optional remarks
  const [remarks, setRemarks] = useState("");

  // Show notification helper
  const showNotification = (message: string, type: "success" | "error" | "info" = "success") => {
    setNotification({ message, type });
    setTimeout(() => setNotification(null), 4000);
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

  // 2. Report missing person (save to DB + alert agencies)
  const handleReportMissing = async () => {
    if (!person) return;

    setReporting(true);
    try {
      const payload = {
        cid: person.cid,
        name: person.fullName || `${person.firstName} ${person.lastName}`.trim(),
        dob: person.dob,
        gender: person.gender,
        department: person.occupation,
        designation: person.qualification || "",
        email: "", // not available from API
        contactNo: person.mobileNumber,
        photoUrl: photoUrl,
        remarks: remarks,
        reportedBy: "current_user_id", // replace with actual user ID from auth
        agency: "ACC", // or get from user context
      };

      const res = await fetch("/api/missing/report", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.message || "Failed to report missing person");
      }

      setReportSuccess(true);
      showNotification(
        "Missing person reported successfully. Alerts sent to all agency focal persons.",
        "success"
      );
      setRemarks("");
    } catch (err: any) {
      showNotification(err.message, "error");
    } finally {
      setReporting(false);
    }
  };

  // Reset the form to search again
  const handleReset = () => {
    setCid("");
    setPerson(null);
    setPhotoUrl(null);
    setFetchError(null);
    setReportSuccess(false);
    setRemarks("");
    if (photoUrl) URL.revokeObjectURL(photoUrl); // cleanup
  };

  // Helper to render a detail row
  const DetailRow = ({ label, value }: { label: string; value?: string | null }) => (
    <div className="py-1 border-b border-gray-100 last:border-0">
      <span className="text-sm text-gray-500">{label}:</span>
      <span className="ml-2 font-medium">{value || "—"}</span>
    </div>
  );

  return (
    <div className="flex">
      <Sidebar />
      <main className="flex-1 p-6 ml-64 bg-gray-100 min-h-screen">
        {/* Header */}
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold">Missing Person (MOP) – Inter‑Agency Alert</h1>
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
                disabled={loading || reporting}
              />
            </div>
            <button
              onClick={handleSearch}
              disabled={loading || reporting || !cid.trim()}
              className="flex items-center gap-2 px-5 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 transition"
            >
              {loading ? <Loader2 size={16} className="animate-spin" /> : <Search size={16} />}
              {loading ? "Searching..." : "Search CID"}
            </button>
            <button
              onClick={handleReset}
              disabled={loading || reporting}
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

            {/* Remarks & Reporting Action */}
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
                  disabled={reporting}
                />
                <div className="flex justify-end mt-4">
                  <button
                    onClick={handleReportMissing}
                    disabled={reporting}
                    className="flex items-center gap-2 px-6 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 transition"
                  >
                    {reporting ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
                    {reporting ? "Reporting..." : "Report Missing & Alert Agencies"}
                  </button>
                </div>
                <p className="text-xs text-gray-400 mt-2">
                  ⚠️ Once reported, all focal persons from ACC, RAA, and OAG will be notified immediately.
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

        {/* Info box for agencies */}
        <div className="bg-blue-50 border-l-4 border-blue-500 p-4 rounded-md text-sm text-blue-800">
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