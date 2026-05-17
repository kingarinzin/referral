import { NextResponse } from "next/server";
import clientPromise from "@/lib/mongodb";
import { getUserFromToken } from "@/lib/get-user-from-token";

export async function GET(req: Request) {
  try {
    const user = await getUserFromToken(req);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (!user.isAdmin && !user.isAgencyAdmin) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const client = await clientPromise;
    const db = client.db("referral_db");

    let filter = {};
    if (user.isAdmin) {
      // super admin sees all
    } else if (user.isAgencyAdmin) {
      filter = { agencyId: user.agencyId };
    }

    const allUsers = await db
      .collection("users")
      .find(filter)
      .sort({ createdAt: -1 })
      .toArray();

    const departments = await db.collection("departments").find().toArray();
    const divisions = await db.collection("divisions").find().toArray();
    const agencies = await db.collection("agencies").find().toArray();

    const deptMap = new Map();
    departments.forEach((d) => deptMap.set(d._id.toString(), d));
    const divMap = new Map();
    divisions.forEach((d) => divMap.set(d._id.toString(), d));
    const agencyMap = new Map();
    agencies.forEach((a) => agencyMap.set(a._id.toString(), a.name));

    const users = allUsers.map((u) => {
      const dept = deptMap.get(u.departmentId?.toString());
      const agencyId = dept?.agencyId?.toString();
      const agencyName = agencyMap.get(agencyId) || "";

      return {
        _id: u._id.toString(),
        name: u.name || "-",
        cid: u.cid || "-",
        designation: u.designation || "-",
        phone: u.phone || "-",
        email: u.email || "-",
        agencyName,
        departmentName: dept?.name || "-",
        divisionName: divMap.get(u.divisionId?.toString())?.name || "-",
        role: u.role || "Officer",
        isAdmin: !!u.isAdmin,
        isAgencyAdmin: !!u.isAgencyAdmin,
        isActive: u.isActive !== undefined ? u.isActive : true,
        createdAt: u.createdAt ? new Date(u.createdAt).toISOString() : new Date().toISOString(),
      };
    });

    return NextResponse.json({ users });
  } catch (error) {
    console.error("Error fetching all users:", error);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}