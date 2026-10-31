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

    const now = new Date();
    const currentMonthKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    const month = searchParams.get('month'); // optional, if null returns all time or current view

    let pkgQuery: any = { status: { $ne: 'Cancelled' } };
    let fleetQuery: any = {};
    let foodQuery: any = {};

    if (month && month !== 'all') {
      const [y, m] = month.split('-').map(Number);
      if (y && m) {
        const start = new Date(y, m - 1, 1, 0, 0, 0, 0);
        const end = new Date(y, m, 0, 23, 59, 59, 999);

        // Rule 1: Anchored strictly to checkInDate month
        pkgQuery.checkInDate = { $gte: start, $lte: end };

        // Fetch package booking IDs for this check-in month
        const monthPkgs = await Package.find(pkgQuery).select('bookingId').lean();
        const monthBookingIds = monthPkgs.map((p: any) => p.bookingId).filter(Boolean);

        // Include all vendor fleet and food costs belonging to this month's packages,
        // plus any standalone/unlinked operational logs with date in this month
        fleetQuery = {
          $or: [
            { packageId: { $in: monthBookingIds } },
            {
              $and: [
                { operationDate: { $gte: start, $lte: end } },
                { $or: [{ packageId: { $exists: false } }, { packageId: '' }, { packageId: null }] },
              ],
            },
          ],
        };

        foodQuery = {
          $or: [
            { packageId: { $in: monthBookingIds } },
            {
              $and: [
                { mealDate: { $gte: start, $lte: end } },
                { $or: [{ packageId: { $exists: false } }, { packageId: '' }, { packageId: null }] },
              ],
            },
          ],
        };
      }
    }

    const [packages, vehicleLogs, foodLogs] = await Promise.all([
      Package.find(pkgQuery).lean(),
      VehicleLog.find(fleetQuery).lean(),
      FoodLog.find(foodQuery).lean(),
    ]);

    // 1. Hotel Bills: Hotel Name | Total Bookings | Total Amount Payable
    interface HotelBillItem {
      hotelName: string;
      totalBookings: number;
      totalRooms: number;
      totalAmountPayable: number;
      bookings: Array<{
        bookingId: string;
        guestName: string;
        checkIn: string;
        checkOut: string;
        amount: number;
      }>;
    }

    const hotelMap = new Map<string, HotelBillItem>();

    for (const rawPkg of packages) {
      const p = rawPkg as any;
      const hotelName = (p.hotelName || p.hotelDetails?.split(/[\n,;]/)[0] || 'Unassigned Hotel').trim();
      const key = hotelName.toLowerCase();
      const rooms = Math.max(1, Number(p.numberOfRooms) || 1);
      const cost = Number(p.total_hotel_cost) || Number(p.hotelCost) || 0;

      if (!hotelMap.has(key)) {
        hotelMap.set(key, {
          hotelName,
          totalBookings: 0,
          totalRooms: 0,
          totalAmountPayable: 0,
          bookings: [],
        });
      }

      const item = hotelMap.get(key)!;
      item.totalBookings += 1;
      item.totalRooms += rooms;
      item.totalAmountPayable += cost;
      item.bookings.push({
        bookingId: p.bookingId || 'TRV',
        guestName: p.guestName || '',
        checkIn: p.checkInDate ? new Date(p.checkInDate).toISOString().slice(0, 10) : '',
        checkOut: p.checkOutDate ? new Date(p.checkOutDate).toISOString().slice(0, 10) : '',
        amount: cost,
      });
    }

    const hotelBills = Array.from(hotelMap.values()).sort(
      (a, b) => b.totalAmountPayable - a.totalAmountPayable
    );

    // 2. Cab Vendor Bills: Vendor/Driver Name | Total Days/Trips | Total Amount Payable
    interface CabBillItem {
      vendorName: string;
      driverName: string;
      totalTrips: number;
      totalCabs: number;
      totalAmountPayable: number;
      trips: Array<{
        date: string;
        packageId: string;
        route: string;
        vehicle: string;
        amount: number;
      }>;
    }

    const cabMap = new Map<string, CabBillItem>();

    for (const rawLog of vehicleLogs) {
      const l = rawLog as any;
      const vendorName = (l.vendorName || l.driverName || 'Direct / Own Fleet').trim();
      const key = vendorName.toLowerCase();
      const cabs = Math.max(1, Number(l.numberOfCabs) || 1);
      const cost = Number(l.daily_cab_cost) || Number(l.vendorCost) || 0;

      if (!cabMap.has(key)) {
        cabMap.set(key, {
          vendorName,
          driverName: l.driverName || '',
          totalTrips: 0,
          totalCabs: 0,
          totalAmountPayable: 0,
          trips: [],
        });
      }

      const item = cabMap.get(key)!;
      item.totalTrips += 1;
      item.totalCabs += cabs;
      item.totalAmountPayable += cost;
      item.trips.push({
        date: l.operationDate ? new Date(l.operationDate).toISOString().slice(0, 10) : '',
        packageId: l.packageId || '',
        route: l.dutyRoute || '',
        vehicle: l.vehicleNumber || l.vehicleType || '',
        amount: cost,
      });
    }

    const cabBills = Array.from(cabMap.values()).sort(
      (a, b) => b.totalAmountPayable - a.totalAmountPayable
    );

    // 3. Food/Restaurant Bills: Restaurant/Hotel Name | Total Meals | Total Amount Payable
    interface FoodBillItem {
      restaurantName: string;
      totalMeals: number;
      totalPax: number;
      totalAmountPayable: number;
      meals: Array<{
        date: string;
        packageId: string;
        guestName: string;
        mealType: string;
        amount: number;
      }>;
    }

    const foodMap = new Map<string, FoodBillItem>();

    for (const rawFood of foodLogs) {
      const f = rawFood as any;
      const restaurantName = (f.restaurantName || 'General Dining').trim();
      const key = restaurantName.toLowerCase();
      const cost = Number(f.foodCost) || 0;
      const pax = Number(f.paxCount) || 1;

      if (!foodMap.has(key)) {
        foodMap.set(key, {
          restaurantName,
          totalMeals: 0,
          totalPax: 0,
          totalAmountPayable: 0,
          meals: [],
        });
      }

      const item = foodMap.get(key)!;
      item.totalMeals += 1;
      item.totalPax += pax;
      item.totalAmountPayable += cost;
      item.meals.push({
        date: f.mealDate ? new Date(f.mealDate).toISOString().slice(0, 10) : '',
        packageId: f.packageId || '',
        guestName: f.guestName || '',
        mealType: f.mealType || 'Meal',
        amount: cost,
      });
    }

    const foodBills = Array.from(foodMap.values()).sort(
      (a, b) => b.totalAmountPayable - a.totalAmountPayable
    );

    const totalHotelPayables = hotelBills.reduce((acc, h) => acc + h.totalAmountPayable, 0);
    const totalCabPayables = cabBills.reduce((acc, c) => acc + c.totalAmountPayable, 0);
    const totalFoodPayables = foodBills.reduce((acc, f) => acc + f.totalAmountPayable, 0);
    const grandTotalPayables = totalHotelPayables + totalCabPayables + totalFoodPayables;

    return NextResponse.json({
      month: month || 'all',
      summary: {
        totalHotelPayables,
        totalCabPayables,
        totalFoodPayables,
        grandTotalPayables,
        hotelsCount: hotelBills.length,
        cabVendorsCount: cabBills.length,
        restaurantsCount: foodBills.length,
      },
      hotelBills,
      cabBills,
      foodBills,
    });
  } catch (error) {
    console.error('GET /api/analytics/payables error:', error);
    return NextResponse.json({ error: 'Failed to generate vendor payables report' }, { status: 500 });
  }
}

