import { NextResponse } from 'next/server';
import { dbConnect } from '@/lib/dbConnect';
import AccOagReferral from '@/models/AccOagReferral';

// Import all models that are referenced in populate()
// This ensures they are registered with Mongoose
import Act from '@/models/model'; 
import Section from '@/models/Section';
import Charge from '@/models/Charges';

import { writeFile, mkdir, unlink } from 'fs/promises';
import path from 'path';
import { existsSync } from 'fs';

const UPLOAD_DIR = 'uploads/acc-oag-referral';

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
    const meetingsRaw = formData.get('meetings');       // ✅ new

    if (!caseNo || !caseDescription || !investigatorName) {
      return NextResponse.json({ error: 'Case No, Description, and Investigator are required' }, { status: 400 });
    }

    const existing = await AccOagReferral.findOne({ caseNo });
    if (existing) {
      return NextResponse.json({ error: 'Case number already exists' }, { status: 400 });
    }

    let accusedDetails = [];
    if (accusedDetailsRaw) {
      try {
        accusedDetails = JSON.parse(accusedDetailsRaw);
      } catch (e) {
        console.error('Invalid accusedDetails JSON');
      }
    }

    let meetings = [];
    if (meetingsRaw) {
      try {
        meetings = JSON.parse(meetingsRaw);
      } catch (e) {
        console.error('Invalid meetings JSON');
      }
    }

    const savedFiles = await saveFiles(attachments);

    const newCase = await AccOagReferral.create({
      caseNo,
      caseDescription,
      investigatorName,
      investigatorDesignation,
      investigatorContact,
      attachments: savedFiles,
      accusedDetails,
      meetings,                     // ✅ store meetings
      status: 'Pending',
      remarks,
    });

    const populated = await AccOagReferral.findById(newCase._id)
      .populate('accusedDetails.actId', 'name')
      .populate('accusedDetails.sectionId', 'name')
      .populate('accusedDetails.chargeId', 'name');

    return NextResponse.json(populated, { status: 201 });
  } catch (error) {
    console.error('POST error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function PUT(req) {
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
    const meetingsRaw = formData.get('meetings');       // ✅ new

    if (caseNo !== existing.caseNo) {
      const duplicate = await AccOagReferral.findOne({ caseNo, _id: { $ne: _id } });
      if (duplicate) {
        return NextResponse.json({ error: 'Case number already exists' }, { status: 400 });
      }
    }

    let attachmentsToKeep = [];
    if (existingAttachmentsRaw) {
      try {
        attachmentsToKeep = JSON.parse(existingAttachmentsRaw);
      } catch (e) {
        attachmentsToKeep = existing.attachments || [];
      }
    } else {
      attachmentsToKeep = existing.attachments || [];
    }

    const removed = (existing.attachments || []).filter(f => !attachmentsToKeep.includes(f));
    const uploadPath = path.join(process.cwd(), 'public', UPLOAD_DIR);
    for (const filename of removed) {
      try {
        const filePath = path.join(uploadPath, filename);
        if (existsSync(filePath)) await unlink(filePath);
      } catch (err) { console.error(`Error deleting ${filename}:`, err); }
    }

    const newFiles = await saveFiles(attachments);
    const allAttachments = [...attachmentsToKeep, ...newFiles];

    let accusedDetails = [];
    if (accusedDetailsRaw) {
      try {
        accusedDetails = JSON.parse(accusedDetailsRaw);
      } catch (e) {
        accusedDetails = existing.accusedDetails;
      }
    } else {
      accusedDetails = existing.accusedDetails;
    }

    let meetings = [];
    if (meetingsRaw) {
      try {
        meetings = JSON.parse(meetingsRaw);
      } catch (e) {
        meetings = existing.meetings || [];
      }
    } else {
      meetings = existing.meetings || [];
    }

    const updated = await AccOagReferral.findByIdAndUpdate(
      _id,
      {
        caseNo,
        caseDescription,
        investigatorName,
        investigatorDesignation,
        investigatorContact,
        attachments: allAttachments,
        accusedDetails,
        meetings,                     // ✅ update meetings
        status,
        remarks,
      },
      { new: true, runValidators: true }
    );

    const populated = await AccOagReferral.findById(updated._id)
      .populate('accusedDetails.actId', 'name')
      .populate('accusedDetails.sectionId', 'name')
      .populate('accusedDetails.chargeId', 'name');

    return NextResponse.json(populated);
  } catch (error) {
    console.error('PUT error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE(req) {
  try {
    await dbConnect();
    const { _id } = await req.json();
    if (!_id) return NextResponse.json({ error: 'ID required' }, { status: 400 });

    const existing = await AccOagReferral.findById(_id);
    if (!existing) return NextResponse.json({ error: 'Case not found' }, { status: 404 });

    const uploadPath = path.join(process.cwd(), 'public', UPLOAD_DIR);
    for (const filename of existing.attachments || []) {
      try {
        const filePath = path.join(uploadPath, filename);
        if (existsSync(filePath)) await unlink(filePath);
      } catch (err) { console.error(`Error deleting ${filename}:`, err); }
    }

    await AccOagReferral.findByIdAndDelete(_id);
    return NextResponse.json({ message: 'Case deleted successfully' });
  } catch (error) {
    console.error('DELETE error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}