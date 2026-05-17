import { NextResponse } from "next/server";
import clientPromise from "@/lib/mongodb";
import { getUserFromToken } from "@/lib/get-user-from-token";
import { ObjectId } from "mongodb";

export async function POST(req: Request) {
  try {
    const currentUser = await getUserFromToken(req);
    if (!currentUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    
    // Check if user has admin privileges (super admin OR agency admin)
    if (!currentUser.isAdmin && !currentUser.isAgencyAdmin) {
      return NextResponse.json({ error: "Admin access required" }, { status: 403 });
    }

    const { userId, action } = await req.json();
    if (!userId || !action) {
      return NextResponse.json({ error: "User ID and action are required" }, { status: 400 });
    }

    if (action !== "approve" && action !== "reject") {
      return NextResponse.json({ error: "Action must be 'approve' or 'reject'" }, { status: 400 });
    }

    const client = await clientPromise;
    const db = client.db("referral_db");

    // Get the user being approved/rejected
    const userToApprove = await db.collection("users").findOne({
      _id: new ObjectId(userId),
    });
    
    if (!userToApprove) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // If current user is agency admin (not super admin), verify the user belongs to their agency
    if (!currentUser.isAdmin && currentUser.isAgencyAdmin) {
      // Get the user's department to find their agency
      const department = await db.collection("departments").findOne({
        _id: new ObjectId(userToApprove.departmentId),
      });
      
      const userAgencyId = department?.agencyId?.toString();
      const adminAgencyId = currentUser.agencyId?.toString();
      
      if (userAgencyId !== adminAgencyId) {
        return NextResponse.json(
          { error: "You can only approve/reject users from your own agency" },
          { status: 403 }
        );
      }
    }

    // Update user status based on action
    const status = action === "approve" ? "approved" : "rejected";
    const isApproved = action === "approve";
    const isActive = action === "approve";

    const result = await db.collection("users").updateOne(
      { _id: new ObjectId(userId) },
      {
        $set: {
          approvalStatus: status,
          isApproved: isApproved,
          isActive: isActive,
          updatedAt: new Date(),
        },
      }
    );

    if (result.matchedCount === 0) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Optional: Send email notification to the user
    if (action === "approve") {
      try {
        const nodemailer = require("nodemailer");
        const transporter = nodemailer.createTransport({
          host: "smtp.gmail.com",
          port: 587,
          secure: false,
          auth: {
            user: process.env.EMAIL_USER,
            pass: process.env.EMAIL_PASSWORD,
          },
        });
        
        await transporter.sendMail({
          from: process.env.EMAIL_USER,
          to: userToApprove.email,
          subject: "Your Account Has Been Approved",
          html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
              <h2 style="color: #2563eb;">Account Approved</h2>
              <p>Hi ${userToApprove.name || userToApprove.email},</p>
              <p>Your account has been approved! You can now log in to the system.</p>
              <p>Click the link below to login:</p>
              <a href="${process.env.NEXTAUTH_URL || "http://localhost:3000"}/login" style="background-color: #2563eb; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">Login to Your Account</a>
              <p style="color: #6b7280; font-size: 14px; margin-top: 30px;">This is an automated message. Please do not reply.</p>
            </div>
          `,
        });
      } catch (emailError) {
        console.error("Failed to send approval email:", emailError);
      }
    }

    return NextResponse.json({
      success: true,
      message: `User ${action === "approve" ? "approved" : "rejected"} successfully`,
    });
  } catch (error) {
    console.error("Error processing user approval:", error);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}