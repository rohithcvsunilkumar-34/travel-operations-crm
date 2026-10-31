import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import VehicleLog from '@/models/VehicleLog';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    await connectDB();
    const { searchParams } = new URL(request.url);

    const now = new Date();
    const currentMonthKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    const month = searchParams.get('month') || currentMonthKey;

    const [yearStr, monthStr] = month.split('-');
    const year = parseInt(yearStr, 10);
    const monthNum = parseInt(monthStr, 10);

    if (isNaN(year) || isNaN(monthNum) || monthNum < 1 || monthNum > 12) {
      return NextResponse.json({ error: 'Invalid month format, expected YYYY-MM' }, { status: 400 });
    }

    const startOfMonth = new Date(year, monthNum - 1, 1, 0, 0, 0, 0);
    const endOfMonth = new Date(year, monthNum, 0, 23, 59, 59, 999);

    const logs = await VehicleLog.find({
      operationDate: { $gte: startOfMonth, $lte: endOfMonth },
    })
      .sort({ operationDate: 1 })
      .lean();

    interface VendorAgg {
      vendorName: string;
      totalCabsAllotted: number;
      totalTrips: number;
      totalPax: number;
      vehicleTypes: string[];
      trips: Array<{
        logId: string;
        date: string;
        packageId: string;
        guestName: string;
        dutyRoute: string;
        vehicleType: string;
        vehicleNumber: string;
        driverName: string;
        driverPhone: string;
        cabs: number;
        pax: number;
      }>;
    }

    const vendorMap = new Map<string, VendorAgg>();

    for (const rawLog of logs) {
      const log = rawLog as any;
      const rawVendor = (log.vendorName || '').trim();
      const vendorName = rawVendor || 'In-House / Direct Fleet';
      const key = vendorName.toLowerCase();
      const cabs = Math.max(1, Number(log.numberOfCabs) || 1);
      const pax = Math.max(1, Number(log.paxInVehicle) || 1);
      const dateStr = log.operationDate ? new Date(log.operationDate).toISOString().slice(0, 10) : '';

      if (!vendorMap.has(key)) {
        vendorMap.set(key, {
          vendorName,
          totalCabsAllotted: 0,
          totalTrips: 0,
          totalPax: 0,
          vehicleTypes: [],
          trips: [],
        });
      }

      const existing = vendorMap.get(key)!;
      existing.totalCabsAllotted += cabs;
      existing.totalTrips += 1;
      existing.totalPax += pax;

      if (log.vehicleType && !existing.vehicleTypes.includes(log.vehicleType)) {
        existing.vehicleTypes.push(log.vehicleType);
      }

      existing.trips.push({
        logId: log._id.toString(),
        date: dateStr,
        packageId: log.packageId || '',
        guestName: log.guestName || '',
        dutyRoute: log.dutyRoute || '',
        vehicleType: log.vehicleType || '',
        vehicleNumber: log.vehicleNumber || '',
        driverName: log.driverName || '',
        driverPhone: log.driverPhone || '',
        cabs,
        pax,
      });
    }

    const vendorList = Array.from(vendorMap.values()).sort(
      (a, b) => b.totalCabsAllotted - a.totalCabsAllotted || b.totalTrips - a.totalTrips
    );

    const summary = {
      month,
      totalVendors: vendorList.length,
      totalCabsAllotted: vendorList.reduce((acc, v) => acc + v.totalCabsAllotted, 0),
      totalTrips: logs.length,
      totalPaxMoved: vendorList.reduce((acc, v) => acc + v.totalPax, 0),
    };

    return NextResponse.json({
      month,
      summary,
      vendors: vendorList,
    });
  } catch (error) {
    console.error('GET /api/analytics/vendors error:', error);
    return NextResponse.json({ error: 'Failed to load cab vendor analytics' }, { status: 500 });
  }
}

