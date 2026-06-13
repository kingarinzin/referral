import { NextResponse } from 'next/server';
import clientPromise from '@/lib/mongodb';
import { ObjectId } from 'mongodb';

export async function POST(req) {
  try {
    const client = await clientPromise;
    const db = client.db('referral_db');
    const { caseId, prosecutorId } = await req.json();

    if (!caseId || !prosecutorId) {
      return NextResponse.json({ error: 'caseId and prosecutorId required' }, { status: 400 });
    }

    // Find the officer (role = 'Officer')
    const officer = await db.collection('users').findOne(
      { _id: new ObjectId(prosecutorId), role: 'Officer' },
      { projection: { name: 1, email: 1 } }
    );

    if (!officer) {
      return NextResponse.json({ error: 'Officer not found' }, { status: 404 });
    }

    // ✅ Use the correct collection name: 'accoagreferrals'
    const result = await db.collection('accoagreferrals').updateOne(
      { _id: new ObjectId(caseId) },
      {
        $set: {
          assignedProsecutor: {
            _id: officer._id.toString(),
            name: officer.name,
            email: officer.email,
          },
        },
      }
    );

    if (result.matchedCount === 0) {
      return NextResponse.json({ error: 'Case not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Assign error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}