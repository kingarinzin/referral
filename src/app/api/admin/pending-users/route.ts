// app/api/admin/pending-users/route.ts
import { NextResponse } from "next/server";
import clientPromise from "@/lib/mongodb";
import { verifyAdmin } from "@/lib/admin-auth";

export async function GET(req: Request) {
  try {
    const adminCheck = await verifyAdmin(req);
    if (!adminCheck.valid) {
      return NextResponse.json({ error: adminCheck.error }, { status: 403 });
    }

    const client = await clientPromise;
    const db = client.db("referral_db");

    // Fetch departments & divisions first
    const departments = await db.collection("departments").find().toArray();
    const divisions = await db.collection("divisions").find().toArray();

    // Fetch pending users
    const pendingUsers = await db
      .collection("users")
      .find({ approvalStatus: "pending" })
      .project({ password: 0 }) // hide passwords
      .sort({ createdAt: -1 })
      .toArray();

    // Map department/division IDs to names
    const usersWithNames = pendingUsers.map((user) => {
      const dept = departments.find((d) => d._id.toString() === user.departmentId);
      const div = divisions.find((v) => v._id.toString() === user.divisionId);

      return {
        ...user,
        departmentName: dept?.name || "",
        divisionName: div?.name || "",
      };
    });

    return NextResponse.json({ users: usersWithNames });
  } catch (error) {
    console.error("Error fetching pending users:", error);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}