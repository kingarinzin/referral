import { NextResponse } from 'next/server';
import { dbConnect } from '@/lib/dbConnect';
import AccOagReferral from '@/models/AccOagReferral';
import { unlink } from 'fs/promises';
import path from 'path';
import { existsSync } from 'fs';

const UPLOAD_DIR = 'uploads/acc-oag-referral';

export async function POST(req) {
  try {
    const { caseId, fileName } = await req.json();
    if (!caseId || !fileName) {
      return NextResponse.json({ error: 'Case ID and file name required' }, { status: 400 });
    }

    await dbConnect();
    const caseDoc = await AccOagReferral.findById(caseId);
    if (!caseDoc) {
      return NextResponse.json({ error: 'Case not found' }, { status: 404 });
    }

    // Remove from database array
    const updatedAttachments = caseDoc.attachments.filter(f => f !== fileName);
    await AccOagReferral.findByIdAndUpdate(caseId, { attachments: updatedAttachments });

    // Delete physical file
    const filePath = path.join(process.cwd(), 'public', UPLOAD_DIR, fileName);
    if (existsSync(filePath)) {
      await unlink(filePath);
    }

    return NextResponse.json({ message: 'File deleted successfully' });
  } catch (error) {
    console.error('Delete file error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}