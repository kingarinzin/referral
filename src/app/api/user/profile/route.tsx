import { NextResponse } from "next/server";
import { getUserFromToken } from "@/lib/get-user-from-token";

export async function GET(req: Request) {
  const user = await getUserFromToken(req);
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
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
    role: user.role,
    isAdmin: user.isAdmin === true,
    isAgencyAdmin: user.isAgencyAdmin === true,
    isActive: user.isActive !== false,
    approvalStatus: user.approvalStatus,
  });
}