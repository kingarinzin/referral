import { NextResponse } from "next/server";
import clientPromise from "@/lib/mongodb";
import { getUserFromToken } from "@/lib/get-user-from-token";
import { ObjectId } from "mongodb";

export async function GET(req: Request) {
  try {
    const currentUser = await getUserFromToken(req);
    if (!currentUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    if (!currentUser.isAdmin && !currentUser.isAgencyAdmin) {
      return NextResponse.json({ error: "Admin access required" }, { status: 403 });
    }

    const client = await clientPromise;
    const db = client.db("referral_db");

    let filter: any = { approvalStatus: "pending" };
    if (currentUser.isAdmin) {
      // super admin sees all
    } else if (currentUser.isAgencyAdmin) {
      filter.agencyId = currentUser.agencyId;
    }

    // Fetch lookup collections
    const departments = await db.collection("departments").find().toArray();
    const divisions = await db.collection("divisions").find().toArray();
    const agencies = await db.collection("agencies").find().toArray();

    const deptMap = new Map(departments.map(d => [d._id.toString(), d]));
    const divMap = new Map(divisions.map(d => [d._id.toString(), d]));
    const agencyMap = new Map(agencies.map(a => [a._id.toString(), a.name]));

    const pendingUsers = await db
      .collection("users")
      .find(filter)
      .project({ password: 0 })
      .sort({ createdAt: -1 })
      .toArray();

    const usersWithNames = pendingUsers.map(u => {
      // Get department
      const deptId = u.departmentId?.toString();
      const dept = deptId ? deptMap.get(deptId) : null;

      // Determine agency: first from user.agencyId, then from department
      let agencyId = u.agencyId?.toString();
      if (!agencyId && dept?.agencyId) {
        agencyId = dept.agencyId.toString();
      }
      const agencyName = agencyId ? agencyMap.get(agencyId) || "" : "";

      const departmentName = dept?.name || "";
      const divisionName = u.divisionId ? divMap.get(u.divisionId.toString())?.name || "" : "";

      return {
        ...u,
        _id: u._id.toString(),
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