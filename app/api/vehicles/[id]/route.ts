import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import VehicleLog from '@/models/VehicleLog';

export const dynamic = 'force-dynamic';

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await connectDB();
    const body = await request.json();
    const log = await VehicleLog.findByIdAndUpdate(params.id, body, {
      new: true,
      runValidators: true,
    }).lean();
    if (!log) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    return NextResponse.json(JSON.parse(JSON.stringify(log)));
  } catch (error) {
    console.error('PUT /api/vehicles/[id] error:', error);
    return NextResponse.json({ error: 'Failed to update vehicle log' }, { status: 500 });
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await connectDB();
    const log = await VehicleLog.findByIdAndDelete(params.id).lean();
    if (!log) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('DELETE /api/vehicles/[id] error:', error);
    return NextResponse.json({ error: 'Failed to delete vehicle log' }, { status: 500 });
  }
}
