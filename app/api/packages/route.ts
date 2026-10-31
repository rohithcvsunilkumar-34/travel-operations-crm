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
    const mode = searchParams.get('mode'); // 'overlap' or 'checkin' / 'checkout' (default checkout)
    const date = searchParams.get('date'); // specific date for daily operations
    const dateField = searchParams.get('dateField') === 'checkInDate' ? 'checkInDate' : 'checkOutDate';

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const query: any = {};

    if (mode === 'overlap') {
      // Overlapping query for operational views (Rule 2)
      if (date) {
        const dayStart = new Date(date);
        dayStart.setHours(0, 0, 0, 0);
        const dayEnd = new Date(date);
        dayEnd.setHours(23, 59, 59, 999);
        query.checkInDate = { $lte: dayEnd };
        query.checkOutDate = { $gte: dayStart };
      } else if (fromDate || toDate) {
        if (toDate) {
          const end = new Date(toDate);
          end.setHours(23, 59, 59, 999);
          query.checkInDate = { $lte: end };
        }
        if (fromDate) {
          const start = new Date(fromDate);
          start.setHours(0, 0, 0, 0);
          query.checkOutDate = { $gte: start };
        }
      }
    } else {
      // Anchored strictly to checkOutDate (Trip Completion Month)
      if (fromDate || toDate) {
        query[dateField] = {};
        if (fromDate) query[dateField].$gte = new Date(fromDate);
        if (toDate) {
          const end = new Date(toDate);
          end.setHours(23, 59, 59, 999);
          query[dateField].$lte = end;
        }
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
    const pageParam = searchParams.get('page');
    const limitParam = searchParams.get('limit');

    if (pageParam || limitParam) {
      const page = Math.max(1, parseInt(pageParam || '1', 10));
      const limit = Math.max(1, parseInt(limitParam || '25', 10));
      const skip = (page - 1) * limit;

      const [total, packages] = await Promise.all([
        Package.countDocuments(query),
        Package.find(query)
          .sort({ checkInDate: sortOrder })
          .skip(skip)
          .limit(limit)
          .lean(),
      ]);

      return NextResponse.json({
        packages: JSON.parse(JSON.stringify(packages)),
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      });
    }

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

    // Auto-calc balance and net profit
    const packageAmount = Number(packageData.packageAmount) || 0;
    const advancePaid = Number(packageData.advancePaid) || 0;
    packageData.balancePending = Math.max(0, packageAmount - advancePaid);

    const hotelCost = Number(packageData.total_hotel_cost) || Number(packageData.hotelCost) || 0;
    packageData.hotelCost = hotelCost;
    packageData.total_hotel_cost = hotelCost;

    const cabVendorCost = Number(packageData.total_cab_cost) || Number(packageData.cabVendorCost) || 0;
    packageData.cabVendorCost = cabVendorCost;
    packageData.total_cab_cost = cabVendorCost;

    const otherExpenses = Number(packageData.total_food_cost) || Number(packageData.otherExpenses) || 0;
    packageData.otherExpenses = otherExpenses;
    packageData.total_food_cost = otherExpenses;

    packageData.totalExpense = hotelCost + cabVendorCost + otherExpenses;
    packageData.netProfit = packageAmount - packageData.totalExpense;

    const pkg = new Package(packageData);
    await pkg.save();

    // If daily fleet logs were submitted, save them linked to this new package's bookingId
    if (Array.isArray(fleetLogs) && fleetLogs.length > 0) {
      for (const flog of fleetLogs) {
        if (!flog.operationDate) continue;
        const opDate = new Date(flog.operationDate);
        const dailyCabCost = Number(flog.daily_cab_cost) || Number(flog.vendorCost) || 0;
        const vLog = new VehicleLog({
          operationDate: opDate,
          packageId: pkg.bookingId,
          guestName: flog.guestName || pkg.guestName,
          paxInVehicle: Number(flog.paxInVehicle) || pkg.totalPax || 1,
          vehicleType: flog.vehicleType || '',
          vehicleNumber: flog.vehicleNumber || '',
          vendorName: flog.vendorName || '',
          numberOfCabs: Number(flog.numberOfCabs) || 1,
          daily_cab_cost: dailyCabCost,
          vendorCost: dailyCabCost,
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
