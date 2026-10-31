import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import VehicleLog from '@/models/VehicleLog';
import { syncToCloud } from '@/lib/cloudSync';
import { syncPackageFinancials } from '@/lib/packageFinancials';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    await connectDB();
    const { searchParams } = new URL(request.url);
    const fromDate = searchParams.get('fromDate');
    const toDate = searchParams.get('toDate');
    const date = searchParams.get('date');
    const packageId = searchParams.get('packageId');
    const search = searchParams.get('search');
    const sort = searchParams.get('sort') || 'asc';

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const query: any = {};

    if (packageId) {
      query.packageId = packageId;
    }

    if (date) {
      const d = new Date(date);
      const start = new Date(d);
      start.setHours(0, 0, 0, 0);
      const end = new Date(d);
      end.setHours(23, 59, 59, 999);
      query.operationDate = { $gte: start, $lte: end };
    } else if (fromDate || toDate) {
      query.operationDate = {};
      if (fromDate) query.operationDate.$gte = new Date(fromDate);
      if (toDate) {
        const end = new Date(toDate);
        end.setHours(23, 59, 59, 999);
        query.operationDate.$lte = end;
      }
    }

    if (search) {
      query.$or = [
        { guestName: { $regex: search, $options: 'i' } },
        { vendorName: { $regex: search, $options: 'i' } },
        { driverName: { $regex: search, $options: 'i' } },
        { dutyRoute: { $regex: search, $options: 'i' } },
      ];
    }

    const sortOrder = sort === 'desc' ? -1 : 1;
    const logs = await VehicleLog.find(query)
      .sort({ operationDate: sortOrder })
      .lean();

    return NextResponse.json(JSON.parse(JSON.stringify(logs)));
  } catch (error) {
    console.error('GET /api/vehicles error:', error);
    return NextResponse.json({ error: 'Failed to fetch vehicle logs' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    await connectDB();
    const body = await request.json();
    const log = new VehicleLog(body);
    await log.save();

    // Mirror to cloud
    syncToCloud('vehiclelogs', 'insert', log.toObject());

    // Auto-sync package cab cost & operational totals
    if (log.packageId) {
      await syncPackageFinancials(log.packageId);
    }

    return NextResponse.json(JSON.parse(JSON.stringify(log)), { status: 201 });
  } catch (error) {
    console.error('POST /api/vehicles error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to create vehicle log' },
      { status: 500 }
    );
  }
}
