import { NextResponse } from "next/server";
import { getUserFromToken } from "@/lib/get-user-from-token";
import clientPromise from "@/lib/mongodb";
import { ObjectId } from "mongodb";

export async function GET(req) {
  const user = await getUserFromToken(req);
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let agencyName = "";
  if (user.agencyId) {
    try {
      const client = await clientPromise;
      const db = client.db("referral_db");
      const agency = await db.collection("agencies").findOne({ _id: new ObjectId(user.agencyId) });
      agencyName = agency?.name || "";
    } catch (err) {
      console.error("Failed to fetch agency name:", err);
    }
  }

  return NextResponse.json({
    _id: user._id.toString(),
    name: user.name,
    email: user.email,
    cid: user.cid,
    designation: user.designation,
    phone: user.phone,
    departmentId: user.departmentId,
    divisionId: user.divisionId,
    agencyId: user.agencyId,
    agencyName: agencyName,
    role: user.role,
    isAdmin: user.isAdmin === true,
    isAgencyAdmin: user.isAgencyAdmin === true,
    isActive: user.isActive !== false,
    approvalStatus: user.approvalStatus,
  });
}