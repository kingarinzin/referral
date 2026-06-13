import { NextResponse } from 'next/server';
import { dbConnect } from '@/lib/dbConnect';
import AccOagReferral from '@/models/AccOagReferral';
import Act from '@/models/model';
import Section from '@/models/Section';
import Charge from '@/models/Charges';
import { writeFile, mkdir, unlink } from 'fs/promises';
import path from 'path';
import { existsSync } from 'fs';
import jwt from 'jsonwebtoken';

const UPLOAD_DIR = 'uploads/acc-oag-referral';
const JWT_SECRET = process.env.JWT_SECRET || 'fallback-secret-for-dev';

async function ensureUploadDir() {
  const uploadPath = path.join(process.cwd(), 'public', UPLOAD_DIR);
  if (!existsSync(uploadPath)) {
    await mkdir(uploadPath, { recursive: true });
  }
  return uploadPath;
}

async function saveFiles(files) {
  if (!files || files.length === 0) return [];
  const uploadPath = await ensureUploadDir();
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

function extractMeetingAttachments(formData) {
  const meetingFiles = new Map();
  for (const [key, value] of formData.entries()) {
    if (key.startsWith('meeting_attachments_')) {
      const idx = parseInt(key.split('_').pop(), 10);
      if (!isNaN(idx) && value instanceof File) {
        if (!meetingFiles.has(idx)) meetingFiles.set(idx, []);
        meetingFiles.get(idx).push(value);
      }
    }
  }
  return meetingFiles;
}

function getSafeUser(req) {
  try {
    const authHeader = req.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return { _id: 'system', name: 'System User', email: 'system@localhost' };
    }
    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, JWT_SECRET);
    return {
      _id: decoded.id || decoded._id || decoded.userId || 'unknown',
      name: decoded.name || decoded.userName || 'Unknown',
      email: decoded.email || 'unknown@localhost',
    };
  } catch (err) {
    console.error('JWT error:', err.message);
    return { _id: 'system', name: 'System User', email: 'system@localhost' };
  }
}

export async function GET(req) {
  try {
    await dbConnect();
    const { searchParams } = new URL(req.url);
    const caseNo = searchParams.get('caseNo');
    let query = {};
    if (caseNo) query = { caseNo };
    const cases = await AccOagReferral.find(query)
      .populate('accusedDetails.actId', 'name')
      .populate('accusedDetails.sectionId', 'name')
      .populate('accusedDetails.chargeId', 'name')
      .sort({ createdAt: -1 });
    return NextResponse.json(cases);
  } catch (error) {
    console.error('GET error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(req) {
  try {
    await dbConnect();
    const formData = await req.formData();

    const caseNo = formData.get('caseNo');
    const caseDescription = formData.get('caseDescription');
    const investigatorName = formData.get('investigatorName');
    const investigatorDesignation = formData.get('investigatorDesignation') || '';
    const investigatorContact = formData.get('investigatorContact') || '';
    const remarks = formData.get('remarks') || '';
    const attachments = formData.getAll('attachments');
    const accusedDetailsRaw = formData.get('accusedDetails');
    const meetingsRaw = formData.get('meetings');

    // Validation
    if (!caseNo || !caseDescription || !investigatorName) {
      return NextResponse.json(
        { error: 'Case No, Description, and Investigator are required' },
        { status: 400 }
      );
    }

    const existing = await AccOagReferral.findOne({ caseNo });
    if (existing) {
      return NextResponse.json({ error: 'Case number already exists' }, { status: 400 });
    }

    // Parse accused
    let accusedDetails = [];
    if (accusedDetailsRaw) {
      try {
        accusedDetails = JSON.parse(accusedDetailsRaw);
      } catch (e) {
        return NextResponse.json({ error: 'Invalid accusedDetails JSON' }, { status: 400 });
      }
    }

    // Parse meetings – CRITICAL PART
    let meetings = [];
    if (meetingsRaw) {
      try {
        meetings = JSON.parse(meetingsRaw);
        if (!Array.isArray(meetings)) meetings = [];
      } catch (e) {
        return NextResponse.json({ error: 'Invalid meetings JSON' }, { status: 400 });
      }
    }

    // Save case‑level attachments
    const savedCaseAttachments = await saveFiles(attachments);

    // Save meeting attachments
    const meetingFilesMap = extractMeetingAttachments(formData);
    for (let i = 0; i < meetings.length; i++) {
      const filesForMeeting = meetingFilesMap.get(i) || [];
      if (filesForMeeting.length > 0) {
        const savedMeetingFiles = await saveFiles(filesForMeeting);
        // Ensure attachments array exists and merge new files
        meetings[i].attachments = [...(meetings[i].attachments || []), ...savedMeetingFiles];
      } else {
        // Ensure attachments array exists (even if no new files)
        if (!meetings[i].attachments) meetings[i].attachments = [];
      }
    }

    const createdBy = getSafeUser(req);

    // CREATE CASE – MAKE SURE `meetings` IS INCLUDED
    const newCase = await AccOagReferral.create({
      caseNo,
      caseDescription,
      investigatorName,
      investigatorDesignation,
      investigatorContact,
      attachments: savedCaseAttachments,
      accusedDetails,
      meetings,            // <<<< MUST BE HERE
      status: 'Pending',
      remarks,
      createdBy,
    });

    // Return populated case (so frontend can verify meetings)
    const populated = await AccOagReferral.findById(newCase._id)
      .populate('accusedDetails.actId', 'name')
      .populate('accusedDetails.sectionId', 'name')
      .populate('accusedDetails.chargeId', 'name');

    return NextResponse.json(populated, { status: 201 });
  } catch (error) {
    console.error('POST error:', error);
    // Return detailed error for debugging
    return NextResponse.json(
      { error: error.message, stack: error.stack, name: error.name },
      { status: 500 }
    );
  }
}

// PUT and DELETE – copy from your existing working versions (they should be unchanged)
export async function PUT(req) {
  // ... your existing PUT handler (ensure it also updates meetings)
  try {
    await dbConnect();
    const formData = await req.formData();
    const _id = formData.get('_id');
    if (!_id) return NextResponse.json({ error: 'ID required' }, { status: 400 });
    const existing = await AccOagReferral.findById(_id);
    if (!existing) return NextResponse.json({ error: 'Case not found' }, { status: 404 });

    const caseNo = formData.get('caseNo');
    const caseDescription = formData.get('caseDescription');
    const investigatorName = formData.get('investigatorName');
    const investigatorDesignation = formData.get('investigatorDesignation') || '';
    const investigatorContact = formData.get('investigatorContact') || '';
    const status = formData.get('status') || existing.status;
    const remarks = formData.get('remarks') || '';
    const attachments = formData.getAll('attachments');
    const existingAttachmentsRaw = formData.get('existingAttachments');
    const accusedDetailsRaw = formData.get('accusedDetails');
    const meetingsRaw = formData.get('meetings');

    // ... (rest of your PUT logic, similar to POST but updating)
    // IMPORTANT: parse meetingsRaw and update meetings array just like in POST
    // ...
    return NextResponse.json(updated);
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE(req) {
  // ... your existing DELETE handler
}