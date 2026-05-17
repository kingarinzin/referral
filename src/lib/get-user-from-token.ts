import jwt from "jsonwebtoken";
import clientPromise from "@/lib/mongodb";
import { ObjectId } from "mongodb";

export async function getUserFromToken(req: Request) {
  const authHeader = req.headers.get("authorization");
  if (!authHeader?.startsWith("Bearer ")) return null;
  const token = authHeader.split(" ")[1];
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET!) as { id: string };
    const client = await clientPromise;
    const db = client.db("referral_db");
    const user = await db.collection("users").findOne({ _id: new ObjectId(decoded.id) });
    return user;
  } catch {
    return null;
  }
}