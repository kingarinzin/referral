import { NextResponse } from 'next/server';
import { dbConnect } from '@/lib/dbConnect';
import AccOagReferral from '@/models/AccOagReferral';
import { writeFile, mkdir } from 'fs/promises';
import path from 'path';
import { existsSync } from 'fs';
import jwt from 'jsonwebtoken';

const UPLOAD_DIR = 'uploads/acc-oag-referral';
const JWT_SECRET = process.env.JWT_SECRET || 'fallback-secret-for-dev';

async function saveFiles(files) {
  if (!files || files.length === 0) return [];
  const uploadPath = path.join(process.cwd(), 'public', UPLOAD_DIR);
  if (!existsSync(uploadPath)) {
    await mkdir(uploadPath, { recursive: true });
  }
  const savedFiles = [];
  for (const file of files) {
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    const timestamp = Date.now();
    const randomStr = Math.random().toString(36).substring(7);
    const safeName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_');
    const filename = `${timestamp}-${randomStr}-${safeName}`;
    const filePath = path.join(uploadPath, filename);
    await writeFile(filePath, buffer);
    savedFiles.push(filename);
  }
  return savedFiles;
}

function getUserFromRequest(req) {
  const authHeader = req.headers.get('authorization');
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    throw new Error('Unauthorized: No token provided');
  }
  const token = authHeader.split(' ')[1];
  const decoded = jwt.verify(token, JWT_SECRET);
  console.log('Decoded token for update:', decoded); // Debug log

  // Extract user ID – try multiple possible field names
  const userId = decoded.id || decoded._id || decoded.userId;
  if (!userId) throw new Error('User ID not found in token');

  // Extract user name – try many common field names
  let userName = decoded.name || decoded.userName || decoded.fullName || decoded.displayName;
  if (!userName && decoded.email) {
    // Fallback: use part of email before '@'
    userName = decoded.email.split('@')[0];
  }
  if (!userName) {
    userName = 'Unknown User';
  }

  // Extract email – fallback to a constructed value if missing
  const userEmail = decoded.email || `${userId}@unknown.com`;

  return {
    _id: userId,
    name: userName,
    email: userEmail,
  };
}

export async function POST(req) {
  try {
    await dbConnect();
    const formData = await req.formData();
    const caseId = formData.get('caseId');
    const status = formData.get('status');
    const reply = formData.get('reply');
    const attachments = formData.getAll('attachments').filter(f => f instanceof File);

    if (!caseId || !status || !reply) {
      return NextResponse.json(
        { error: 'Missing required fields: caseId, status, reply' },
        { status: 400 }
      );
    }

    let user;
    try {
      user = getUserFromRequest(req);
    } catch (err) {
      console.error('Auth error:', err.message);
      return NextResponse.json({ error: err.message }, { status: 401 });
    }

    const savedAttachments = await saveFiles(attachments);

    const update = {
      status,
      reply,
      attachments: savedAttachments,
      updatedBy: user,
    };

    const updatedCase = await AccOagReferral.findByIdAndUpdate(
      caseId,
      { $push: { updates: update } },
      { new: true, runValidators: true }
    );

    if (!updatedCase) {
      return NextResponse.json({ error: 'Case not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true, case: updatedCase });
  } catch (error) {
    console.error('Add update error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}