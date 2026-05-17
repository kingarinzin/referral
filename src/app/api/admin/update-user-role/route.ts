import { NextResponse } from "next/server";
import clientPromise from "@/lib/mongodb";
import { verifyAdmin } from "@/lib/admin-auth";
import { ObjectId } from "mongodb";

export async function POST(req: Request) {
  try {
    const adminCheck = await verifyAdmin(req);
    if (!adminCheck.valid) {
      return NextResponse.json({ error: adminCheck.error }, { status: 401 });
    }

    const { userId, role } = await req.json();
    
    if (!userId) {
      return NextResponse.json({ error: "User ID is required" }, { status: 400 });
    }

    if (!role) {
      return NextResponse.json({ error: "Role is required" }, { status: 400 });
    }

    const validRoles = ["Officer", "DivisionHead", "DepartmentHead", "Commissioner", "Chairperson", "SecretaryService"];
    if (!validRoles.includes(role)) {
      return NextResponse.json({ error: "Invalid role" }, { status: 400 });
    }

    const client = await clientPromise;
    const db = client.db("referral_db");

    const result = await db.collection("users").updateOne(
      { _id: new ObjectId(userId) },
      { $set: { role: role, updatedAt: new Date() } }
    );

    if (result.matchedCount === 0) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    return NextResponse.json({ success: true, message: "Role updated successfully" });
  } catch (error) {
    console.error("Update user role error:", error);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}