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

// Alert function - sends notifications to all three agencies
async function sendAlertsToFocalPersons(person: any, remarks: string) {
  const agencies = ['ACC', 'RAA', 'OAG'];
  
  // For now, log the alerts. Replace with actual email/SMS later.
  console.log(`🔔 [ALERT] Missing Person Report`);
  console.log(`   Name: ${person.name}`);
  console.log(`   CID: ${person.cid}`);
  console.log(`   Remarks: ${remarks}`);
  console.log(`   Notifying: ${agencies.join(', ')}`);
  
  // TODO: Implement actual email sending
  // Example with nodemailer:
  // for (const agency of agencies) {
  //   await sendEmail(agencyEmail, subject, body);
  // }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      cid,
      name,
      dob,
      gender,
      department,
      designation,
      email,
      contactNo,
      photoUrl,
      remarks,
      reportedBy,
      agency,
    } = body;

    if (!cid || !name) {
      return NextResponse.json(
        { error: 'CID and name are required' },
        { status: 400 }
      );
    }

    const db = await getDb();
    const collection = db.collection('reports');

    // Check for existing active report
    const existing = await collection.findOne({ cid, status: 'ACTIVE' });
    if (existing) {
      return NextResponse.json(
        { error: 'A missing person report for this CID is already active' },
        { status: 409 }
      );
    }

    const report = {
      cid,
      name,
      dob,
      gender,
      department,
      designation,
      email,
      contactNo,
      photoUrl: photoUrl || null,
      remarks: remarks || '',
      reportedBy: reportedBy || 'unknown',
      reportingAgency: agency || 'unknown',
      status: 'ACTIVE',
      reportedAt: new Date(),
      resolvedAt: null,
    };

    const result = await collection.insertOne(report);
    
    // Send alerts to all three agencies
    await sendAlertsToFocalPersons(report, remarks);

    return NextResponse.json(
      { 
        message: 'Missing person reported successfully', 
        reportId: result.insertedId 
      },
      { status: 201 }
    );
  } catch (error: any) {
    console.error('Error reporting missing person:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}