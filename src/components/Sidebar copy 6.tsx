"use client";

import Image from "next/image";
import { useRouter, usePathname } from "next/navigation";
import { Layers, Calendar, Clock } from "lucide-react";
import {
  Shield,
  Settings,
  Users,
  LogOut,
  ChevronDown,
  ChevronRight,
} from "lucide-react";
import { useEffect, useState } from "react";

function normalizeRole(rawRole?: string): string {
  const normalized = (rawRole || "Officer")
    .toLowerCase()
    .replace(/[\s_-]/g, "");

  const roleMap: Record<string, string> = {
    officer: "Officer",
    divisionhead: "DivisionHead",
    departmenthead: "DepartmentHead",
    commissioner: "Commissioner",
    chairperson: "Chairperson",
    secretaryservice: "SecretaryService",
    admin: "Admin",
  };

  return roleMap[normalized] || "Officer";
}

// Helper to derive agency from email domain (fallback)
const getAgencyFromEmail = (email: string): string => {
  if (!email) return "";
  const domain = email.split("@")[1]?.toLowerCase();
  if (domain?.includes("oag") || domain?.includes("attorneygeneral")) {
    return "Office of the Attorney General";
  }
  if (domain?.includes("acc") || domain?.includes("anticorruption")) {
    return "Anti-Corruption Commission";
  }
  return "";
};

