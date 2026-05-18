import { ObjectId } from "mongodb";
import clientPromise from "@/lib/mongodb";
import { unlink } from "fs/promises";
import path from "path";
import { existsSync } from "fs";
import { NextRequest, NextResponse } from "next/server";

const UPLOAD_DIR = "uploads/acc-raa-referral";

// ---------------- HELPER ----------------
async function getCollection() {
  const client = await clientPromise;
  const db = client.db();
  return db.collection("acc_raa_referrals");
}

// ---------------- POST (Delete File) ----------------
export async function POST(req: NextRequest) {
  try {
    const { referralId, fileName } = await req.json();
    
    if (!referralId || !fileName) {
      return NextResponse.json(
        { error: "Referral ID and file name are required" },
        { status: 400 }
      );
    }

    const collection = await getCollection();
    
    // Remove file from uploads folder
    const filePath = path.join(process.cwd(), "public", UPLOAD_DIR, fileName);
    if (existsSync(filePath)) {
      await unlink(filePath);
    }
    
    // Remove file reference from database
    const result = await collection.updateOne(
      { _id: new ObjectId(referralId) },
      { $pull: { attachments: fileName } }
    );
    
    if (result.modifiedCount === 0) {
      return NextResponse.json(
        { error: "File not found in record" },
        { status: 404 }
      );
    }
    
    return NextResponse.json(
      { message: "File deleted successfully" },
      { status: 200 }
    );
  } catch (error: any) {
    console.error("Error in delete-file:", error);
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}