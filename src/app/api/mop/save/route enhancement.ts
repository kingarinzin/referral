import { NextRequest, NextResponse } from 'next/server';
import { MongoClient } from 'mongodb';

const uri = process.env.MONGODB_URI!;
let client: MongoClient;

async function getDb() {
  if (!client) {
    client = new MongoClient(uri);
    await client.connect();
  }
  return client.db('missing_persons');
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      cid, name, dob, gender, occupation, qualification, mobileNumber,
      fatherName, motherName, dzongkhagName, gewogName, villageName,
      photoBase64, // Changed from photoUrl
      remarks, reportedBy,
    } = body;

    if (!cid || !name) {
      return NextResponse.json({ error: 'CID and name are required' }, { status: 400 });
    }

    const db = await getDb();
    const collection = db.collection('mop_records');

    // Check if an ACTIVE record exists
    const active = await collection.findOne({ cid, status: 'ACTIVE' });
    if (active) {
      return NextResponse.json(
        { error: 'This person is already reported as missing.' },
        { status: 409 }
      );
    }

    const now = new Date();
    const payload = {
      cid, name, dob, gender, occupation, qualification, mobileNumber,
      fatherName, motherName, dzongkhagName, gewogName, villageName,
      photoBase64: photoBase64 || null, // Store base64
      remarks: remarks || '',
      reportedBy: reportedBy || 'unknown',
      status: 'DRAFT',
      updatedAt: now,
      reportedAt: null,
      resolvedAt: null,
      alertsSent: false,
    };

    const existing = await collection.findOne({ cid, status: 'DRAFT' });
    if (existing) {
      await collection.updateOne({ _id: existing._id }, { $set: payload });
      return NextResponse.json({
        message: 'Draft updated successfully',
        recordId: existing._id,
        isNew: false,
      });
    } else {
      const result = await collection.insertOne({ ...payload, createdAt: now });
      return NextResponse.json({
        message: 'Saved to MOP list (draft)',
        recordId: result.insertedId,
        isNew: true,
      });
    }
  } catch (error: any) {
    console.error('Error saving draft:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}