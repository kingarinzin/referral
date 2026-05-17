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

    const { userId, isActive } = await req.json();
    
    if (!userId) {
      return NextResponse.json({ error: "User ID is required" }, { status: 400 });
    }

    if (typeof isActive !== "boolean") {
      return NextResponse.json({ error: "isActive must be a boolean" }, { status: 400 });
    }

    const client = await clientPromise;
    const db = client.db("referral_db");

    // Check if user exists
    const user = await db.collection("users").findOne({ _id: new ObjectId(userId) });
    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Prevent deactivating super admin
    if (user.isAdmin === true && isActive === false) {
      return NextResponse.json({ error: "Cannot deactivate super admin user" }, { status: 403 });
    }

    const result = await db.collection("users").updateOne(
      { _id: new ObjectId(userId) },
      { $set: { isActive: isActive, updatedAt: new Date() } }
    );

    if (result.matchedCount === 0) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    return NextResponse.json({ 
      success: true, 
      message: `User ${isActive ? "activated" : "deactivated"} successfully` 
    });
  } catch (error) {
    console.error("Toggle user status error:", error);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}