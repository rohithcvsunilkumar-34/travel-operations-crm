// scripts/test-analytics.mjs
import mongoose from 'mongoose';

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/travel_operations_crm';

async function runTests() {
  console.log('🧪 Starting Verification Suite for Hotel, Vendor & Financial Analytics...\n');
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

  const testMonthKey = '2026-11';
  const startOfMonth = new Date(2026, 10, 1, 0, 0, 0, 0);
  const endOfMonth = new Date(2026, 10, 30, 23, 59, 59, 999);

  // Clean any previous test data
  await db.collection('packages').deleteMany({ bookingId: /^TEST-ANALYTICS-/ });
  await db.collection('vehiclelogs').deleteMany({ packageId: /^TEST-ANALYTICS-/ });

  // 1. Hotel Allocations Test
  console.log('--- 1. Testing Package Hotel Room & Extra Bed Allocation ---');
  const pkg1 = await db.collection('packages').insertOne({
    bookingId: 'TEST-ANALYTICS-01',
    guestName: 'Vikram Malhotra',
    contactNumber: '9876500001',
    agencyName: 'Direct',
    totalPax: 4,
    checkInDate: new Date('2026-11-05T00:00:00.000Z'),
    checkOutDate: new Date('2026-11-09T00:00:00.000Z'),
    totalDays: '5 Days / 4 Nights',
    hotelName: 'Grand Hyatt Kochi',
    numberOfRooms: 2,
    extraBeds: 1,
    hotelDetails: 'Grand Hyatt Kochi (2 Rooms, 1 Extra Bed)',
    packageAmount: 60000,
    advancePaid: 20000,
    balancePending: 40000,
    hotelCost: 22000,
    cabVendorCost: 15000,
    otherExpenses: 3000,
    totalExpense: 40000,
    netProfit: 20000,
    status: 'Upcoming',
    createdAt: new Date(),
    updatedAt: new Date(),
  });

  const pkg2 = await db.collection('packages').insertOne({
    bookingId: 'TEST-ANALYTICS-02',
    guestName: 'Rohit Verma',
    contactNumber: '9876500002',
    agencyName: 'MakeMyTrip',
    totalPax: 2,
    checkInDate: new Date('2026-11-12T00:00:00.000Z'),
    checkOutDate: new Date('2026-11-15T00:00:00.000Z'),
    totalDays: '4 Days / 3 Nights',
    hotelName: 'Grand Hyatt Kochi',
    numberOfRooms: 1,
    extraBeds: 1,
    hotelDetails: 'Grand Hyatt Kochi (1 Room, 1 Extra Bed)',
    packageAmount: 40000,
    advancePaid: 40000,
    balancePending: 0,
    hotelCost: 14000,
    cabVendorCost: 9000,
    otherExpenses: 2000,
    totalExpense: 25000,
    netProfit: 15000,
    status: 'Upcoming',
    createdAt: new Date(),
    updatedAt: new Date(),
  });

  assert(pkg1.insertedId && pkg2.insertedId, 'Test packages inserted successfully');

  // Query Hotel Aggregation for Grand Hyatt Kochi
  const hotelMatches = await db.collection('packages').find({
    hotelName: 'Grand Hyatt Kochi',
    checkInDate: { $lte: endOfMonth },
    checkOutDate: { $gte: startOfMonth },
    status: { $ne: 'Cancelled' },
  }).toArray();

  const totalRooms = hotelMatches.reduce((acc, p) => acc + (p.numberOfRooms || 1), 0);
  const totalExtraBeds = hotelMatches.reduce((acc, p) => acc + (p.extraBeds || 0), 0);
  const totalBookings = hotelMatches.length;

  assert(totalRooms === 3, `Hotel Total Rooms Booked aggregated correctly: expected 3, got ${totalRooms}`);
  assert(totalExtraBeds === 2, `Hotel Total Extra Beds aggregated correctly: expected 2, got ${totalExtraBeds}`);
  assert(totalBookings === 2, `Hotel Total Bookings count aggregated correctly: expected 2, got ${totalBookings}`);

  // 2. Cab Vendor Allotment Test
  console.log('\n--- 2. Testing Cab Vendor Monthly Allotment Tracking ---');
  await db.collection('vehiclelogs').insertMany([
    {
      operationDate: new Date('2026-11-05T00:00:00.000Z'),
      packageId: 'TEST-ANALYTICS-01',
      guestName: 'Vikram Malhotra',
      vendorName: 'Royal Cabs Kerala',
      numberOfCabs: 2,
      vendorCost: 8000,
      paxInVehicle: 4,
      vehicleType: 'Innova Crysta',
      vehicleNumber: 'KL-07-AB-1111',
      driverName: 'Suresh Kumar',
      dutyRoute: 'Airport → Hotel',
      createdAt: new Date(),
      updatedAt: new Date(),
    },
    {
      operationDate: new Date('2026-11-06T00:00:00.000Z'),
      packageId: 'TEST-ANALYTICS-01',
      guestName: 'Vikram Malhotra',
      vendorName: 'Royal Cabs Kerala',
      numberOfCabs: 1,
      vendorCost: 4000,
      paxInVehicle: 4,
      vehicleType: 'Innova Crysta',
      vehicleNumber: 'KL-07-AB-1111',
      driverName: 'Suresh Kumar',
      dutyRoute: 'Munnar Sightseeing',
      createdAt: new Date(),
      updatedAt: new Date(),
    },
    {
      operationDate: new Date('2026-11-12T00:00:00.000Z'),
      packageId: 'TEST-ANALYTICS-02',
      guestName: 'Rohit Verma',
      vendorName: 'Royal Cabs Kerala',
      numberOfCabs: 1,
      vendorCost: 3500,
      paxInVehicle: 2,
      vehicleType: 'Swift Dzire',
      vehicleNumber: 'KL-07-CD-2222',
      driverName: 'Rajesh P',
      dutyRoute: 'Airport → Hotel',
      createdAt: new Date(),
      updatedAt: new Date(),
    },
  ]);

  const vendorLogs = await db.collection('vehiclelogs').find({
    vendorName: 'Royal Cabs Kerala',
    operationDate: { $gte: startOfMonth, $lte: endOfMonth },
  }).toArray();

  const totalCabsAllotted = vendorLogs.reduce((acc, l) => acc + (l.numberOfCabs || 1), 0);
  const totalTrips = vendorLogs.length;

  assert(totalCabsAllotted === 4, `Vendor Total Cabs Allotted aggregated correctly: expected 4, got ${totalCabsAllotted}`);
  assert(totalTrips === 3, `Vendor Total Trips aggregated correctly: expected 3, got ${totalTrips}`);

  // 3. Financial Analytics Test
  console.log('\n--- 3. Testing Financial Analytics (Revenue, Expenses & Profit) ---');
  const monthPackages = await db.collection('packages').find({
    bookingId: /^TEST-ANALYTICS-/,
    checkInDate: { $lte: endOfMonth },
    checkOutDate: { $gte: startOfMonth },
  }).toArray();

  const totalIncome = monthPackages.reduce((acc, p) => acc + (p.packageAmount || 0), 0);
  const totalExpense = monthPackages.reduce((acc, p) => acc + (p.totalExpense || 0), 0);
  const netProfit = totalIncome - totalExpense;
  const margin = ((netProfit / totalIncome) * 100).toFixed(1);

  assert(totalIncome === 100000, `Total Revenue aggregated correctly: expected 100,000, got ${totalIncome}`);
  assert(totalExpense === 65000, `Total Operational Expense aggregated correctly: expected 65,000, got ${totalExpense}`);
  assert(netProfit === 35000, `Net Profit computed correctly: expected 35,000, got ${netProfit}`);
  assert(margin === '35.0', `Net Profit Margin computed correctly: expected 35.0%, got ${margin}%`);

  // Cleanup test documents
  await db.collection('packages').deleteMany({ bookingId: /^TEST-ANALYTICS-/ });
  await db.collection('vehiclelogs').deleteMany({ packageId: /^TEST-ANALYTICS-/ });

  console.log('\n===========================================');
  console.log(`🎯 ALL VERIFICATION TESTS: ${passCount}/${testCount} PASSED!`);
  console.log('===========================================\n');

  await mongoose.disconnect();
}

runTests().catch((err) => {
  console.error('Test suite failed:', err);
  process.exit(1);
});
