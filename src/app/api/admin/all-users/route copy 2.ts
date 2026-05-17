import { NextResponse } from "next/server";
import clientPromise from "@/lib/mongodb";
import { verifyAdmin } from "@/lib/admin-auth";

export async function GET(req: Request) {
  try {
    const adminCheck = await verifyAdmin(req);
    if (!adminCheck.valid) {
      return NextResponse.json(
        { error: adminCheck.error || "Unauthorized" },
        { status: 403 }
      );
    }

    const client = await clientPromise;
    const db = client.db("referral_db");

    // Fetch all users
    const allUsers = await db
      .collection("users")
      .find({})
      .sort({ createdAt: -1 })
      .toArray();

    // Fetch departments, divisions, agencies
    const departments = await db.collection("departments").find({}).toArray();
    const divisions = await db.collection("divisions").find({}).toArray();
    const agencies = await db.collection("agencies").find({}).toArray();

    // Build maps
    const deptMap = new Map();
    departments.forEach((dept) => {
      deptMap.set(dept._id.toString(), {
        name: dept.name,
        agencyId: dept.agencyId?.toString() || "",
      });
    });

    const agencyMap = new Map();
    agencies.forEach((agency) => {
      agencyMap.set(agency._id.toString(), agency.name);
    });

    const divMap = new Map();
    divisions.forEach((div) => {
      divMap.set(div._id.toString(), div.name);
    });

    // Map users with agency/department/division names
    const users = allUsers.map((u) => {
      const deptId = u.departmentId?.toString();
      const dept = deptId ? deptMap.get(deptId) : null;
      const agencyId = dept?.agencyId || "";
      const agencyName = agencyId ? agencyMap.get(agencyId) || "" : "";

      return {
        _id: u._id.toString(),
        name: u.name || "-",
        cid: u.cid || "-",
        designation: u.designation || "-",
        phone: u.phone || "-",
        email: u.email || "-",
        agencyName,                                     // new field
        departmentName: dept?.name || "-",
        divisionName: u.divisionId ? divMap.get(u.divisionId.toString()) || "-" : "-",
        role: u.role || "Officer",
        isAdmin: !!u.isAdmin,
        isActive: u.isActive !== undefined ? u.isActive : true,
        createdAt: u.createdAt
          ? new Date(u.createdAt).toISOString()
          : new Date().toISOString(),
      };
    });

    return NextResponse.json({ users });
  } catch (error) {
    console.error("Error fetching all users:", error);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}