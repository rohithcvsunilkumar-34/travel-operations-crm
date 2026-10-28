import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import Package from '@/models/Package';
import VehicleLog from '@/models/VehicleLog';
import { syncToCloud } from '@/lib/cloudSync';

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
    const { fleetLogs, ...packageData } = body;

    // Auto-calc balance
    const packageAmount = Number(packageData.packageAmount) || 0;
    const advancePaid = Number(packageData.advancePaid) || 0;
    packageData.balancePending = packageAmount - advancePaid;

    const pkg = new Package(packageData);
    await pkg.save();

    // If daily fleet logs were submitted, save them linked to this new package's bookingId
    if (Array.isArray(fleetLogs) && fleetLogs.length > 0) {
      for (const flog of fleetLogs) {
        if (!flog.operationDate) continue;
        const opDate = new Date(flog.operationDate);
        const vLog = new VehicleLog({
          operationDate: opDate,
          packageId: pkg.bookingId,
          guestName: flog.guestName || pkg.guestName,
          paxInVehicle: Number(flog.paxInVehicle) || pkg.totalPax || 1,
          vehicleType: flog.vehicleType || '',
          vehicleNumber: flog.vehicleNumber || '',
          vendorName: flog.vendorName || '',
          driverName: flog.driverName || '',
          driverPhone: flog.driverPhone || '',
          dutyRoute: flog.dutyRoute || '',
          remarks: flog.remarks || '',
        });
        await vLog.save();
        syncToCloud('vehiclelogs', 'insert', vLog.toObject());
      }
    }

    // Mirror to cloud (non-blocking)
    syncToCloud('packages', 'insert', pkg.toObject());

    return NextResponse.json(JSON.parse(JSON.stringify(pkg)), { status: 201 });
  } catch (error) {
    console.error('POST /api/packages error:', error);
    return NextResponse.json({ error: 'Failed to create package' }, { status: 500 });
  }
}
