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

async function sendAlertsToFocalPersons(person: any, remarks: string) {
  const agencies = ['ACC', 'RAA', 'OAG'];
  console.log(`🔔 [ALERT] Missing Person Report`);
  console.log(`   Name: ${person.name} (${person.cid})`);
  console.log(`   Remarks: ${remarks}`);
  console.log(`   Notifying: ${agencies.join(', ')}`);
  // TODO: Replace with actual email/SMS
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { cid, remarks, reportedBy } = body;

    if (!cid) {
      return NextResponse.json({ error: 'CID required' }, { status: 400 });
    }

    const db = await getDb();
    const collection = db.collection('mop_records');

    let record = await collection.findOne({ cid });
    if (!record) {
      return NextResponse.json(
        { error: 'No record found for this CID. Please save it first.' },
        { status: 404 }
      );
    }

    if (record.status === 'ACTIVE') {
      return NextResponse.json(
        { error: 'This person is already reported as missing.' },
        { status: 409 }
      );
    }

    const now = new Date();
    await collection.updateOne(
      { _id: record._id },
      {
        $set: {
          status: 'ACTIVE',
          reportedAt: now,
          alertsSent: true,
          remarks: remarks || record.remarks,
          reportedBy: reportedBy || record.reportedBy,
        },
      }
    );

    await sendAlertsToFocalPersons(record, remarks || record.remarks);

    return NextResponse.json({
      message: 'Missing person reported and alerts sent.',
      recordId: record._id,
    });
  } catch (error: any) {
    console.error('Error reporting:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}