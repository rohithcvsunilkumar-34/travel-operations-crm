import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import Package from '@/models/Package';

export const dynamic = 'force-dynamic';

export async function GET(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await connectDB();
    const pkg = await Package.findById(params.id).lean();
    if (!pkg) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    return NextResponse.json(JSON.parse(JSON.stringify(pkg)));
  } catch (error) {
    console.error('GET /api/packages/[id] error:', error);
    return NextResponse.json({ error: 'Failed to fetch package' }, { status: 500 });
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await connectDB();
    const body = await request.json();

    // Auto-calc balance
    const packageAmount = Number(body.packageAmount) || 0;
    const advancePaid = Number(body.advancePaid) || 0;
    body.balancePending = packageAmount - advancePaid;

    const pkg = await Package.findByIdAndUpdate(params.id, body, {
      new: true,
      runValidators: true,
    }).lean();

    if (!pkg) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    return NextResponse.json(JSON.parse(JSON.stringify(pkg)));
  } catch (error) {
    console.error('PUT /api/packages/[id] error:', error);
    return NextResponse.json({ error: 'Failed to update package' }, { status: 500 });
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await connectDB();
    const pkg = await Package.findByIdAndDelete(params.id).lean();
    if (!pkg) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('DELETE /api/packages/[id] error:', error);
    return NextResponse.json({ error: 'Failed to delete package' }, { status: 500 });
  }
}
