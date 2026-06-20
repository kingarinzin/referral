import { ObjectId } from "mongodb";
import clientPromise from "@/lib/mongodb";

export async function POST(req: Request) {
  try {
    const { referralId } = await req.json();
    if (!referralId) {
      return new Response(JSON.stringify({ error: "referralId is required" }), { status: 400 });
    }

    const client = await clientPromise;
    const db = client.db();
    const collection = db.collection("acc_raa_referrals");

    const existing = await collection.findOne({ _id: new ObjectId(referralId) });
    if (!existing) {
      return new Response(JSON.stringify({ error: "Referral not found" }), { status: 404 });
    }

    if (existing.referredToRAA === true) {
      return new Response(JSON.stringify({ error: "Already submitted to RAA" }), { status: 400 });
    }

    await collection.updateOne(
      { _id: new ObjectId(referralId) },
      { $set: { referredToRAA: true, updatedAt: new Date() } }
    );

    const updated = await collection.findOne({ _id: new ObjectId(referralId) });
    return new Response(JSON.stringify(updated), { status: 200 });
  } catch (error: any) {
    console.error("Error in submit:", error);
    return new Response(JSON.stringify({ error: error.message }), { status: 500 });
  }
}