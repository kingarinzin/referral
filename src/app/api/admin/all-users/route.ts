import { NextResponse } from "next/server";
import clientPromise from "@/lib/mongodb";
import { verifyAdmin } from "@/lib/admin-auth";

export async function GET(req: Request) {
  try {
    // 🔐 1️⃣ Verify Admin
    const adminCheck = await verifyAdmin(req);
    if (!adminCheck.valid) {
      return NextResponse.json(
        { error: adminCheck.error || "Unauthorized" },
        { status: 403 }
      );
    }

    // 🔌 2️⃣ Connect DB
    const client = await clientPromise;
    const db = client.db("referral_db");

    // 📦 3️⃣ Fetch Users
    const allUsers = await db
      .collection("users")
      .find({})
      .sort({ createdAt: -1 })
      .toArray();

    // 📂 4️⃣ Fetch Departments & Divisions
    const departments = await db.collection("departments").find({}).toArray();
    const divisions = await db.collection("divisions").find({}).toArray();

    // 🔄 5️⃣ Map Users Properly (INCLUDING ROLE)
    const users = allUsers.map((u) => {
      const dept = departments.find(
        (d) => d._id.toString() === (u.departmentId || "").toString()
      );

      const div = divisions.find(
        (d) => d._id.toString() === (u.divisionId || "").toString()
      );

      return {
        _id: u._id.toString(),
        name: u.name || u.name || "-",
        cid: u.cid || "-",
        designation: u.designation || "-",
        phone: u.phone || "-",
        email: u.email || "-",
        departmentName: dept ? dept.name : "-",
        divisionName: div ? div.name : "-",

        // ✅ THIS WAS MISSING
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