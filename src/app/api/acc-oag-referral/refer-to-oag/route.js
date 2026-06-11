import { NextResponse } from 'next/server';
import { dbConnect } from '@/lib/dbConnect';
import AccOagReferral from '@/models/AccOagReferral';

export async function POST(req) {
  try {
    await dbConnect();
    const { caseId } = await req.json();
    if (!caseId) {
      return NextResponse.json({ error: 'caseId required' }, { status: 400 });
    }

    const updatedCase = await AccOagReferral.findByIdAndUpdate(
      caseId,
      { $set: { referredToOAG: true, referredAt: new Date() } },
      { new: true }
    );

    if (!updatedCase) {
      return NextResponse.json({ error: 'Case not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Refer error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}