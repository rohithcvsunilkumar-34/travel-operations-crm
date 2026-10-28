import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import VehicleLog from '@/models/VehicleLog';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    await connectDB();
    const { searchParams } = new URL(req.url);

    const dateStr = searchParams.get('date');
    const vehicleNumber = searchParams.get('vehicleNumber')?.trim();
    const driverName = searchParams.get('driverName')?.trim();
    const excludeId = searchParams.get('excludeId');

    if (!dateStr || (!vehicleNumber && !driverName)) {
      return NextResponse.json({ hasConflict: false, conflicts: [] });
    }

    const date = new Date(dateStr);
    const start = new Date(date);
    start.setHours(0, 0, 0, 0);
    const end = new Date(date);
    end.setHours(23, 59, 59, 999);

    const query: any = {
      operationDate: { $gte: start, $lte: end },
    };

    if (excludeId) {
      query._id = { $ne: excludeId };
    }

    const logs = await VehicleLog.find(query).lean();
    const conflicts: Array<{ type: 'vehicle' | 'driver'; message: string; log: any }> = [];

    // Clean comparison helper
    const cleanPlate = (s?: string) => (s || '').replace(/[\s-]/g, '').toLowerCase();
    const cleanName = (s?: string) => (s || '').trim().toLowerCase();

    for (const log of logs) {
      const vLog = log as any;
      if (vehicleNumber && cleanPlate(vLog.vehicleNumber) === cleanPlate(vehicleNumber)) {
        conflicts.push({
          type: 'vehicle',
          message: `Vehicle ${vLog.vehicleNumber} is already booked on this date for guest "${vLog.guestName}"${vLog.packageId ? ` (${vLog.packageId})` : ''} on route "${vLog.dutyRoute || 'Tour'}".`,
          log: vLog,
        });
      }

      if (driverName && cleanName(vLog.driverName) === cleanName(driverName)) {
        conflicts.push({
          type: 'driver',
          message: `Driver "${vLog.driverName}" is already scheduled on this date for guest "${vLog.guestName}"${vLog.packageId ? ` (${vLog.packageId})` : ''}.`,
          log: vLog,
        });
      }
    }

    return NextResponse.json({
      hasConflict: conflicts.length > 0,
      conflicts,
    });
  } catch (error: any) {
    console.error('Conflict check error:', error);
    return NextResponse.json({ hasConflict: false, conflicts: [] });
  }
}

