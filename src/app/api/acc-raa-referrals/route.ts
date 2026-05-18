import { ObjectId } from "mongodb";
import clientPromise from "@/lib/mongodb";
import { writeFile, mkdir, unlink } from "fs/promises";
import path from "path";
import { existsSync } from "fs";

const UPLOAD_DIR = "uploads/acc-raa-referral";

// ---------------- HELPER ----------------
async function getCollection() {
  const client = await clientPromise;
  const db = client.db();
  return db.collection("acc_raa_referrals");
}

// Ensure upload directory exists
async function ensureUploadDir() {
  const uploadPath = path.join(process.cwd(), "public", UPLOAD_DIR);
  if (!existsSync(uploadPath)) {
    await mkdir(uploadPath, { recursive: true });
  }
  return uploadPath;
}

// Save files and return filenames
async function saveFiles(files: File[]): Promise<string[]> {
  if (!files || files.length === 0) return [];
  
  const uploadPath = await ensureUploadDir();
  const savedFiles: string[] = [];
  
  for (const file of files) {
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    
    // Generate unique filename with timestamp and random string
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

// ---------------- GET ----------------
export async function GET() {
  try {
    const collection = await getCollection();
    const referrals = await collection.find({}).toArray();
    return new Response(JSON.stringify(referrals), { status: 200 });
  } catch (error: any) {
    return new Response(JSON.stringify({ error: error.message }), { status: 500 });
  }
}

// ---------------- POST ----------------
export async function POST(req: Request) {
  try {
    // Parse FormData
    const formData = await req.formData();
    const year = formData.get("year");
    const crn = formData.get("crn");
    const alleged = formData.get("alleged") || "";
    const sharing_letter_no = formData.get("sharing_letter_no") || "";
    const referral_date = formData.get("referral_date") || null;
    const attachments = formData.getAll("attachments") as File[];

    if (!year || !crn) {
      return new Response(JSON.stringify({ error: "Year and CRN are required" }), { status: 400 });
    }

    // Save files if any
    const savedFiles = await saveFiles(attachments);

    const collection = await getCollection();
    const doc = { 
      year, 
      crn, 
      alleged, 
      sharing_letter_no, 
      referral_date, 
      status: "Pending",
      attachments: savedFiles,
      createdAt: new Date(),
      updatedAt: new Date()
    };
    
    const result = await collection.insertOne(doc);
    const insertedDoc = await collection.findOne({ _id: result.insertedId });

    return new Response(JSON.stringify(insertedDoc), { status: 201 });
  } catch (error: any) {
    console.error("Error in POST:", error);
    return new Response(JSON.stringify({ error: error.message }), { status: 500 });
  }
}

// ---------------- PUT ----------------
export async function PUT(req: Request) {
  try {
    const formData = await req.formData();
    const _id = formData.get("_id");
    if (!_id) {
      return new Response(JSON.stringify({ error: "ID is required" }), { status: 400 });
    }

    // Get existing document to check current attachments
    const collection = await getCollection();
    const existingDoc = await collection.findOne({ _id: new ObjectId(_id.toString()) });
    
    if (!existingDoc) {
      return new Response(JSON.stringify({ error: "Document not found" }), { status: 404 });
    }

    // Prepare update document
    const updateDoc: any = {
      updatedAt: new Date()
    };
    
    // Update text fields
    const textFields = ["year", "crn", "alleged", "sharing_letter_no", "referral_date"];
    for (const key of textFields) {
      const value = formData.get(key);
      if (value !== null && value !== "") {
        updateDoc[key] = value;
      }
    }

    // Handle attachments
    const newAttachments = formData.getAll("attachments") as File[];
    const existingAttachmentsStr = formData.get("existingAttachments");
    let attachmentsToKeep: string[] = [];
    
    // Parse existing attachments if provided
    if (existingAttachmentsStr && typeof existingAttachmentsStr === 'string') {
      try {
        attachmentsToKeep = JSON.parse(existingAttachmentsStr);
      } catch (e) {
        attachmentsToKeep = [];
      }
    } else if (existingDoc.attachments) {
      attachmentsToKeep = existingDoc.attachments;
    }
    
    // Save new files
    const savedNewFiles = await saveFiles(newAttachments);
    
    // Combine kept existing files with new files
    const allAttachments = [...attachmentsToKeep, ...savedNewFiles];
    updateDoc.attachments = allAttachments;

    // Update the document
    await collection.updateOne(
      { _id: new ObjectId(_id.toString()) }, 
      { $set: updateDoc }
    );
    
    const updatedDoc = await collection.findOne({ _id: new ObjectId(_id.toString()) });

    return new Response(JSON.stringify(updatedDoc), { status: 200 });
  } catch (error: any) {
    console.error("Error in PUT:", error);
    return new Response(JSON.stringify({ error: error.message }), { status: 500 });
  }
}

// ---------------- DELETE ----------------
export async function DELETE(req: Request) {
  try {
    const body = await req.json();
    const _id = body._id;
    if (!_id) {
      return new Response(JSON.stringify({ error: "ID is required" }), { status: 400 });
    }

    const collection = await getCollection();
    
    // Get the document to delete its attachments
    const doc = await collection.findOne({ _id: new ObjectId(_id) });
    
    // Delete associated files from uploads folder
    if (doc && doc.attachments && doc.attachments.length > 0) {
      const uploadPath = path.join(process.cwd(), "public", UPLOAD_DIR);
      for (const filename of doc.attachments) {
        try {
          const filePath = path.join(uploadPath, filename);
          if (existsSync(filePath)) {
            await unlink(filePath);
          }
        } catch (err) {
          console.error(`Error deleting file ${filename}:`, err);
        }
      }
    }
    
    const result = await collection.deleteOne({ _id: new ObjectId(_id) });

    return new Response(JSON.stringify({ deletedCount: result.deletedCount }), { status: 200 });
  } catch (error: any) {
    console.error("Error in DELETE:", error);
    return new Response(JSON.stringify({ error: error.message }), { status: 500 });
  }
}