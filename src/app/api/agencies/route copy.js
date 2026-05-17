import { NextResponse } from "next/server";
import { dbConnect } from "@/lib/dbConnect"; // adjust path to your dbConnect file
import Agency from "@/models/Agency";

// GET - Fetch all agencies
export async function GET() {
  try {
    await dbConnect();
    const agencies = await Agency.find({}).sort({ name: 1 });
    return NextResponse.json(agencies);
  } catch (error) {
    console.error("GET /api/agencies error:", error);
    return NextResponse.json(
      { error: "Failed to fetch agencies" },
      { status: 500 }
    );
  }
}

// POST - Create a new agency
export async function POST(request) {
  try {
    const body = await request.json();
    const { name, remarks } = body;

    if (!name || typeof name !== "string" || name.trim() === "") {
      return NextResponse.json(
        { error: "Agency name is required" },
        { status: 400 }
      );
    }

    await dbConnect();

    // Check for duplicate
    const existingAgency = await Agency.findOne({ name: name.trim() });
    if (existingAgency) {
      return NextResponse.json(
        { error: "Agency with this name already exists" },
        { status: 409 }
      );
    }

    const agency = await Agency.create({
      name: name.trim(),
      remarks: remarks?.trim() || "",
    });

    return NextResponse.json(agency, { status: 201 });
  } catch (error) {
    console.error("POST /api/agencies error:", error);
    return NextResponse.json(
      { error: "Failed to create agency" },
      { status: 500 }
    );
  }
}

// PUT - Update an existing agency
export async function PUT(request) {
  try {
    const body = await request.json();
    const { _id, name, remarks } = body;

    if (!_id) {
      return NextResponse.json(
        { error: "Agency ID is required" },
        { status: 400 }
      );
    }

    if (!name || typeof name !== "string" || name.trim() === "") {
      return NextResponse.json(
        { error: "Agency name is required" },
        { status: 400 }
      );
    }

    await dbConnect();

    // Check duplicate excluding current
    const existingAgency = await Agency.findOne({
      name: name.trim(),
      _id: { $ne: _id },
    });
    if (existingAgency) {
      return NextResponse.json(
        { error: "Agency with this name already exists" },
        { status: 409 }
      );
    }

    const updatedAgency = await Agency.findByIdAndUpdate(
      _id,
      {
        name: name.trim(),
        remarks: remarks?.trim() || "",
      },
      { new: true, runValidators: true }
    );

    if (!updatedAgency) {
      return NextResponse.json(
        { error: "Agency not found" },
        { status: 404 }
      );
    }

    return NextResponse.json(updatedAgency);
  } catch (error) {
    console.error("PUT /api/agencies error:", error);
    return NextResponse.json(
      { error: "Failed to update agency" },
      { status: 500 }
    );
  }
}

// DELETE - Delete an agency
export async function DELETE(request) {
  try {
    const body = await request.json();
    const { _id } = body;

    if (!_id) {
      return NextResponse.json(
        { error: "Agency ID is required" },
        { status: 400 }
      );
    }

    await dbConnect();

    const deletedAgency = await Agency.findByIdAndDelete(_id);

    if (!deletedAgency) {
      return NextResponse.json(
        { error: "Agency not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({ message: "Agency deleted successfully" });
  } catch (error) {
    console.error("DELETE /api/agencies error:", error);
    return NextResponse.json(
      { error: "Failed to delete agency" },
      { status: 500 }
    );
  }
}