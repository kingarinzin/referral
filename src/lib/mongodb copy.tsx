import { MongoClient } from "mongodb";

const uri = process.env.MONGODB_URI!;
export const DATABASE_NAME = process.env.MONGODB_DB_NAME || "civic_leave_db";
let client: MongoClient;
let clientPromise: Promise<MongoClient>;

if (!process.env.MONGODB_URI) {
  throw new Error("Please add your MongoDB URI to .env.local");
}

if (process.env.NODE_ENV === "development") {
  // Avoid multiple connections in development
  if (!(global as any)._mongoClientPromise) {
    client = new MongoClient(uri);
    (global as any)._mongoClientPromise = client.connect();
  }
  clientPromise = (global as any)._mongoClientPromise;
} else {
  // Production
  client = new MongoClient(uri);
  clientPromise = client.connect();
}

export async function connectToDatabase() {
  try {
    const client = await clientPromise;
    const db = client.db(DATABASE_NAME);

    // Test the connection
    await db.admin().ping();
    console.log("✅ MongoDB connected successfully");

    return { client, db };
  } catch (error) {
    console.error("❌ MongoDB connection failed:", error);
    throw error;
  }
}

export default clientPromise;