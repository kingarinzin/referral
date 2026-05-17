import { NextResponse } from "next/server";
import Division from "@/models/Division";
import mongoose from "mongoose";
import clientPromise from "@/lib/mongodb";
import { ObjectId } from "mongodb";

async function ensureMongoose() {
  // Force use referral_db
  const targetDbName = "referral_db";
  if (mongoose.connection.readyState && mongoose.connection.name !== targetDbName) {
    await mongoose.disconnect();
  }
  if (!mongoose.connection.readyState) {
    const client = await clientPromise;
    await mongoose.connect(client.s.url, { dbName: targetDbName });
    console.log(`✅ Mongoose connected to ${targetDbName}`);
  }
}

export async function GET() {
  try {
    await ensureMongoose();
    const client = await clientPromise;
    const db = client.db("referral_db");  // hardcoded

    const divisions = await db.collection("divisions").aggregate([
      {
        $addFields: {
          deptIdStr: { $toString: "$departmentId" }
        }
      },
      {
        $lookup: {
          from: "departments",
          let: { deptId: "$deptIdStr" },
          pipeline: [
            {
              $match: {
                $expr: { $eq: [{ $toString: "$_id" }, "$$deptId"] }
              }
            }
          ],
          as: "dept"
        }
      },
      { $unwind: { path: "$dept", preserveNullAndEmptyArrays: true } },
      {
        $addFields: {
          departmentName: { $ifNull: ["$dept.name", ""] },
          agencyId: "$dept.agencyId"
        }
      },
      {
        $lookup: {
          from: "agencies",
          let: { agencyId: { $toString: "$agencyId" } },
          pipeline: [
            {
              $match: {
                $expr: { $eq: [{ $toString: "$_id" }, "$$agencyId"] }
              }
            }
          ],
          as: "agency"
        }
      },
      { $unwind: { path: "$agency", preserveNullAndEmptyArrays: true } },
      {
        $addFields: {
          agencyName: { $ifNull: ["$agency.name", ""] },
          departmentId: {
            _id: "$dept._id",
            name: "$dept.name",
            agencyId: "$dept.agencyId"
          }
        }
      },
      {
        $project: {
          name: 1,
          remarks: 1,
          createdAt: 1,
          updatedAt: 1,
          departmentName: 1,
          agencyName: 1,
          departmentId: 1
        }
      },
      { $sort: { createdAt: -1 } }
    ]).toArray();

    return NextResponse.json(divisions);
  } catch (error) {
    console.error("GET /api/divisions error:", error);
    return NextResponse.json([], { status: 500 });
  }
}

export async function POST(request) {
  try {
    await ensureMongoose();
    const body = await request.json();
    const { name, departmentId, remarks } = body;

    if (!name || !departmentId) {
      return NextResponse.json({ error: "Name and Department are required" }, { status: 400 });
    }

    let deptObjectId;
    try {
      deptObjectId = new ObjectId(departmentId);
    } catch (err) {
      return NextResponse.json({ error: "Invalid department ID format" }, { status: 400 });
    }

    const client = await clientPromise;
    const db = client.db("referral_db"); // hardcoded
    const department = await db.collection("departments").findOne({ _id: deptObjectId });

    if (!department) {
      // Try as string (just in case)
      const fallback = await db.collection("departments").findOne({ _id: departmentId });
      if (!fallback) {
        return NextResponse.json({ error: `Department not found with id: ${departmentId}` }, { status: 400 });
      }
    }

    const newDivision = await Division.create({
      name,
      departmentId: deptObjectId,
      remarks: remarks || "",
    });

    return NextResponse.json(newDivision, { status: 201 });
  } catch (error) {
    console.error("POST /api/divisions error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}