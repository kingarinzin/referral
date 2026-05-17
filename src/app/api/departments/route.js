import clientPromise from "@/lib/mongodb";
import { ObjectId } from "mongodb";

// Helper to validate agency exists
async function agencyExists(db, agencyId) {
  // Check if agencyId is a valid ObjectId string
  if (!ObjectId.isValid(agencyId)) {
    console.error(`Invalid ObjectId format: ${agencyId}`);
    return false;
  }
  const agency = await db.collection("agencies").findOne({ _id: new ObjectId(agencyId) });
  if (!agency) {
    console.error(`No agency found with _id: ${agencyId}`);
  }
  return !!agency;
}

// GET - fetch all departments with agency name populated
export async function GET() {
  try {
    const client = await clientPromise;
    const db = client.db("referral_db");

    const departments = await db.collection("departments").aggregate([
      {
        $lookup: {
          from: "agencies",
          localField: "agencyId",
          foreignField: "_id",
          as: "agency",
        },
      },
      {
        $addFields: {
          agencyName: { $arrayElemAt: ["$agency.name", 0] },
        },
      },
      {
        $project: { agency: 0 },
      },
      { $sort: { name: 1 } },
    ]).toArray();

    return new Response(JSON.stringify(departments), { status: 200 });
  } catch (error) {
    console.error("GET /api/departments error:", error);
    return new Response(JSON.stringify({ error: error.message }), { status: 500 });
  }
}

// POST - create a new department
export async function POST(req) {
  try {
    const client = await clientPromise;
    const db = client.db("referral_db");
    const body = await req.json();
    const { name, remarks, agencyId } = body;

    console.log("Received POST data:", { name, remarks, agencyId });

    if (!name || !agencyId) {
      return new Response(
        JSON.stringify({ error: "Department name and agencyId are required" }),
        { status: 400 }
      );
    }

    // Validate agency exists
    const agencyValid = await agencyExists(db, agencyId);
    if (!agencyValid) {
      return new Response(
        JSON.stringify({ error: `Agency with ID ${agencyId} does not exist in referral_db` }),
        { status: 400 }
      );
    }

    const result = await db.collection("departments").insertOne({
      name,
      remarks: remarks || "",
      agencyId: new ObjectId(agencyId),
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    return new Response(JSON.stringify(result), { status: 201 });
  } catch (error) {
    console.error("POST /api/departments error:", error);
    return new Response(JSON.stringify({ error: error.message }), { status: 500 });
  }
}

// PUT - update a department
export async function PUT(req) {
  try {
    const client = await clientPromise;
    const db = client.db("referral_db");
    const { _id, name, remarks, agencyId } = await req.json();

    if (!_id) {
      return new Response(JSON.stringify({ error: "ID is required for updating" }), { status: 400 });
    }
    if (!name || !agencyId) {
      return new Response(
        JSON.stringify({ error: "Department name and agencyId are required" }),
        { status: 400 }
      );
    }

    const agencyValid = await agencyExists(db, agencyId);
    if (!agencyValid) {
      return new Response(
        JSON.stringify({ error: `Agency with ID ${agencyId} does not exist` }),
        { status: 400 }
      );
    }

    const result = await db.collection("departments").updateOne(
      { _id: new ObjectId(_id) },
      {
        $set: {
          name,
          remarks: remarks || "",
          agencyId: new ObjectId(agencyId),
          updatedAt: new Date(),
        },
      }
    );

    if (result.matchedCount === 0) {
      return new Response(JSON.stringify({ error: "Department not found" }), { status: 404 });
    }

    return new Response(JSON.stringify(result), { status: 200 });
  } catch (error) {
    console.error("PUT /api/departments error:", error);
    return new Response(JSON.stringify({ error: error.message }), { status: 500 });
  }
}

// DELETE - remove a department
export async function DELETE(req) {
  try {
    const client = await clientPromise;
    const db = client.db("referral_db");
    const { _id } = await req.json();

    if (!_id) {
      return new Response(JSON.stringify({ error: "ID is required for deletion" }), { status: 400 });
    }

    const result = await db.collection("departments").deleteOne({ _id: new ObjectId(_id) });

    if (result.deletedCount === 0) {
      return new Response(JSON.stringify({ error: "Department not found" }), { status: 404 });
    }

    return new Response(JSON.stringify(result), { status: 200 });
  } catch (error) {
    console.error("DELETE /api/departments error:", error);
    return new Response(JSON.stringify({ error: error.message }), { status: 500 });
  }
}