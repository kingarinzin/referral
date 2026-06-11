import clientPromise from "@/lib/mongodb";
import { ObjectId } from "mongodb";
import { NextResponse } from "next/server";

export async function GET(request, { params }) {
  try {
    const { id } = params;
    if (!id) {
      return NextResponse.json({ error: "Agency ID required" }, { status: 400 });
    }

    const client = await clientPromise;
    const db = client.db("referral_db");
    const agency = await db.collection("agencies").findOne({ _id: new ObjectId(id) });

    if (!agency) {
      return NextResponse.json({ error: "Agency not found" }, { status: 404 });
    }

    return NextResponse.json(agency, { status: 200 });
  } catch (error) {
    console.error("GET /api/agencies/[id] error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}