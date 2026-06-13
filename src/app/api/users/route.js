import { NextResponse } from 'next/server';
import clientPromise from '@/lib/mongodb';
import { ObjectId } from 'mongodb';

export async function GET(req) {
  try {
    const client = await clientPromise;
    const db = client.db('referral_db');
    const { searchParams } = new URL(req.url);
    const role = searchParams.get('role');
    const agencyId = searchParams.get('agencyId');

    let query = {};
    if (role) query.role = role;
    if (agencyId && ObjectId.isValid(agencyId)) query.agencyId = new ObjectId(agencyId);

    const users = await db.collection('users')
      .find(query)
      .project({ name: 1, email: 1, role: 1 })
      .toArray();

    return NextResponse.json(users);
  } catch (error) {
    console.error('Error fetching users:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}