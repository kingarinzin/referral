import { NextResponse } from "next/server";
import clientPromise from "@/lib/mongodb";
import { verifyAdmin } from "@/lib/admin-auth";
import { ObjectId } from "mongodb";

export async function GET(req: Request) {
  try {
    const adminCheck = await verifyAdmin(req);
    if (!adminCheck.valid) {
      return NextResponse.json({ error: adminCheck.error }, { status: 403 });
    }

    const client = await clientPromise;
    const db = client.db("referral_db");

    // Fetch departments, divisions, and agencies
    const departments = await db.collection("departments").find().toArray();
    const divisions = await db.collection("divisions").find().toArray();
    const agencies = await db.collection("agencies").find().toArray();

    // Create lookup maps
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

    // Fetch pending users
    const pendingUsers = await db
      .collection("users")
      .find({ approvalStatus: "pending" })
      .project({ password: 0 })
      .sort({ createdAt: -1 })
      .toArray();

    // Map department/division/agency names
    const usersWithNames = pendingUsers.map((user) => {
      const deptId = user.departmentId?.toString();
      const dept = deptId ? deptMap.get(deptId) : null;
      const agencyId = dept?.agencyId || "";
      const agencyName = agencyId ? agencyMap.get(agencyId) || "" : "";
      const departmentName = dept?.name || "";
      const divisionName = user.divisionId ? divMap.get(user.divisionId.toString()) || "" : "";

      return {
        ...user,
        agencyName,
        departmentName,
        divisionName,
      };
    });

    return NextResponse.json({ users: usersWithNames });
  } catch (error) {
    console.error("Error fetching pending users:", error);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}