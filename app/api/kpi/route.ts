import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import Package from '@/models/Package';
import VehicleLog from '@/models/VehicleLog';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    await connectDB();
    const { searchParams } = new URL(request.url);
    const dateParam = searchParams.get('date');

    const date = dateParam ? new Date(dateParam) : new Date();
    const dayStart = new Date(date);
    dayStart.setHours(0, 0, 0, 0);
    const dayEnd = new Date(date);
    dayEnd.setHours(23, 59, 59, 999);

    // Check-ins today
    const checkInsToday = await Package.countDocuments({
      checkInDate: { $gte: dayStart, $lte: dayEnd },
    });

    // Vehicles running today
    const vehiclesRunningToday = await VehicleLog.countDocuments({
      operationDate: { $gte: dayStart, $lte: dayEnd },
    });

    // Total guests on ground today (active packages covering today)
    const activePackages = await Package.find({
      checkInDate: { $lte: dayEnd },
      checkOutDate: { $gte: dayStart },
      status: { $in: ['Upcoming', 'Ongoing'] },
    }).lean();
    const totalGuestsOnGround = activePackages.reduce((sum, p) => sum + (p.totalPax || 0), 0);

    // Upcoming packages (checkIn after today)
    const upcomingPackages = await Package.countDocuments({
      checkInDate: { $gt: dayEnd },
      status: { $ne: 'Cancelled' },
    });

    return NextResponse.json({
      checkInsToday,
      vehiclesRunningToday,
      totalGuestsOnGround,
      upcomingPackages,
    });
  } catch (error) {
    console.error('GET /api/kpi error:', error);
    return NextResponse.json({ error: 'Failed to fetch KPI data' }, { status: 500 });
  }
}
