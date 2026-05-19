import { ObjectId } from "mongodb";
import clientPromise from "@/lib/mongodb";
import { unlink } from "fs/promises";
import path from "path";
import { existsSync } from "fs";

const UPLOAD_DIR = "uploads/raa-acc-referral";

async function getCollection() {
  const client = await clientPromise;
  const db = client.db();
  return db.collection("raa_acc_referrals");
}

export async function POST(req: Request) {
  try {
    const { referralId, fileName } = await req.json();
    
    if (!referralId || !fileName) {
      return new Response(JSON.stringify({ error: "Referral ID and file name are required" }), { status: 400 });
    }

    const collection = await getCollection();
    
    // Remove file from database
    const result = await collection.updateOne(
      { _id: new ObjectId(referralId) },
      { $pull: { attachments: fileName } }
    );

    if (result.modifiedCount === 0) {
      return new Response(JSON.stringify({ error: "File not found in database" }), { status: 404 });
    }

    // Delete physical file
    const uploadPath = path.join(process.cwd(), "public", UPLOAD_DIR);
    const filePath = path.join(uploadPath, fileName);
    
    if (existsSync(filePath)) {
      await unlink(filePath);
    }

    return new Response(JSON.stringify({ success: true }), { status: 200 });
  } catch (error: any) {
    console.error("Error in DELETE_FILE:", error);
    return new Response(JSON.stringify({ error: error.message }), { status: 500 });
  }
}