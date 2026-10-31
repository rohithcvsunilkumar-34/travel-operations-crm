import { NextRequest, NextResponse } from 'next/server';
import mongoose from 'mongoose';
import connectDB from '@/lib/mongodb';
import Package from '@/models/Package';
import VehicleLog from '@/models/VehicleLog';
import { syncToCloud } from '@/lib/cloudSync';
import { syncPackageFinancials } from '@/lib/packageFinancials';

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

    const existingPkg = await Package.findById(params.id).lean();
    if (!existingPkg) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    const existing = existingPkg as any;

    // Auto-calc balance and profit
    const packageAmount = Number(packageData.packageAmount) || 0;
    const advancePaid = Number(packageData.advancePaid) || 0;
    packageData.balancePending = Math.max(0, packageAmount - advancePaid);

    const hotelCost = Number(packageData.total_hotel_cost) || Number(packageData.hotelCost) || Number(existing.total_hotel_cost) || 0;
    packageData.hotelCost = hotelCost;
    packageData.total_hotel_cost = hotelCost;

    // If daily fleet logs are being passed, calculate cab cost from fleet
    let fleetCostSum = 0;
    if (Array.isArray(fleetLogs) && fleetLogs.length > 0) {
      fleetCostSum = fleetLogs.reduce(
        (acc: number, l: any) => acc + (Number(l.daily_cab_cost) || Number(l.vendorCost) || 0),
        0
      );
    }
    const cabVendorCost = fleetCostSum > 0 ? fleetCostSum : (Number(packageData.total_cab_cost) || Number(packageData.cabVendorCost) || Number(existing.total_cab_cost) || 0);
    packageData.cabVendorCost = cabVendorCost;
    packageData.total_cab_cost = cabVendorCost;

    // Retain existing food cost if not explicitly passed
    let totalFoodCost = Number(packageData.total_food_cost);
    if (isNaN(totalFoodCost) || totalFoodCost === 0) {
      totalFoodCost = Number(existing.total_food_cost) || 0;
    }
    packageData.total_food_cost = totalFoodCost;

    const otherExpenses = Number(packageData.otherExpenses) || 0;
    packageData.otherExpenses = otherExpenses;

    packageData.totalExpense = hotelCost + cabVendorCost + totalFoodCost + otherExpenses;
    packageData.netProfit = packageAmount - packageData.totalExpense;

    const pkg = await Package.findByIdAndUpdate(params.id, packageData, {
      new: true,
      runValidators: true,
    }).lean();

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

        const dailyCabCost = Number(flog.daily_cab_cost) || Number(flog.vendorCost) || 0;
        const updateDoc = {
          operationDate: opDate,
          packageId: packageObj.bookingId,
          guestName: flog.guestName || packageObj.guestName,
          paxInVehicle: Number(flog.paxInVehicle) || packageObj.totalPax || 1,
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

    // Full synchronization check
    const syncedPkg = await syncPackageFinancials(params.id);
    const finalPackageObj = syncedPkg ? syncedPkg.toObject() : packageObj;

    // Mirror package update to cloud
    syncToCloud('packages', 'update', { _id: params.id, ...finalPackageObj });

    return NextResponse.json({
      ...JSON.parse(JSON.stringify(finalPackageObj)),
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
