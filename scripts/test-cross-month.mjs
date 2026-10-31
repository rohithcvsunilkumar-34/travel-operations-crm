// scripts/test-cross-month.mjs
import mongoose from 'mongoose';

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/travel_operations_crm';

const SHORT_MONTH_NAMES = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

function getCrossMonthInfo(checkIn, checkOut) {
  if (!checkIn || !checkOut) {
    return { isCrossMonth: false, label: '', fromMonth: '', toMonth: '', shortLabel: '' };
  }
  const inD = new Date(checkIn);
  const outD = new Date(checkOut);
  if (isNaN(inD.getTime()) || isNaN(outD.getTime())) {
    return { isCrossMonth: false, label: '', fromMonth: '', toMonth: '', shortLabel: '' };
  }

  const inM = inD.getMonth();
  const outM = outD.getMonth();
  const inY = inD.getFullYear();
  const outY = outD.getFullYear();

  if (inY !== outY || inM !== outM) {
    const fromMonth = SHORT_MONTH_NAMES[inM];
    const toMonth = SHORT_MONTH_NAMES[outM];
    return {
      isCrossMonth: true,
      label: `Spans ${fromMonth} - ${toMonth}`,
      fromMonth,
      toMonth,
      shortLabel: `${fromMonth} ➔ ${toMonth}`,
    };
  }

  return { isCrossMonth: false, label: '', fromMonth: '', toMonth: '', shortLabel: '' };
}

