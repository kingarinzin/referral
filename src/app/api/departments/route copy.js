import clientPromise from "@/lib/mongodb";
import { ObjectId } from "mongodb"; // ⚡ important


export async function GET() {
 try {
   const client = await clientPromise;
   const db = client.db("civic_leave_db");
   const departments = await db.collection("departments").find({}).toArray();
   return new Response(JSON.stringify(departments), { status: 200 });
 } catch (error) {
   return new Response(JSON.stringify({ error: error.message }), { status: 500 });
 }
}


export async function POST(req) {
 try {
   const client = await clientPromise;
   const db = client.db("civic_leave_db");
   const body = await req.json();
   const result = await db.collection("departments").insertOne(body);
   return new Response(JSON.stringify(result), { status: 201 });
 } catch (error) {
   return new Response(JSON.stringify({ error: error.message }), { status: 500 });
 }
}


export async function PUT(req) {
 try {
   const client = await clientPromise;
   const db = client.db("civic_leave_db");
   const { _id, name, remarks } = await req.json();


   if (!_id) throw new Error("ID is required for updating");


   const result = await db
     .collection("departments")
     .updateOne(
       { _id: new ObjectId(_id) },
       { $set: { name, remarks } }
     );


   return new Response(JSON.stringify(result), { status: 200 });
 } catch (error) {
   return new Response(JSON.stringify({ error: error.message }), { status: 500 });
 }
}


export async function DELETE(req) {
 try {
   const client = await clientPromise;
   const db = client.db("civic_leave_db");
   const { _id } = await req.json();


   if (!_id) throw new Error("ID is required for deletion");


   const result = await db
     .collection("departments")
     .deleteOne({ _id: new ObjectId(_id) });


   return new Response(JSON.stringify(result), { status: 200 });
 } catch (error) {
   return new Response(JSON.stringify({ error: error.message }), { status: 500 });
 }
}



