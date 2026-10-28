import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import Package from '@/models/Package';
import { syncToCloud } from '@/lib/cloudSync';

export const dynamic = 'force-dynamic';

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await connectDB();
    const body = await request.json();
    const { dailyLogs } = body;

    const pkg = await Package.findByIdAndUpdate(
      params.id,
      { $set: { dailyLogs } },
      { new: true, runValidators: true }
    ).lean();

    if (!pkg) return NextResponse.json({ error: 'Not found' }, { status: 404 });

    // Mirror daily logs update to cloud
    syncToCloud('packages', 'update', { _id: params.id, dailyLogs });

    return NextResponse.json(JSON.parse(JSON.stringify(pkg)));
  } catch (error) {
    console.error('PUT /api/packages/[id]/logs error:', error);
    return NextResponse.json({ error: 'Failed to update daily logs' }, { status: 500 });
  }
}