async function runCrossMonthVerification() {
  console.log('🧪 =========================================================================');
  console.log('   CROSS-MONTH BOOKING LOGIC & DATE-BOUNDARY VERIFICATION SUITE');
  console.log('=========================================================================\n');

  let passCount = 0;
  let testCount = 0;

  function assert(condition, name) {
    testCount++;
    if (condition) {
      console.log(`  ✅ [PASS] ${name}`);
      passCount++;
    } else {
      console.error(`  ❌ [FAIL] ${name}`);
    }
  }

  await mongoose.connect(MONGODB_URI);
  const db = mongoose.connection.db;

  // Clean any existing test records
  await db.collection('packages').deleteMany({ bookingId: /^CROSS-TEST-/ });
  await db.collection('vehiclelogs').deleteMany({ packageId: /^CROSS-TEST-/ });
  await db.collection('foodlogs').deleteMany({ packageId: /^CROSS-TEST-/ });

  try {
    // --------------------------------------------------------------------------
    // RULE 1: Insert cross-month booking (Oct 30 -> Nov 5, 2026)
    // --------------------------------------------------------------------------
    console.log('--- TEST 1: Monthly Summary Anchored to Check-In Month (Rule 1) ---');

    const checkInDate = new Date('2026-10-30T10:00:00.000Z');
    const checkOutDate = new Date('2026-11-05T12:00:00.000Z');
    const bookingId = 'CROSS-TEST-001';

    await db.collection('packages').insertOne({
      bookingId,
      guestName: 'Rohit Sharma & Family',
      contactNumber: '+91 99887 66554',
      agencyName: 'Makemytrip Holidays',
      totalPax: 4,
      checkInDate,
      checkOutDate,
      totalDays: '7 Days / 6 Nights',
      hotelName: 'Grand Hyatt Kochi',
      numberOfRooms: 2,
      extraBeds: 1,
      total_hotel_cost: 35000,
      hotelCost: 35000,
      total_cab_cost: 15000,
      total_food_cost: 8000,
      otherExpenses: 2000,
      totalExpense: 60000,
      packageAmount: 95000,
      advancePaid: 45000,
      balancePending: 50000,
      netProfit: 35000,
      status: 'Upcoming',
      hotelAllocations: [
        {
          hotelName: 'Grand Hyatt Kochi',
          location: 'Bolgatty, Kochi',
          numberOfRooms: 2,
          extraBeds: 1,
          cost: 35000,
        },
      ],
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    // Add daily cab assignment incurred on November 2, 2026
    await db.collection('vehiclelogs').insertOne({
      packageId: bookingId,
      guestName: 'Rohit Sharma & Family',
      operationDate: new Date('2026-11-02T08:00:00.000Z'),
      vehicleType: 'Innova Crysta',
      vehicleNumber: 'KL-07-CD-1122',
      vendorName: 'Kerala Roadways Cab Fleet',
      numberOfCabs: 1,
      paxInVehicle: 4,
      daily_cab_cost: 15000,
      vendorCost: 15000,
      driverName: 'Suresh Kumar',
      driverPhone: '+91 98470 11223',
      dutyRoute: 'Kochi to Munnar Sightseeing',
      remarks: 'Cross-month tour day 4',
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    // Add dining expense incurred on November 3, 2026
    await db.collection('foodlogs').insertOne({
      packageId: bookingId,
      guestName: 'Rohit Sharma & Family',
      mealDate: new Date('2026-11-03T13:00:00.000Z'),
      mealType: 'Lunch',
      restaurantName: 'Silver Spoon Munnar',
      foodCost: 8000,
      paxCount: 4,
      paymentStatus: 'Pending',
      remarks: 'Munnar traditional feast',
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    // 1.1 October Financial Query Test (Anchored to Check-In Month)
    const octStart = new Date(2026, 9, 1, 0, 0, 0, 0); // 2026-10-01
    const octEnd = new Date(2026, 9, 31, 23, 59, 59, 999); // 2026-10-31

    const octPackages = await db.collection('packages').find({
      checkInDate: { $gte: octStart, $lte: octEnd },
      status: { $ne: 'Cancelled' },
    }).toArray();

    const crossPkg = octPackages.find((p) => p.bookingId === bookingId);
    assert(!!crossPkg, 'October financial query captured CROSS-TEST-001');
    assert(crossPkg?.packageAmount === 95000, 'October receives 100% of revenue (₹95,000)');
    assert(crossPkg?.totalExpense === 60000, 'October receives 100% of trip expenses (₹60,000)');
    assert(crossPkg?.netProfit === 35000, 'October calculates full net profit (₹35,000)');

    // 1.2 November Financial Query Test (Ensures NO DUPLICATION in November)
    const novStart = new Date(2026, 10, 1, 0, 0, 0, 0); // 2026-11-01
    const novEnd = new Date(2026, 10, 30, 23, 59, 59, 999); // 2026-11-30

    const novFinancialPackages = await db.collection('packages').find({
      checkInDate: { $gte: novStart, $lte: novEnd },
      status: { $ne: 'Cancelled' },
    }).toArray();

    const crossTestInNov = novFinancialPackages.filter((p) => p.bookingId === bookingId);
    assert(crossTestInNov.length === 0, 'No duplication: Booking does NOT appear in November Financial Summary');

    // --------------------------------------------------------------------------
    // RULE 1.3: Payables Query Anchoring
    // --------------------------------------------------------------------------
    console.log('\n--- TEST 2: Payables Query Anchoring ---');

    // October Payables: Fetch packages checking in during October
    const octPayablePackages = await db.collection('packages').find({
      checkInDate: { $gte: octStart, $lte: octEnd },
      status: { $ne: 'Cancelled' },
    }).toArray();
    const octPkgIds = octPayablePackages.map((p) => p.bookingId);

    const octFleet = await db.collection('vehiclelogs').find({
      $or: [
        { packageId: { $in: octPkgIds } },
        {
          $and: [
            { operationDate: { $gte: octStart, $lte: octEnd } },
            { $or: [{ packageId: { $exists: false } }, { packageId: '' }, { packageId: null }] },
          ],
        },
      ],
    }).toArray();

    const octFood = await db.collection('foodlogs').find({
      $or: [
        { packageId: { $in: octPkgIds } },
        {
          $and: [
            { mealDate: { $gte: octStart, $lte: octEnd } },
            { $or: [{ packageId: { $exists: false } }, { packageId: '' }, { packageId: null }] },
          ],
        },
      ],
    }).toArray();

    assert(octFleet.some((f) => f.packageId === bookingId), 'October payables includes November 2 cab expense (₹15,000)');
    assert(octFood.some((f) => f.packageId === bookingId), 'October payables includes November 3 dining expense (₹8,000)');

    // November Payables: Cross-month booking must NOT be included in November payables
    const novPayablePackages = await db.collection('packages').find({
      checkInDate: { $gte: novStart, $lte: novEnd },
      status: { $ne: 'Cancelled' },
    }).toArray();
    const novPkgIds = novPayablePackages.map((p) => p.bookingId);

    const novFleet = await db.collection('vehiclelogs').find({
      $or: [
        { packageId: { $in: novPkgIds } },
        {
          $and: [
            { operationDate: { $gte: novStart, $lte: novEnd } },
            { $or: [{ packageId: { $exists: false } }, { packageId: '' }, { packageId: null }] },
          ],
        },
      ],
    }).toArray();

    assert(!novFleet.some((f) => f.packageId === bookingId), 'November payables has 0 duplication for cross-month cab');

    // --------------------------------------------------------------------------
    // RULE 2: Daily Operations, Active Guests & Hotel Overlap
    // --------------------------------------------------------------------------
    console.log('\n--- TEST 3: Daily Operations & Overlap Logic (Rule 2) ---');

    // 2.1 November Hotel Monthly View (Operational Overlap: checkInDate <= endOfMonth && checkOutDate >= startOfMonth)
    const novHotelPackages = await db.collection('packages').find({
      checkInDate: { $lte: novEnd },
      checkOutDate: { $gte: novStart },
      status: { $ne: 'Cancelled' },
    }).toArray();

    const hotelMatch = novHotelPackages.find((p) => p.bookingId === bookingId);
    assert(!!hotelMatch, 'Hotel monthly tracking finds cross-month booking in November');
    assert(hotelMatch?.numberOfRooms === 2, 'November hotel tracking counts 2 rooms booked');
    assert(hotelMatch?.extraBeds === 1, 'November hotel tracking counts 1 extra bed');

    // 2.2 Active Guests on Ground on Nov 2 (checkInDate <= Nov 2 && checkOutDate >= Nov 2)
    const nov2Start = new Date('2026-11-02T00:00:00.000Z');
    const nov2End = new Date('2026-11-02T23:59:59.999Z');

    const guestsOnGroundPkgs = await db.collection('packages').find({
      checkInDate: { $lte: nov2End },
      checkOutDate: { $gte: nov2Start },
      status: { $ne: 'Cancelled' },
    }).toArray();

    assert(guestsOnGroundPkgs.some((p) => p.bookingId === bookingId), 'Active guests on ground on Nov 2 includes cross-month guest');
    const totalPaxOnGround = guestsOnGroundPkgs.reduce((sum, p) => sum + p.totalPax, 0);
    assert(totalPaxOnGround >= 4, `Active pax on ground correctly reflects 4 guests (actual: ${totalPaxOnGround})`);

    // 2.3 Guest still active on Nov 5 (last day of trip)
    const nov5Start = new Date('2026-11-05T00:00:00.000Z');
    const nov5End = new Date('2026-11-05T23:59:59.999Z');
    const nov5Pkgs = await db.collection('packages').find({
      checkInDate: { $lte: nov5End },
      checkOutDate: { $gte: nov5Start },
    }).toArray();
    assert(nov5Pkgs.some((p) => p.bookingId === bookingId), 'Guest remains visible in operations on check-out day (Nov 5)');

    // 2.4 Guest no longer active on Nov 6 (after checkout)
    const nov6Start = new Date('2026-11-06T00:00:00.000Z');
    const nov6End = new Date('2026-11-06T23:59:59.999Z');
    const nov6Pkgs = await db.collection('packages').find({
      checkInDate: { $lte: nov6End },
      checkOutDate: { $gte: nov6Start },
    }).toArray();
    assert(!nov6Pkgs.some((p) => p.bookingId === bookingId), 'Guest is no longer on ground on Nov 6');

    // --------------------------------------------------------------------------
    // RULE 3: UI Badge for Cross-Month Bookings
    // --------------------------------------------------------------------------
    console.log('\n--- TEST 4: UI Badge for Cross-Month Bookings (Rule 3) ---');

    const badge1 = getCrossMonthInfo(checkInDate, checkOutDate);
    assert(badge1.isCrossMonth === true, 'isCrossMonth returns true for Oct 30 - Nov 5');
    assert(badge1.label === 'Spans Oct - Nov', `Badge label is correctly "Spans Oct - Nov" (got "${badge1.label}")`);
    assert(badge1.shortLabel === 'Oct ➔ Nov', `Badge shortLabel is "Oct ➔ Nov" (got "${badge1.shortLabel}")`);

    const sameMonth = getCrossMonthInfo('2026-10-05', '2026-10-10');
    assert(sameMonth.isCrossMonth === false, 'Same month booking correctly returns isCrossMonth = false');

    const crossYear = getCrossMonthInfo('2026-12-28', '2027-01-04');
    assert(crossYear.isCrossMonth === true, 'Cross year booking returns isCrossMonth = true');
    assert(crossYear.label === 'Spans Dec - Jan', `Cross year label is "Spans Dec - Jan" (got "${crossYear.label}")`);

    // --------------------------------------------------------------------------
    // RULE 4: 2-Month Data Retention / Auto-Cleanup Safety (Rule 4)
    // --------------------------------------------------------------------------
    console.log('\n--- TEST 5: 60-Day Data Retention Safety Based Strictly on checkOutDate (Rule 4) ---');

    // If today is December 30, 2026 (61 days after check-in Oct 30, but only 55 days after check-out Nov 5):
    const dec30_2026 = new Date('2026-12-30T12:00:00.000Z');
    const thresholdDec30 = new Date(dec30_2026);
    thresholdDec30.setDate(thresholdDec30.getDate() - 60); // 60 days before Dec 30 = Oct 31

    // Query with checkOutDate:
    const safeCheck = await db.collection('packages').find({
      _id: crossPkg._id,
      checkOutDate: { $lt: thresholdDec30 },
    }).toArray();

    assert(safeCheck.length === 0, 'SAFE: Dec 30 is 61 days past check-in, but NOT purged because checkOutDate is Nov 5 (only 55 days)!');

    // If today is January 6, 2027 (62 days after check-out Nov 5):
    const jan6_2027 = new Date('2027-01-06T12:00:00.000Z');
    const thresholdJan6 = new Date(jan6_2027);
    thresholdJan6.setDate(thresholdJan6.getDate() - 60); // Nov 7

    const eligibleCheck = await db.collection('packages').find({
      _id: crossPkg._id,
      checkOutDate: { $lt: thresholdJan6 },
    }).toArray();

    assert(eligibleCheck.length === 1, 'CORRECT: Eligible for cleanup only once 60 days have elapsed past checkOutDate (Jan 6, 2027)');

  } finally {
    // Clean up test records
    await db.collection('packages').deleteMany({ bookingId: /^CROSS-TEST-/ });
    await db.collection('vehiclelogs').deleteMany({ packageId: /^CROSS-TEST-/ });
    await db.collection('foodlogs').deleteMany({ packageId: /^CROSS-TEST-/ });
    await mongoose.disconnect();
  }

  console.log('\n=========================================================================');
  console.log(`   TOTAL TESTS: ${testCount} | PASSED: ${passCount} | FAILED: ${testCount - passCount}`);
  console.log('=========================================================================\n');

  if (passCount === testCount) {
    console.log('🎉 ALL CROSS-MONTH BOOKING & DATE-BOUNDARY TESTS PASSED PERFECTLY!\n');
    process.exit(0);
  } else {
    console.error('⚠️ SOME TESTS FAILED.\n');
    process.exit(1);
  }
}

runCrossMonthVerification().catch((err) => {
  console.error('Test execution error:', err);
  process.exit(1);
});

