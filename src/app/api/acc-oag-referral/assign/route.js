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
    const prosecutor = await db.collection('users').findOne(
      { _id: new ObjectId(prosecutorId), role: 'Prosecutor' },
      { projection: { name: 1, email: 1 } }
    );
    if (!prosecutor) {
      return NextResponse.json({ error: 'Prosecutor not found' }, { status: 404 });
    }
    await db.collection('acc_oag_referral').updateOne(
      { _id: new ObjectId(caseId) },
      { $set: { assignedProsecutor: { _id: prosecutor._id.toString(), name: prosecutor.name, email: prosecutor.email } } }
    );
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Assign error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}