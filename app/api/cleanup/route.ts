import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import Package from '@/models/Package';
import VehicleLog from '@/models/VehicleLog';
import FoodLog from '@/models/FoodLog';

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
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let foodQuery: any = {};

    if (mode === 'auto') {
      // Rule 4: Data retention / auto-cleanup strictly based on checkOutDate
      const sixtyDaysAgo = new Date();
      sixtyDaysAgo.setDate(sixtyDaysAgo.getDate() - 60);

      pkgQuery = { checkOutDate: { $lt: sixtyDaysAgo } };

      const targetPkgs = await Package.find(pkgQuery).select('bookingId').lean();
      const targetBookingIds = targetPkgs.map((p: any) => p.bookingId).filter(Boolean);

      vehQuery = {
        $or: [
          { packageId: { $in: targetBookingIds } },
          { operationDate: { $lt: sixtyDaysAgo } },
        ],
      };
      foodQuery = {
        $or: [
          { packageId: { $in: targetBookingIds } },
          { mealDate: { $lt: sixtyDaysAgo } },
        ],
      };
    } else if (mode === 'range' && fromDate && toDate) {
      const start = new Date(fromDate);
      start.setHours(0, 0, 0, 0);
      const end = new Date(toDate);
      end.setHours(23, 59, 59, 999);
      pkgQuery = { checkInDate: { $gte: start, $lte: end } };

      const targetPkgs = await Package.find(pkgQuery).select('bookingId').lean();
      const targetBookingIds = targetPkgs.map((p: any) => p.bookingId).filter(Boolean);

      vehQuery = {
        $or: [
          { packageId: { $in: targetBookingIds } },
          { operationDate: { $gte: start, $lte: end } },
        ],
      };
      foodQuery = {
        $or: [
          { packageId: { $in: targetBookingIds } },
          { mealDate: { $gte: start, $lte: end } },
        ],
      };
    }

    const [packages, vehicleLogs, foodLogs] = await Promise.all([
      Package.find(pkgQuery).lean(),
      VehicleLog.find(vehQuery).lean(),
      FoodLog.find(foodQuery).lean(),
    ]);

    return NextResponse.json(
      JSON.parse(JSON.stringify({ packages, vehicleLogs, foodLogs }))
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
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let foodQuery: any = {};

    if (mode === 'auto') {
      // Rule 4: Data retention / auto-cleanup strictly based on checkOutDate
      const sixtyDaysAgo = new Date();
      sixtyDaysAgo.setDate(sixtyDaysAgo.getDate() - 60);

      pkgQuery = { checkOutDate: { $lt: sixtyDaysAgo } };

      const targetPkgs = await Package.find(pkgQuery).select('bookingId').lean();
      const targetBookingIds = targetPkgs.map((p: any) => p.bookingId).filter(Boolean);

      vehQuery = {
        $or: [
          { packageId: { $in: targetBookingIds } },
          { operationDate: { $lt: sixtyDaysAgo } },
        ],
      };
      foodQuery = {
        $or: [
          { packageId: { $in: targetBookingIds } },
          { mealDate: { $lt: sixtyDaysAgo } },
        ],
      };
    } else if (mode === 'range') {
      const start = new Date(fromDate);
      start.setHours(0, 0, 0, 0);
      const end = new Date(toDate);
      end.setHours(23, 59, 59, 999);
      pkgQuery = { checkInDate: { $gte: start, $lte: end } };

      const targetPkgs = await Package.find(pkgQuery).select('bookingId').lean();
      const targetBookingIds = targetPkgs.map((p: any) => p.bookingId).filter(Boolean);

      vehQuery = {
        $or: [
          { packageId: { $in: targetBookingIds } },
          { operationDate: { $gte: start, $lte: end } },
        ],
      };
      foodQuery = {
        $or: [
          { packageId: { $in: targetBookingIds } },
          { mealDate: { $gte: start, $lte: end } },
        ],
      };
    }

    const [pkgResult, vehResult, foodResult] = await Promise.all([
      Package.deleteMany(pkgQuery),
      VehicleLog.deleteMany(vehQuery),
      FoodLog.deleteMany(foodQuery),
    ]);

    return NextResponse.json({
      success: true,
      deletedPackages: pkgResult.deletedCount,
      deletedVehicleLogs: vehResult.deletedCount,
      deletedFoodLogs: foodResult.deletedCount,
    });
  } catch (error) {
    console.error('DELETE /api/cleanup error:', error);
    return NextResponse.json({ error: 'Failed to cleanup data' }, { status: 500 });
  }
}
