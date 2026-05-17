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
      return NextResponse.json({ error: "Only super admin can manage agency admins" }, { status: 403 });
    }

    // 2. Parse request
    const { userId } = await req.json();
    if (!userId) {
      return NextResponse.json({ error: "User ID is required" }, { status: 400 });
    }

    const client = await clientPromise;
    const db = client.db("referral_db");

    // 3. Get user to update
    const userToUpdate = await db.collection("users").findOne({
      _id: new ObjectId(userId),
    });
    if (!userToUpdate) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // 4. Toggle the agency admin status
    const newAgencyAdminStatus = !userToUpdate.isAgencyAdmin;
    
    let updateData: any = {
      isAgencyAdmin: newAgencyAdminStatus,
      updatedAt: new Date(),
    };

    // If promoting (setting to true), also ensure agencyId is set
    if (newAgencyAdminStatus === true) {
      let agencyId = userToUpdate.agencyId;
      if (!agencyId && userToUpdate.departmentId) {
        const department = await db.collection("departments").findOne({
          _id: new ObjectId(userToUpdate.departmentId),
        });
        agencyId = department?.agencyId;
      }

      if (!agencyId) {
        return NextResponse.json(
          { error: "User does not belong to any agency" },
          { status: 400 }
        );
      }
      
      updateData.agencyId = new ObjectId(agencyId);
    }

    // 5. Update the user
    const result = await db.collection("users").updateOne(
      { _id: new ObjectId(userId) },
      { $set: updateData }
    );

    if (result.matchedCount === 0) {
      return NextResponse.json({ error: "Update failed – user not found" }, { status: 404 });
    }

    const message = newAgencyAdminStatus 
      ? "User promoted to agency admin successfully" 
      : "User demoted from agency admin successfully";

    return NextResponse.json({ 
      message,
      isAgencyAdmin: newAgencyAdminStatus
    });
  } catch (error) {
    console.error("Manage agency admin error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}