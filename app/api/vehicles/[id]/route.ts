import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import VehicleLog from '@/models/VehicleLog';
import { syncToCloud } from '@/lib/cloudSync';

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

    // Mirror to cloud
    syncToCloud('vehiclelogs', 'update', { _id: params.id, ...body });

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

    // Mirror to cloud
    syncToCloud('vehiclelogs', 'delete', params.id);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('DELETE /api/vehicles/[id] error:', error);
    return NextResponse.json({ error: 'Failed to delete vehicle log' }, { status: 500 });
  }
}
