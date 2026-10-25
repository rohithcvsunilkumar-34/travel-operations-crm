import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import Package from '@/models/Package';
import VehicleLog from '@/models/VehicleLog';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    await connectDB();
    const { searchParams } = new URL(request.url);
    const mode = searchParams.get('mode') || 'auto'; // 'auto' or 'range'
    const fromDate = searchParams.get('fromDate');
    const toDate = searchParams.get('toDate');

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let pkgQuery: any = {};
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let vehQuery: any = {};

    if (mode === 'auto') {
      const sixtyDaysAgo = new Date();
      sixtyDaysAgo.setDate(sixtyDaysAgo.getDate() - 60);
      pkgQuery = { checkOutDate: { $lt: sixtyDaysAgo } };
      vehQuery = { operationDate: { $lt: sixtyDaysAgo } };
    } else if (mode === 'range' && fromDate && toDate) {
      const start = new Date(fromDate);
      start.setHours(0, 0, 0, 0);
      const end = new Date(toDate);
      end.setHours(23, 59, 59, 999);
      pkgQuery = { checkInDate: { $gte: start, $lte: end } };
      vehQuery = { operationDate: { $gte: start, $lte: end } };
    }

    const packages = await Package.find(pkgQuery).lean();
    const vehicleLogs = await VehicleLog.find(vehQuery).lean();

    return NextResponse.json(
      JSON.parse(JSON.stringify({ packages, vehicleLogs }))
    );
  } catch (error) {
    console.error('GET /api/cleanup error:', error);
    return NextResponse.json({ error: 'Failed to fetch cleanup data' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    await connectDB();
    const body = await request.json();
    const { mode, fromDate, toDate } = body;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let pkgQuery: any = {};
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let vehQuery: any = {};

    if (mode === 'auto') {
      const sixtyDaysAgo = new Date();
      sixtyDaysAgo.setDate(sixtyDaysAgo.getDate() - 60);
      pkgQuery = { checkOutDate: { $lt: sixtyDaysAgo } };
      vehQuery = { operationDate: { $lt: sixtyDaysAgo } };
    } else if (mode === 'range') {
      const start = new Date(fromDate);
      start.setHours(0, 0, 0, 0);
      const end = new Date(toDate);
      end.setHours(23, 59, 59, 999);
      pkgQuery = { checkInDate: { $gte: start, $lte: end } };
      vehQuery = { operationDate: { $gte: start, $lte: end } };
    }

    const pkgResult = await Package.deleteMany(pkgQuery);
    const vehResult = await VehicleLog.deleteMany(vehQuery);

    return NextResponse.json({
      success: true,
      deletedPackages: pkgResult.deletedCount,
      deletedVehicleLogs: vehResult.deletedCount,
    });
  } catch (error) {
    console.error('DELETE /api/cleanup error:', error);
    return NextResponse.json({ error: 'Failed to cleanup data' }, { status: 500 });
  }
}
