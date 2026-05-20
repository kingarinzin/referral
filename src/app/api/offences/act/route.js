import { NextResponse } from 'next/server';
import { dbConnect } from '@/lib/dbConnect';
import Act from '@/models/model';   // <-- changed from '@/models/Act' to '@/models/model'

// GET all acts
export async function GET() {
  try {
    await dbConnect();
    const acts = await Act.find({}).sort({ createdAt: -1 });
    return NextResponse.json(acts);
  } catch (error) {
    console.error('GET Acts Error:', error);
    return NextResponse.json({ error: 'Failed to fetch acts' }, { status: 500 });
  }
}

// POST create a new act
export async function POST(request) {
  try {
    const body = await request.json();
    const { name, remarks } = body;

    if (!name || name.trim() === '') {
      return NextResponse.json({ error: 'Act name is required' }, { status: 400 });
    }

    await dbConnect();
    const act = await Act.create({ name: name.trim(), remarks: remarks || '' });
    return NextResponse.json(act, { status: 201 });
  } catch (error) {
    console.error('POST Act Error:', error);
    return NextResponse.json({ error: 'Failed to create act' }, { status: 500 });
  }
}

// PUT update an existing act
export async function PUT(request) {
  try {
    const body = await request.json();
    const { _id, name, remarks } = body;

    if (!_id) {
      return NextResponse.json({ error: 'Act ID is required' }, { status: 400 });
    }

    if (!name || name.trim() === '') {
      return NextResponse.json({ error: 'Act name is required' }, { status: 400 });
    }

    await dbConnect();
    const updatedAct = await Act.findByIdAndUpdate(
      _id,
      { name: name.trim(), remarks: remarks || '' },
      { new: true, runValidators: true }
    );

    if (!updatedAct) {
      return NextResponse.json({ error: 'Act not found' }, { status: 404 });
    }

    return NextResponse.json(updatedAct);
  } catch (error) {
    console.error('PUT Act Error:', error);
    return NextResponse.json({ error: 'Failed to update act' }, { status: 500 });
  }
}

// DELETE an act
export async function DELETE(request) {
  try {
    const body = await request.json();
    const { _id } = body;

    if (!_id) {
      return NextResponse.json({ error: 'Act ID is required' }, { status: 400 });
    }

    await dbConnect();
    const deletedAct = await Act.findByIdAndDelete(_id);

    if (!deletedAct) {
      return NextResponse.json({ error: 'Act not found' }, { status: 404 });
    }

    return NextResponse.json({ message: 'Act deleted successfully' });
  } catch (error) {
    console.error('DELETE Act Error:', error);
    return NextResponse.json({ error: 'Failed to delete act' }, { status: 500 });
  }
}