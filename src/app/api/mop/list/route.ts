import { NextResponse } from 'next/server';
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

export async function GET() {
  try {
    const db = await getDb();
    const collection = db.collection('mop_records');
    const records = await collection.find({}).sort({ createdAt: -1 }).toArray();
    return NextResponse.json(records);
  } catch (error: any) {
    console.error('Error fetching list:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}