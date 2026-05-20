import { NextResponse } from 'next/server';
import { dbConnect } from '@/lib/dbConnect';
import Charge from '@/models/Charges';
import Section from '@/models/Section';

// GET all charges (populate section and act through section)
export async function GET() {
  try {
    await dbConnect();
    const charges = await Charge.find({})
      .populate({
        path: 'sectionId',
        populate: { path: 'actId', model: 'Act', select: 'name' }
      })
      .sort({ createdAt: -1 });
    return NextResponse.json(charges);
  } catch (error) {
    console.error('GET Charges Error:', error);
    return NextResponse.json({ error: 'Failed to fetch charges' }, { status: 500 });
  }
}

// POST create a new charge
export async function POST(request) {
  try {
    const body = await request.json();
    const { name, sectionId, remarks } = body;

    if (!name?.trim()) return NextResponse.json({ error: 'Charge name required' }, { status: 400 });
    if (!sectionId) return NextResponse.json({ error: 'Section is required' }, { status: 400 });

    await dbConnect();
    const charge = await Charge.create({ name: name.trim(), sectionId, remarks: remarks || '' });
    const populated = await Charge.findById(charge._id).populate({
      path: 'sectionId',
      populate: { path: 'actId', model: 'Act', select: 'name' }
    });
    return NextResponse.json(populated, { status: 201 });
  } catch (error) {
    console.error('POST Charge Error:', error);
    return NextResponse.json({ error: 'Failed to create charge' }, { status: 500 });
  }
}

// PUT update a charge
export async function PUT(request) {
  try {
    const body = await request.json();
    const { _id, name, sectionId, remarks } = body;

    if (!_id) return NextResponse.json({ error: 'Charge ID required' }, { status: 400 });
    if (!name?.trim()) return NextResponse.json({ error: 'Charge name required' }, { status: 400 });
    if (!sectionId) return NextResponse.json({ error: 'Section required' }, { status: 400 });

    await dbConnect();
    const updated = await Charge.findByIdAndUpdate(
      _id,
      { name: name.trim(), sectionId, remarks: remarks || '' },
      { new: true, runValidators: true }
    ).populate({
      path: 'sectionId',
      populate: { path: 'actId', model: 'Act', select: 'name' }
    });

    if (!updated) return NextResponse.json({ error: 'Charge not found' }, { status: 404 });
    return NextResponse.json(updated);
  } catch (error) {
    console.error('PUT Charge Error:', error);
    return NextResponse.json({ error: 'Failed to update charge' }, { status: 500 });
  }
}

// DELETE a charge
export async function DELETE(request) {
  try {
    const body = await request.json();
    const { _id } = body;
    if (!_id) return NextResponse.json({ error: 'Charge ID required' }, { status: 400 });

    await dbConnect();
    const deleted = await Charge.findByIdAndDelete(_id);
    if (!deleted) return NextResponse.json({ error: 'Charge not found' }, { status: 404 });
    return NextResponse.json({ message: 'Charge deleted successfully' });
  } catch (error) {
    console.error('DELETE Charge Error:', error);
    return NextResponse.json({ error: 'Failed to delete charge' }, { status: 500 });
  }
}