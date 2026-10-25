import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import Package from '@/models/Package';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    await connectDB();
    const { searchParams } = new URL(request.url);
    const fromDate = searchParams.get('fromDate');
    const toDate = searchParams.get('toDate');
    const agency = searchParams.get('agency');
    const search = searchParams.get('search');
    const sort = searchParams.get('sort') || 'asc';
    const status = searchParams.get('status');

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const query: any = {};

    if (fromDate || toDate) {
      query.checkInDate = {};
      if (fromDate) query.checkInDate.$gte = new Date(fromDate);
      if (toDate) {
        const end = new Date(toDate);
        end.setHours(23, 59, 59, 999);
        query.checkInDate.$lte = end;
      }
    }
    if (agency && agency !== 'all') {
      query.agencyName = { $regex: agency, $options: 'i' };
    }
    if (search) {
      query.$or = [
        { guestName: { $regex: search, $options: 'i' } },
        { bookingId: { $regex: search, $options: 'i' } },
        { contactNumber: { $regex: search, $options: 'i' } },
      ];
    }
    if (status && status !== 'all') {
      query.status = status;
    }

    const sortOrder = sort === 'desc' ? -1 : 1;
    const packages = await Package.find(query)
      .sort({ checkInDate: sortOrder })
      .lean();

    return NextResponse.json(JSON.parse(JSON.stringify(packages)));
  } catch (error) {
    console.error('GET /api/packages error:', error);
    return NextResponse.json({ error: 'Failed to fetch packages' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    await connectDB();
    const body = await request.json();

    // Auto-calc balance
    const packageAmount = Number(body.packageAmount) || 0;
    const advancePaid = Number(body.advancePaid) || 0;
    body.balancePending = packageAmount - advancePaid;

    const pkg = new Package(body);
    await pkg.save();

    return NextResponse.json(JSON.parse(JSON.stringify(pkg)), { status: 201 });
  } catch (error) {
    console.error('POST /api/packages error:', error);
    return NextResponse.json({ error: 'Failed to create package' }, { status: 500 });
  }
}