export default function Sidebar() {
  const router = useRouter();
  const pathname = usePathname();

  const [userName, setUserName] = useState<string>("");
  const [userEmail, setUserEmail] = useState<string>("");
  const [userRole, setUserRole] = useState<string>("Officer");
  const [isAdminUser, setIsAdminUser] = useState<boolean>(false);
  const [isAgencyAdminUser, setIsAgencyAdminUser] = useState<boolean>(false);
  const [agencyName, setAgencyName] = useState<string>("");
  const [openSection, setOpenSection] = useState<"master" | "leave" | "offence" | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  const getEmailFromToken = (token: string): string => {
    try {
      const [, payload] = token.split(".");
      if (!payload) return "";
      const decoded = JSON.parse(atob(payload));
      return typeof decoded?.email === "string" ? decoded.email : "";
    } catch {
      return "";
    }
  };

  useEffect(() => {
    let isMounted = true;

    async function loadProfile() {
      const token = localStorage.getItem("token");
      if (!token) {
        if (isMounted) setIsLoading(false);
        return;
      }

      const tokenEmail = getEmailFromToken(token);
      if (tokenEmail && isMounted) setUserEmail(tokenEmail);

      const storedIsAdmin = localStorage.getItem("isAdmin") === "true";
      const storedIsAgencyAdmin = localStorage.getItem("isAgencyAdmin") === "true";
      if (isMounted) {
        setIsAdminUser(storedIsAdmin);
        setIsAgencyAdminUser(storedIsAgencyAdmin);
      }

      try {
        const res = await fetch("/api/user/profile", {
          headers: { Authorization: `Bearer ${token}` },
        });

        if (!res.ok) return;

        const profile = await res.json();

        if (isMounted) {
          setUserName((profile.name || "").trim());
          if (profile.email) setUserEmail(profile.email);
          setUserRole(normalizeRole(profile.role));
          if (typeof profile.isAgencyAdmin === "boolean")
            setIsAgencyAdminUser(profile.isAgencyAdmin);
        }

        // Try to get agency name from profile (if added)
        let fetchedAgencyName = profile.agencyName || "";

        // If not, try fetching by agencyId
        if (!fetchedAgencyName && profile.agencyId) {
          try {
            const agencyRes = await fetch(`/api/agencies/${profile.agencyId}`, {
              headers: { Authorization: `Bearer ${token}` },
            });
            if (agencyRes.ok) {
              const agencyData = await agencyRes.json();
              fetchedAgencyName = agencyData.name || "";
            }
          } catch (err) {
            console.error("Agency API error:", err);
          }
        }

        // Fallback: derive from email domain
        if (!fetchedAgencyName && profile.email) {
          fetchedAgencyName = getAgencyFromEmail(profile.email);
        }

        if (isMounted) setAgencyName(fetchedAgencyName);
      } catch (err) {
        console.error("Profile load error:", err);
      } finally {
        if (isMounted) setIsLoading(false);
      }
    }

    loadProfile();
    return () => {
      isMounted = false;
    };
  }, [pathname]);

  const isAdmin = isAdminUser || userRole === "Admin";
  const agencyLower = agencyName.toLowerCase();

  // ------ UPDATED AGENCY DETECTION (RAA now includes Royal Audit) ------
  const isAccAgency = agencyLower.includes("anti-corruption") || agencyLower.includes("acc");
  const isOagAgency = agencyLower.includes("attorney general") || agencyLower.includes("oag");
  const isRaaAgency =
    agencyLower.includes("royal audit") ||
    agencyLower.includes("audit authority") ||
    agencyLower.includes("raa"); // keep for safety

  const isMasterActive = pathname === "/admin/department" || pathname === "/division";
  const isLeaveActive = pathname.startsWith("/dashboard/leave") ||
    pathname === "/admin/leave-type" ||
    pathname === "/admin/leave-balances" ||
    pathname === "/admin/commissioner-assignments" ||
    pathname === "/admin/individual-leave-balance" ||
    pathname === "/admin/my-leave";
  const isOffenceActive = pathname === "/admin/act" || pathname === "/admin/office";

  const canHandleLeaveApprovals = isAdmin ||
    ["DivisionHead", "DepartmentHead", "Commissioner", "Chairperson", "SecretaryService"].includes(userRole);

  const displayedOpenSection = openSection ||
    (isMasterActive ? "master" : isOffenceActive ? "offence" : isLeaveActive || (!isAdmin && canHandleLeaveApprovals) ? "leave" : null);

  const toggleSection = (section: "master" | "leave" | "offence") => {
    setOpenSection(displayedOpenSection === section ? null : section);
  };

  const handleLogout = () => {
    localStorage.clear();
    router.push("/login");
  };

  const navButtonClass = (isActive: boolean) =>
    `w-full flex items-center gap-3 px-4 py-3 rounded-md transition ${
      isActive ? "bg-black text-white" : "text-black hover:bg-gray-100"
    }`;

  const navSubButtonClass = (isActive: boolean) =>
    `w-full text-left px-4 py-2 rounded-md transition ${
      isActive ? "bg-black text-white" : "text-gray-700 hover:bg-gray-100"
    }`;

  if (isLoading) {
    return (
      <aside className="w-64 bg-white border-r border-gray-200 h-screen fixed top-0 left-0 flex flex-col text-sm">
        <div className="flex-1 flex items-center justify-center">
          <div className="text-gray-500">Loading...</div>
        </div>
      </aside>
    );
  }

  return (
    <aside className="w-64 bg-white border-r border-gray-200 h-screen fixed top-0 left-0 flex flex-col text-sm">
      <div className="px-4 py-4 flex items-center gap-3">
        <div className="w-10 h-10 rounded-full bg-gray-200 flex items-center justify-center">
          <span className="text-sm font-semibold text-gray-700">
            {userName ? userName.charAt(0).toUpperCase() : "U"}
          </span>
        </div>
        <p className="text-lg text-gray-700 font-medium truncate">
          {userName || "User"}
        </p>
      </div>

      <nav className="flex-1 px-4 py-3 space-y-2 overflow-y-auto min-h-0">
        {isAdmin ? (
          // ADMIN SECTION – show everything (unchanged)
          <>
            <button onClick={() => toggleSection("master")} className={navButtonClass(isMasterActive)}>
              <Layers size={18} /> <span className="flex-1 text-left">Master</span>
              {displayedOpenSection === "master" ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
            </button>
            {displayedOpenSection === "master" && (
              <div className="ml-8 mt-1 space-y-1">
                <button onClick={() => router.push("/admin/agencies")} className={navSubButtonClass(pathname === "/admin/agencies")}>Agency</button>
                <button onClick={() => router.push("/admin/department")} className={navSubButtonClass(pathname === "/admin/department")}>Department</button>
                <button onClick={() => router.push("/division")} className={navSubButtonClass(pathname === "/division")}>Division</button>
              </div>
            )}

            <button onClick={() => toggleSection("offence")} className={navButtonClass(isOffenceActive)}>
              <Layers size={18} /> <span className="flex-1 text-left">Offence</span>
              {displayedOpenSection === "offence" ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
            </button>
            {displayedOpenSection === "offence" && (
              <div className="ml-8 mt-1 space-y-1">
                <button onClick={() => router.push("/admin/offence/act")} className={navSubButtonClass(pathname === "/admin/offence/act")}>Act</button>
                <button onClick={() => router.push("/admin/offence/sections")} className={navSubButtonClass(pathname === "/admin/offence/sections")}>Sections</button>
                <button onClick={() => router.push("/admin/offence/charges")} className={navSubButtonClass(pathname === "/admin/offence/charges")}>Charges</button>
              </div>
            )}

            <button onClick={() => router.push("/admin/mop")} className={navButtonClass(pathname.startsWith("/admin/mop"))}>
              <Shield size={18} /> <span className="flex-1 text-left">Missing of Person</span>
            </button>

            <button onClick={() => router.push("/admin/acc-raa-referral")} className={navButtonClass(pathname.startsWith("/admin/acc-raa-referral"))}>
              <Shield size={18} /> <span className="flex-1 text-left">Acc-Raa Referral</span>
            </button>
            <button onClick={() => router.push("/admin/raa-acc-referral")} className={navButtonClass(pathname.startsWith("/admin/raa-acc-referral"))}>
              <Shield size={18} /> <span className="flex-1 text-left">Raa-Acc-Referral</span>
            </button>
            <button onClick={() => router.push("/admin/acc-oag-referral")} className={navButtonClass(pathname.startsWith("/admin/acc-oag-referral"))}>
              <Shield size={18} /> <span className="flex-1 text-left">Acc-Oag-Referral</span>
            </button>
            <button onClick={() => router.push("/admin/pending-users")} className={navButtonClass(pathname === "/admin/pending-users")}>
              <Clock size={18} /> Pending Approvals
            </button>
            <button onClick={() => router.push("/admin/all-users")} className={navButtonClass(pathname === "/admin/all-users")}>
              <Users size={18} /> All Users
            </button>
            <button onClick={() => router.push("/settings")} className={navButtonClass(pathname === "/settings")}>
              <Settings size={18} /> Settings
            </button>
          </>
        ) : (
          // NON-ADMIN SECTION – show modules based on agency
          <>
            {/* ACC and RAA users see both referral pages */}
            {(isAccAgency || isRaaAgency) && (
              <>
                <button onClick={() => router.push("/admin/acc-raa-referral")} className={navButtonClass(pathname.startsWith("/admin/acc-raa-referral"))}>
                  <Shield size={18} /> <span className="flex-1 text-left">Acc-Raa Referral</span>
                </button>
                <button onClick={() => router.push("/admin/raa-acc-referral")} className={navButtonClass(pathname.startsWith("/admin/raa-acc-referral"))}>
                  <Shield size={18} /> <span className="flex-1 text-left">Raa-Acc-Referral</span>
                </button>
              </>
            )}

            {/* OAG agency admin gets Acc-Oag-Referral */}
            {isOagAgency && isAgencyAdminUser && (
              <button onClick={() => router.push("/admin/acc-oag-referral")} className={navButtonClass(pathname.startsWith("/admin/acc-oag-referral"))}>
                <Shield size={18} /> <span className="flex-1 text-left">Acc-Oag-Referral</span>
              </button>
            )}

            {/* OAG normal officers get "My Assigned Cases" */}
            {isOagAgency && !isAgencyAdminUser && (
              <button onClick={() => router.push("/admin/acc-oag-referral/prosecutor-cases")} className={navButtonClass(pathname === "/admin/acc-oag-referral/prosecutor-cases")}>
                <Shield size={18} /> <span className="flex-1 text-left">My Assigned Cases</span>
              </button>
            )}

            {/* OAG agency admin gets Pending Approvals and All Users */}
            {isOagAgency && isAgencyAdminUser && (
              <>
                <button onClick={() => router.push("/admin/pending-users")} className={navButtonClass(pathname === "/admin/pending-users")}>
                  <Clock size={18} /> Pending Approvals
                </button>
                <button onClick={() => router.push("/admin/all-users")} className={navButtonClass(pathname === "/admin/all-users")}>
                  <Users size={18} /> All Users
                </button>
              </>
            )}

            <button onClick={() => router.push("/settings")} className={navButtonClass(pathname === "/settings")}>
              <Settings size={18} /> Settings
            </button>

            {/* Optional debug info – remove after confirming */}
            {!isAccAgency && !isOagAgency && !isRaaAgency && (
              <div className="text-xs text-gray-400 text-center p-2">
                Agency: {agencyName || "none"}<br />
                OAG: false | ACC: false | RAA: false
              </div>
            )}
          </>
        )}
      </nav>

      <div className="px-4 py-4">
        <button onClick={handleLogout} className="w-full flex items-center gap-3 px-4 py-3 rounded-md text-black hover:bg-gray-100">
          <LogOut size={18} className="text-red-500" />
          <span className="text-red-500">Logout</span>
        </button>
      </div>

      <div className="px-4 py-4 text-xs text-gray-500">
        © {new Date().getFullYear()} ANTI-CORRUPTION COMMISSION
      </div>
    </aside>
  );
}