import { ObjectId } from "mongodb";
import clientPromise from "@/lib/mongodb";

export async function POST(req: Request) {
  try {
    const { referralId, officerId } = await req.json();
    if (!referralId || !officerId) {
      return new Response(JSON.stringify({ error: "referralId and officerId are required" }), { status: 400 });
    }

    const client = await clientPromise;
    const db = client.db();
    const collection = db.collection("raa_acc_referrals");

    const existing = await collection.findOne({ _id: new ObjectId(referralId) });
    if (!existing) {
      return new Response(JSON.stringify({ error: "Referral not found" }), { status: 404 });
    }

    const usersCollection = db.collection("users");
    const officer = await usersCollection.findOne(
      { _id: new ObjectId(officerId) },
      { projection: { _id: 1, name: 1, email: 1 } }
    );
    if (!officer) {
      return new Response(JSON.stringify({ error: "Officer not found" }), { status: 404 });
    }

    const assignedTo = {
      _id: officer._id.toString(),
      name: officer.name,
      email: officer.email
    };

    await collection.updateOne(
      { _id: new ObjectId(referralId) },
      { $set: { assignedTo, updatedAt: new Date() } }
    );

    const updated = await collection.findOne({ _id: new ObjectId(referralId) });
    return new Response(JSON.stringify(updated), { status: 200 });
  } catch (error: any) {
    console.error("Error in assign:", error);
    return new Response(JSON.stringify({ error: error.message }), { status: 500 });
  }
}