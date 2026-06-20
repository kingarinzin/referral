import { ObjectId } from "mongodb";
import clientPromise from "@/lib/mongodb";
import { writeFile, mkdir } from "fs/promises";
import path from "path";
import { existsSync } from "fs";

const UPLOAD_DIR = "uploads/raa-acc-referral";

async function ensureUploadDir() {
  const uploadPath = path.join(process.cwd(), "public", UPLOAD_DIR);
  if (!existsSync(uploadPath)) {
    await mkdir(uploadPath, { recursive: true });
  }
  return uploadPath;
}

async function saveFiles(files: File[]): Promise<string[]> {
  if (!files || files.length === 0) return [];
  const uploadPath = await ensureUploadDir();
  const savedFiles: string[] = [];
  for (const file of files) {
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    const timestamp = Date.now();
    const randomStr = Math.random().toString(36).substring(7);
    const safeFileName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_');
    const filename = `${timestamp}-${randomStr}-${safeFileName}`;
    const filePath = path.join(uploadPath, filename);
    await writeFile(filePath, buffer);
    savedFiles.push(filename);
  }
  return savedFiles;
}

export async function POST(req: Request) {
  try {
    const formData = await req.formData();
    const referralId = formData.get("referralId")?.toString();
    const status = formData.get("status")?.toString() || "";
    const reply = formData.get("reply")?.toString() || "";
    const attachments = formData.getAll("attachments") as File[];

    if (!referralId || !status || !reply) {
      return new Response(
        JSON.stringify({ error: "referralId, status, and reply are required" }),
        { status: 400 }
      );
    }

    // ************ REPLACE with your actual authenticated user ************
    const updatedBy = {
      _id: "acc_user123",
      name: "ACC Officer",
      email: "acc@example.com"
    };
    // ********************************************************************

    const client = await clientPromise;
    const db = client.db();
    const collection = db.collection("raa_acc_referrals");

    const existing = await collection.findOne({ _id: new ObjectId(referralId) });
    if (!existing) {
      return new Response(JSON.stringify({ error: "Referral not found" }), { status: 404 });
    }
    if (!existing.referredToACC) {
      return new Response(
        JSON.stringify({ error: "Referral not yet submitted to ACC" }),
        { status: 403 }
      );
    }

    const savedFiles = await saveFiles(attachments);
    const updateObj = {
      status,
      reply,
      attachments: savedFiles,
      updatedBy,
      createdAt: new Date()
    };

    await collection.updateOne(
      { _id: new ObjectId(referralId) },
      {
        $push: { updates: updateObj } as any,
        $set: { status, updatedAt: new Date() }
      }
    );

    const updatedDoc = await collection.findOne({ _id: new ObjectId(referralId) });
    return new Response(JSON.stringify(updatedDoc), { status: 200 });
  } catch (error: any) {
    console.error("Error in update:", error);
    return new Response(JSON.stringify({ error: error.message }), { status: 500 });
  }
}