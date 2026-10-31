import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import Package from '@/models/Package';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    await connectDB();
    const { searchParams } = new URL(request.url);

    // Default to current year and month (YYYY-MM)
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

    // Packages active in this month:
    // checkInDate <= endOfMonth AND checkOutDate >= startOfMonth
    const packages = await Package.find({
      checkInDate: { $lte: endOfMonth },
      checkOutDate: { $gte: startOfMonth },
      status: { $ne: 'Cancelled' },
    })
      .select('bookingId guestName contactNumber agencyName totalPax checkInDate checkOutDate totalDays hotelDetails hotelName numberOfRooms extraBeds hotelAllocations status')
      .lean();

    // Map: Hotel Name -> Aggregated metrics
    interface HotelAgg {
      hotelName: string;
      location: string;
      totalRoomsBooked: number;
      totalExtraBeds: number;
      totalBookings: number;
      totalGuests: number;
      bookings: Array<{
        packageId: string;
        bookingId: string;
        guestName: string;
        totalPax: number;
        checkInDate: string;
        checkOutDate: string;
        rooms: number;
        extraBeds: number;
        status: string;
      }>;
    }

    const hotelMap = new Map<string, HotelAgg>();

    for (const pkg of packages) {
      const p = pkg as any;
      const pkgId = p._id.toString();
      const bookingId = p.bookingId || 'TRV';
      const guestName = p.guestName || 'Valued Guest';
      const totalPax = Number(p.totalPax) || 1;
      const checkInStr = p.checkInDate ? new Date(p.checkInDate).toISOString().slice(0, 10) : '';
      const checkOutStr = p.checkOutDate ? new Date(p.checkOutDate).toISOString().slice(0, 10) : '';

      // Check if structured hotel allocations exist
      if (Array.isArray(p.hotelAllocations) && p.hotelAllocations.length > 0) {
        for (const alloc of p.hotelAllocations) {
          const hName = (alloc.hotelName || '').trim();
          if (!hName) continue;
          const loc = alloc.location || '';
          const rooms = Math.max(1, Number(alloc.numberOfRooms) || 1);
          const beds = Math.max(0, Number(alloc.extraBeds) || 0);

          const key = hName.toLowerCase();
          if (!hotelMap.has(key)) {
            hotelMap.set(key, {
              hotelName: hName,
              location: loc,
              totalRoomsBooked: 0,
              totalExtraBeds: 0,
              totalBookings: 0,
              totalGuests: 0,
              bookings: [],
            });
          }

          const existing = hotelMap.get(key)!;
          existing.totalRoomsBooked += rooms;
          existing.totalExtraBeds += beds;
          existing.totalBookings += 1;
          existing.totalGuests += totalPax;
          existing.bookings.push({
            packageId: pkgId,
            bookingId,
            guestName,
            totalPax,
            checkInDate: checkInStr,
            checkOutDate: checkOutStr,
            rooms,
            extraBeds: beds,
            status: p.status || 'Upcoming',
          });
        }
      } else {
        // Fallback: Primary hotel or hotelDetails
        let hName = (p.hotelName || '').trim();
        if (!hName && p.hotelDetails) {
          // parse line or first clause
          hName = p.hotelDetails.split(/[\n,;]/)[0]?.trim();
        }
        if (!hName) hName = 'Unspecified Hotel / Resort';

        const rooms = Math.max(1, Number(p.numberOfRooms) || 1);
        const beds = Math.max(0, Number(p.extraBeds) || 0);
        const key = hName.toLowerCase();

        if (!hotelMap.has(key)) {
          hotelMap.set(key, {
            hotelName: hName,
            location: '',
            totalRoomsBooked: 0,
            totalExtraBeds: 0,
            totalBookings: 0,
            totalGuests: 0,
            bookings: [],
          });
        }

        const existing = hotelMap.get(key)!;
        existing.totalRoomsBooked += rooms;
        existing.totalExtraBeds += beds;
        existing.totalBookings += 1;
        existing.totalGuests += totalPax;
        existing.bookings.push({
          packageId: pkgId,
          bookingId,
          guestName,
          totalPax,
          checkInDate: checkInStr,
          checkOutDate: checkOutStr,
          rooms,
          extraBeds: beds,
          status: p.status || 'Upcoming',
        });
      }
    }

    const hotelList = Array.from(hotelMap.values()).sort(
      (a, b) => b.totalRoomsBooked - a.totalRoomsBooked || b.totalBookings - a.totalBookings
    );

    const summary = {
      month,
      totalHotels: hotelList.length,
      totalRoomsBooked: hotelList.reduce((acc, h) => acc + h.totalRoomsBooked, 0),
      totalExtraBeds: hotelList.reduce((acc, h) => acc + h.totalExtraBeds, 0),
      totalBookings: packages.length,
    };

    return NextResponse.json({
      month,
      summary,
      hotels: hotelList,
    });
  } catch (error) {
    console.error('GET /api/analytics/hotels error:', error);
    return NextResponse.json({ error: 'Failed to load hotel analytics' }, { status: 500 });
  }
}

