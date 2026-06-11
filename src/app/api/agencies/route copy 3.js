import clientPromise from "@/lib/mongodb";
import { ObjectId } from "mongodb";

export async function GET() {
  try {
    const client = await clientPromise;
    const db = client.db("referral_db");
    const agencies = await db.collection("agencies").find({}).toArray();
    return new Response(JSON.stringify(agencies), { status: 200 });
  } catch (error) {
    console.error("GET /api/agencies error:", error);
    return new Response(JSON.stringify([]), { status: 500 });
  }
}

export async function POST(req) {
  try {
    const client = await clientPromise;
    const db = client.db("referral_db");
    const { name, remarks } = await req.json();
    if (!name) {
      return new Response(JSON.stringify({ error: "Name required" }), { status: 400 });
    }
    const result = await db.collection("agencies").insertOne({
      name,
      remarks: remarks || "",
      createdAt: new Date(),
    });
    return new Response(JSON.stringify(result), { status: 201 });
  } catch (error) {
    console.error("POST /api/agencies error:", error);
    return new Response(JSON.stringify({ error: error.message }), { status: 500 });
  }
}

export async function PUT(req) {
  try {
    const client = await clientPromise;
    const db = client.db("referral_db");
    const { _id, name, remarks } = await req.json();
    if (!_id || !name) {
      return new Response(JSON.stringify({ error: "ID and name required" }), { status: 400 });
    }
    const result = await db.collection("agencies").updateOne(
      { _id: new ObjectId(_id) },
      { $set: { name, remarks: remarks || "", updatedAt: new Date() } }
    );
    return new Response(JSON.stringify(result), { status: 200 });
  } catch (error) {
    console.error("PUT /api/agencies error:", error);
    return new Response(JSON.stringify({ error: error.message }), { status: 500 });
  }
}

export async function DELETE(req) {
  try {
    const client = await clientPromise;
    const db = client.db("referral_db");
    const { _id } = await req.json();
    if (!_id) {
      return new Response(JSON.stringify({ error: "ID required" }), { status: 400 });
    }
    const result = await db.collection("agencies").deleteOne({ _id: new ObjectId(_id) });
    return new Response(JSON.stringify(result), { status: 200 });
  } catch (error) {
    console.error("DELETE /api/agencies error:", error);
    return new Response(JSON.stringify({ error: error.message }), { status: 500 });
  }
}