import { NextRequest, NextResponse } from 'next/server';
import mongoose from 'mongoose';
import connectDB from '@/lib/mongodb';
import Package from '@/models/Package';
import VehicleLog from '@/models/VehicleLog';
import { syncToCloud } from '@/lib/cloudSync';

export const dynamic = 'force-dynamic';

export async function GET(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await connectDB();
    const pkg = await Package.findById(params.id).lean();
    if (!pkg) return NextResponse.json({ error: 'Not found' }, { status: 404 });

    const packageObj = pkg as any;

    // Fetch linked fleet logs
    const fleetLogs = await VehicleLog.find({ packageId: packageObj.bookingId })
      .sort({ operationDate: 1 })
      .lean();

    return NextResponse.json({
      ...JSON.parse(JSON.stringify(packageObj)),
      fleetLogs: JSON.parse(JSON.stringify(fleetLogs)),
    });
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
    const { fleetLogs, deletedFleetIds, ...packageData } = body;

    // Auto-calc balance and profit
    const packageAmount = Number(packageData.packageAmount) || 0;
    const advancePaid = Number(packageData.advancePaid) || 0;
    packageData.balancePending = Math.max(0, packageAmount - advancePaid);

    const hotelCost = Number(packageData.hotelCost) || 0;
    const cabVendorCost = Number(packageData.cabVendorCost) || 0;
    const otherExpenses = Number(packageData.otherExpenses) || 0;
    if (!packageData.totalExpense) {
      packageData.totalExpense = hotelCost + cabVendorCost + otherExpenses;
    }
    packageData.netProfit = packageAmount - packageData.totalExpense;

    const pkg = await Package.findByIdAndUpdate(params.id, packageData, {
      new: true,
      runValidators: true,
    }).lean();

    if (!pkg) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    const packageObj = pkg as any;

    // Handle deleted fleet logs if any
    if (Array.isArray(deletedFleetIds) && deletedFleetIds.length > 0) {
      await VehicleLog.deleteMany({ _id: { $in: deletedFleetIds } });
      for (const delId of deletedFleetIds) {
        syncToCloud('vehiclelogs', 'delete', delId);
      }
    }

    // Upsert / update daily fleet logs for this package
    const savedFleetLogs: any[] = [];
    if (Array.isArray(fleetLogs)) {
      for (const flog of fleetLogs) {
        if (!flog.operationDate) continue;
        const opDate = new Date(flog.operationDate);
        const start = new Date(opDate);
        start.setHours(0, 0, 0, 0);
        const end = new Date(opDate);
        end.setHours(23, 59, 59, 999);

        const updateDoc = {
          operationDate: opDate,
          packageId: packageObj.bookingId,
          guestName: flog.guestName || packageObj.guestName,
          paxInVehicle: Number(flog.paxInVehicle) || packageObj.totalPax || 1,
          vehicleType: flog.vehicleType || '',
          vehicleNumber: flog.vehicleNumber || '',
          vendorName: flog.vendorName || '',
          numberOfCabs: Number(flog.numberOfCabs) || 1,
          vendorCost: Number(flog.vendorCost) || 0,
          driverName: flog.driverName || '',
          driverPhone: flog.driverPhone || '',
          dutyRoute: flog.dutyRoute || '',
          remarks: flog.remarks || '',
        };

        let saved: any = null;
        if (flog._id && mongoose.Types.ObjectId.isValid(flog._id)) {
          saved = await VehicleLog.findByIdAndUpdate(flog._id, updateDoc, {
            new: true,
            upsert: true,
          }).lean();
        } else {
          saved = await VehicleLog.findOneAndUpdate(
            { packageId: packageObj.bookingId, operationDate: { $gte: start, $lte: end } },
            updateDoc,
            { new: true, upsert: true, setDefaultsOnInsert: true }
          ).lean();
        }

        if (saved) {
          savedFleetLogs.push(saved);
          syncToCloud('vehiclelogs', 'update', saved);
        }
      }
    }

    // Mirror package update to cloud
    syncToCloud('packages', 'update', { _id: params.id, ...packageData });

    return NextResponse.json({
      ...JSON.parse(JSON.stringify(packageObj)),
      fleetLogs: JSON.parse(JSON.stringify(savedFleetLogs)),
    });
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

    // Mirror delete to cloud
    syncToCloud('packages', 'delete', params.id);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('DELETE /api/packages/[id] error:', error);
    return NextResponse.json({ error: 'Failed to delete package' }, { status: 500 });
  }
}
