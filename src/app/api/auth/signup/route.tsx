import { NextResponse } from "next/server";
import clientPromise from "@/lib/mongodb";
import bcrypt from "bcryptjs";
import { ObjectId } from "mongodb";

const nodemailer = require("nodemailer");

function createTransporter() {
  return nodemailer.createTransport({
    host: "smtp.gmail.com",
    port: 587,
    secure: false,
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASSWORD,
    },
  });
}

export async function POST(req: Request) {
  try {
    const {
      name,
      cid,
      designation,
      phone,
      email,
      departmentId,
      divisionId,
      password,
    } = await req.json();

    // Validation
    if (!name || !cid || !designation || !phone || !email || !departmentId || !divisionId || !password) {
      return NextResponse.json({ error: "All fields are required" }, { status: 400 });
    }

    const client = await clientPromise;
    const db = client.db("referral_db");
    const users = db.collection("users");

    const existingUser = await users.findOne({ email });
    if (existingUser) {
      return NextResponse.json({ error: "Email already registered" }, { status: 400 });
    }

    // Convert IDs to ObjectId
    let deptObjectId, divObjectId;
    try {
      deptObjectId = new ObjectId(departmentId);
      divObjectId = new ObjectId(divisionId);
    } catch (err) {
      return NextResponse.json({ error: "Invalid department or division ID" }, { status: 400 });
    }

    // Get department to extract agencyId
    const department = await db.collection("departments").findOne({ _id: deptObjectId });
    if (!department) {
      return NextResponse.json({ error: "Invalid department" }, { status: 400 });
    }
    const agencyId = department.agencyId;
    if (!agencyId) {
      return NextResponse.json({ error: "Department missing agency association" }, { status: 500 });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const newUser = {
      name,
      cid,
      designation,
      phone,
      email,
      departmentId: deptObjectId,
      divisionId: divObjectId,
      agencyId: new ObjectId(agencyId),   // store as ObjectId
      role: "Officer",
      password: hashedPassword,
      isAdmin: false,
      isAgencyAdmin: false,
      approvalStatus: "pending",
      isActive: true,
      createdAt: new Date(),
    };

    await users.insertOne(newUser);

    // Email notification (unchanged)
    try {
      const transporter = createTransporter();
      await transporter.sendMail({
        from: process.env.EMAIL_USER,
        to: email,
        subject: "Registration Submitted - Pending Approval",
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #2563eb;">Registration Received</h2>
            <p>Hi ${name},</p>
            <p>Your account has been created and is currently <strong>pending approval</strong>.</p>
            <p>You will receive an email once an administrator approves your account.</p>
            <p style="color: #6b7280; font-size: 14px; margin-top: 30px;">
              This is an automated message. Please do not reply.
            </p>
          </div>
        `,
      });
    } catch (emailError) {
      console.error("Failed to send user notification email:", emailError);
    }

    return NextResponse.json({
      message: "Registration submitted. Await admin approval.",
      status: "pending",
    });
  } catch (error) {
    console.error("Signup error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}