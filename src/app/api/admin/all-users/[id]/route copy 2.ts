import { NextRequest, NextResponse } from "next/server";
import clientPromise from "@/lib/mongodb";
import { verifyAdmin } from "@/lib/admin-auth";
import { ObjectId } from "mongodb";

// ===================== GET =====================
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // 1️⃣ Verify Admin
    const adminCheck = await verifyAdmin(req);
    if (!adminCheck.valid) {
      return NextResponse.json(
        { error: adminCheck.error || "Unauthorized" },
        { status: 403 }
      );
    }

    // 2️⃣ Await params (Next.js 15+)
    const { id } = await params;

    // 3️⃣ Connect to DB
    const client = await clientPromise;
    const db = client.db("civic_leave_db");

    // 4️⃣ Fetch user
    const user = await db.collection("users").findOne({ _id: new ObjectId(id) });
    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // 5️⃣ Fetch departments & divisions for name mapping
    const departments = await db.collection("departments").find({}).toArray();
    const divisions = await db.collection("divisions").find({}).toArray();

    // 6️⃣ Map department and division names
    const department = departments.find(
      (d) => d._id.toString() === (user.departmentId || "").toString()
    );
    const division = divisions.find(
      (d) => d._id.toString() === (user.divisionId || "").toString()
    );

    // 7️⃣ Build the response object (matches your all-users list format)
    const mappedUser = {
      _id: user._id.toString(),
      name: user.name || "",
      cid: user.cid || "",
      designation: user.designation || "",
      phone: user.phone || "",
      email: user.email || "",
      departmentName: department?.name || "",
      divisionName: division?.name || "",
      role: user.role || "Officer",
      isActive: user.isActive !== undefined ? user.isActive : true,
      createdAt: user.createdAt ? new Date(user.createdAt).toISOString() : new Date().toISOString(),
    };

    return NextResponse.json({ user: mappedUser });
  } catch (error: any) {
    console.error("GET /api/admin/all-users/[id] error:", error);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

// ===================== PUT =====================
export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // 1️⃣ Verify Admin
    const adminCheck = await verifyAdmin(req);
    if (!adminCheck.valid) {
      return NextResponse.json(
        { error: adminCheck.error || "Unauthorized" },
        { status: 403 }
      );
    }

    // 2️⃣ Await params
    const { id } = await params;

    // 3️⃣ Connect to DB
    const client = await clientPromise;
    const db = client.db("civic_leave_db");

    // 4️⃣ Get request body
    const body = await req.json();

    // 5️⃣ Allowed fields that are directly stored
    const allowedDirectFields = [
      "name",
      "cid",
      "designation",
      "phone",
      "email",
      "role",
      "isActive",
    ];

    // 6️⃣ Build update object
    const updates: Record<string, any> = {};
    for (const key of allowedDirectFields) {
      if (body[key] !== undefined) {
        updates[key] = body[key];
      }
    }

    // 7️⃣ Handle departmentName -> departmentId conversion
    if (body.departmentName !== undefined) {
      if (body.departmentName && body.departmentName.trim() !== "") {
        const dept = await db.collection("departments").findOne({ name: body.departmentName });
        if (dept) {
          updates.departmentId = dept._id;
        } else {
          console.warn(`Department "${body.departmentName}" not found, skipping update`);
        }
      } else {
        // If empty string, remove departmentId (or set to null)
        updates.departmentId = null;
      }
    }

    // 8️⃣ Handle divisionName -> divisionId conversion
    if (body.divisionName !== undefined) {
      if (body.divisionName && body.divisionName.trim() !== "") {
        const div = await db.collection("divisions").findOne({ name: body.divisionName });
        if (div) {
          updates.divisionId = div._id;
        } else {
          console.warn(`Division "${body.divisionName}" not found, skipping update`);
        }
      } else {
        updates.divisionId = null;
      }
    }

    // 9️⃣ Perform update
    const result = await db.collection("users").updateOne(
      { _id: new ObjectId(id) },
      { $set: updates }
    );

    if (result.matchedCount === 0) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    return NextResponse.json({ success: true, message: "User updated successfully" });
  } catch (error: any) {
    console.error("PUT /api/admin/all-users/[id] error:", error);
    return NextResponse.json({ error: "Update failed" }, { status: 500 });
  }
}