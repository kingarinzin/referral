import { NextResponse } from "next/server";
import clientPromise from "@/lib/mongodb";
import { getUserFromToken } from "@/lib/get-user-from-token";
import { ObjectId } from "mongodb";

export async function POST(req: Request) {
  try {
    // 1. Verify super admin
    const currentUser = await getUserFromToken(req);
    if (!currentUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    if (!currentUser.isAdmin) {
      return NextResponse.json({ error: "Only super admin can promote users" }, { status: 403 });
    }

    // 2. Parse request
    const { userId } = await req.json();
    if (!userId) {
      return NextResponse.json({ error: "User ID is required" }, { status: 400 });
    }

    const client = await clientPromise;
    const db = client.db("referral_db");  // ensure correct database

    // 3. Get user to promote
    const userToPromote = await db.collection("users").findOne({
      _id: new ObjectId(userId),
    });
    if (!userToPromote) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // 4. Determine agencyId (from user or department)
    let agencyId = userToPromote.agencyId;
    if (!agencyId && userToPromote.departmentId) {
      const department = await db.collection("departments").findOne({
        _id: new ObjectId(userToPromote.departmentId),
      });
      agencyId = department?.agencyId;
    }

    if (!agencyId) {
      return NextResponse.json(
        { error: "User does not belong to any agency" },
        { status: 400 }
      );
    }

    // 5. Promote
    const result = await db.collection("users").updateOne(
      { _id: new ObjectId(userId) },
      {
        $set: {
          isAgencyAdmin: true,
          agencyId: new ObjectId(agencyId),
        },
      }
    );

    if (result.matchedCount === 0) {
      return NextResponse.json({ error: "Update failed – user not found" }, { status: 404 });
    }

    return NextResponse.json({ message: "User promoted to agency admin successfully" });
  } catch (error) {
    console.error("Promote to agency admin error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}