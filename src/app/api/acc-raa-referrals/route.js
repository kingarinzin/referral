import { ObjectId } from "mongodb";
import clientPromise from "@/lib/mongodb";

// ---------------- HELPER ----------------
async function getCollection() {
  const client = await clientPromise;
  const db = client.db();
  return db.collection("acc_raa_referrals");
}

// ---------------- GET ----------------
export async function GET() {
  try {
    const collection = await getCollection();
    const referrals = await collection.find({}).toArray();
    return new Response(JSON.stringify(referrals), { status: 200 });
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), { status: 500 });
  }
}

// ---------------- POST ----------------
export async function POST(req) {
  try {
    // Parse FormData
    const formData = await req.formData();
    const year = formData.get("year");
    const crn = formData.get("crn");
    const alleged = formData.get("alleged") || "";
    const sharing_letter_no = formData.get("sharing_letter_no") || "";
    const referral_date = formData.get("referral_date") || null;

    if (!year || !crn) {
      return new Response(JSON.stringify({ error: "Year and CRN are required" }), { status: 400 });
    }

    const collection = await getCollection();
    const doc = { year, crn, alleged, sharing_letter_no, referral_date, status: "Pending" };
    const result = await collection.insertOne(doc);
    const insertedDoc = await collection.findOne({ _id: result.insertedId });

    return new Response(JSON.stringify(insertedDoc), { status: 201 });
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), { status: 500 });
  }
}

// ---------------- PUT ----------------
export async function PUT(req) {
  try {
    const formData = await req.formData();
    const _id = formData.get("_id");
    if (!_id) {
      return new Response(JSON.stringify({ error: "ID is required" }), { status: 400 });
    }

    const updateDoc = {};
    ["year", "crn", "alleged", "sharing_letter_no", "referral_date"].forEach((key) => {
      const value = formData.get(key);
      if (value !== null) updateDoc[key] = value;
    });

    const collection = await getCollection();
    await collection.updateOne({ _id: new ObjectId(_id) }, { $set: updateDoc });
    const updatedDoc = await collection.findOne({ _id: new ObjectId(_id) });

    return new Response(JSON.stringify(updatedDoc), { status: 200 });
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), { status: 500 });
  }
}

// ---------------- DELETE ----------------
export async function DELETE(req) {
  try {
    const body = await req.json();
    const _id = body._id;
    if (!_id) {
      return new Response(JSON.stringify({ error: "ID is required" }), { status: 400 });
    }

    const collection = await getCollection();
    const result = await collection.deleteOne({ _id: new ObjectId(_id) });

    return new Response(JSON.stringify({ deletedCount: result.deletedCount }), { status: 200 });
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), { status: 500 });
  }
}