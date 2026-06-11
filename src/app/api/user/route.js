import { NextResponse } from 'next/server';
import clientPromise from '@/lib/mongodb';
import { ObjectId } from 'mongodb';

export async function GET(req) {

  try {
    const client = await clientPromise;
    const db = client.db('referral_db');
    const { searchParams } = new URL(req.url);
    const role = searchParams.get('role');
    let query = {};
    if (role) query.role = role;
    const users = await db.collection('users').find(query).project({ name: 1, email: 1, role: 1 }).toArray();
    return NextResponse.json(users);
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}