import { NextResponse } from 'next/server';
import { dbConnect } from '@/lib/dbConnect';
import Section from '@/models/Section';

// GET all sections (populate actId)
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const actId = searchParams.get('actId');

    await dbConnect();
    let query = {};
    if (actId) query.actId = actId;

    const sections = await Section.find(query).populate('actId', 'name').sort({ createdAt: -1 });
    return NextResponse.json(sections);
  } catch (error) {
    console.error('GET Sections Error:', error);
    return NextResponse.json({ error: 'Failed to fetch sections' }, { status: 500 });
  }
}

// POST create a new section
export async function POST(request) {
  try {
    const body = await request.json();
    const { name, actId, remarks } = body;

    if (!name || name.trim() === '') {
      return NextResponse.json({ error: 'Section name is required' }, { status: 400 });
    }
    if (!actId) {
      return NextResponse.json({ error: 'Act is required' }, { status: 400 });
    }

    await dbConnect();
    const section = await Section.create({ name: name.trim(), actId, remarks: remarks || '' });
    const populated = await Section.findById(section._id).populate('actId', 'name');
    return NextResponse.json(populated, { status: 201 });
  } catch (error) {
    console.error('POST Section Error:', error);
    return NextResponse.json({ error: 'Failed to create section' }, { status: 500 });
  }
}

// PUT update a section
export async function PUT(request) {
  try {
    const body = await request.json();
    const { _id, name, actId, remarks } = body;

    if (!_id) return NextResponse.json({ error: 'Section ID required' }, { status: 400 });
    if (!name?.trim()) return NextResponse.json({ error: 'Section name required' }, { status: 400 });
    if (!actId) return NextResponse.json({ error: 'Act required' }, { status: 400 });

    await dbConnect();
    const updated = await Section.findByIdAndUpdate(
      _id,
      { name: name.trim(), actId, remarks: remarks || '' },
      { new: true, runValidators: true }
    ).populate('actId', 'name');

    if (!updated) return NextResponse.json({ error: 'Section not found' }, { status: 404 });
    return NextResponse.json(updated);
  } catch (error) {
    console.error('PUT Section Error:', error);
    return NextResponse.json({ error: 'Failed to update section' }, { status: 500 });
  }
}

// DELETE a section
export async function DELETE(request) {
  try {
    const body = await request.json();
    const { _id } = body;
    if (!_id) return NextResponse.json({ error: 'Section ID required' }, { status: 400 });

    await dbConnect();
    const deleted = await Section.findByIdAndDelete(_id);
    if (!deleted) return NextResponse.json({ error: 'Section not found' }, { status: 404 });
    return NextResponse.json({ message: 'Section deleted successfully' });
  } catch (error) {
    console.error('DELETE Section Error:', error);
    return NextResponse.json({ error: 'Failed to delete section' }, { status: 500 });
  }
}