import { NextResponse } from "next/server";
import Division from "@/models/Division";
import Department from "@/models/Department";
import mongoose from "mongoose";
import clientPromise, { DATABASE_NAME } from "@/lib/mongodb"; // your working mongodb.tsx

// ================== ENSURE MONGOOSE CONNECTION ==================
async function ensureMongoose() {
  const targetDbName = DATABASE_NAME;

  if (mongoose.connection.readyState && mongoose.connection.name !== targetDbName) {
    await mongoose.disconnect();
  }

  if (!mongoose.connection.readyState) {
    try {
      const client = await clientPromise;
      await mongoose.connect(client.s.url, {
        dbName: targetDbName,
      });
      console.log(`✅ Mongoose connected to ${targetDbName}`);
    } catch (err) {
      console.error("❌ Mongoose connection error:", err);
      throw err;
    }
  }
}

// ================== GET DIVISIONS ==================
export async function GET() {
  try {
    await ensureMongoose();
    const divisions = await Division.find()
      .populate("departmentId") // populate department name
      .sort({ createdAt: -1 });
    return NextResponse.json(divisions);
  } catch (error) {
    console.error("GET /api/divisions error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// ================== CREATE DIVISION ==================
export async function POST(request) {
  try {
    await ensureMongoose();
    const body = await request.json();

    if (!body.name || !body.departmentId) {
      return NextResponse.json(
        { error: "Name and Department are required" },
        { status: 400 }
      );
    }

    // Ensure department exists
    const deptExists = await Department.findById(body.departmentId);
    if (!deptExists) {
      return NextResponse.json({ error: "Department not found" }, { status: 400 });
    }

    const newDivision = await Division.create({
      name: body.name,
      departmentId: body.departmentId,
      remarks: body.remarks || "",
    });

    return NextResponse.json(newDivision, { status: 201 });
  } catch (error) {
    console.error("POST /api/divisions error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// ================== UPDATE DIVISION ==================
export async function PUT(request) {
  try {
    await ensureMongoose();
    const body = await request.json();

    if (!body._id) {
      return NextResponse.json({ error: "Division ID is required" }, { status: 400 });
    }

    const updated = await Division.findByIdAndUpdate(
      body._id,
      {
        name: body.name,
        departmentId: body.departmentId,
        remarks: body.remarks,
      },
      { new: true }
    );

    if (!updated) {
      return NextResponse.json({ error: "Division not found" }, { status: 404 });
    }

    return NextResponse.json(updated);
  } catch (error) {
    console.error("PUT /api/divisions error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// ================== DELETE DIVISION ==================
export async function DELETE(request) {
  try {
    await ensureMongoose();
    const body = await request.json();

    if (!body._id) {
      return NextResponse.json({ error: "Division ID is required" }, { status: 400 });
    }

    const deleted = await Division.findByIdAndDelete(body._id);
    if (!deleted) {
      return NextResponse.json({ error: "Division not found" }, { status: 404 });
    }

    return NextResponse.json({ message: "Division deleted successfully" });
  } catch (error) {
    console.error("DELETE /api/divisions error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}