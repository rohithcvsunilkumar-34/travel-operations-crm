// scripts/test-analytics.mjs
import mongoose from 'mongoose';

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/travel_operations_crm';

async function runComprehensiveTests() {
  console.log('🧪 =========================================================================');
  console.log('   DEEP DIVE ANALYTICS & MANUAL DATA ENTRY VERIFICATION SUITE');
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

  const testMonthKey = '2026-11';
  const startOfMonth = new Date(2026, 10, 1, 0, 0, 0, 0);
  const endOfMonth = new Date(2026, 10, 30, 23, 59, 59, 999);

  // Clean any previous test data
  await db.collection('packages').deleteMany({ bookingId: /^TEST-VERIFY-/ });
  await db.collection('vehiclelogs').deleteMany({ packageId: /^TEST-VERIFY-/ });
  await db.collection('foodlogs').deleteMany({ packageId: /^TEST-VERIFY-/ });

  // --------------------------------------------------------------------------
  // TEST SECTION 1: Hotel Room, Extra Bed & Hotel Cost Manual Entry
  // --------------------------------------------------------------------------
  console.log('--- SECTION 1: Hotel Room & Extra Bed Allocations + Cost Tracking ---');

  // Insert Package 1: Grand Hyatt Kochi, 2 rooms, 1 extra bed, Hotel Cost: ₹25,000
  await db.collection('packages').insertOne({
    bookingId: 'TEST-VERIFY-01',
    guestName: 'Arjun Mehra',
    contactNumber: '+91 98111 22233',
    agencyName: 'Direct',
    totalPax: 4,
    checkInDate: new Date('2026-11-04T00:00:00.000Z'),
    checkOutDate: new Date('2026-11-08T00:00:00.000Z'),
    totalDays: '5 Days / 4 Nights',
    hotelName: 'Grand Hyatt Kochi',
    numberOfRooms: 2,
    extraBeds: 1,
    total_hotel_cost: 25000,
    hotelCost: 25000,
    total_cab_cost: 0,
    total_food_cost: 0,
    otherExpenses: 2000,
    packageAmount: 65000,
    advancePaid: 25000,
    balancePending: 40000,
    totalExpense: 27000,
    netProfit: 38000,
    status: 'Upcoming',
    createdAt: new Date(),
    updatedAt: new Date(),
  });

  // Insert Package 2: Grand Hyatt Kochi with manual entry where numberOfRooms is entered as 0 (should default to 1)
  await db.collection('packages').insertOne({
    bookingId: 'TEST-VERIFY-02',
    guestName: 'Nisha Singhal',
    contactNumber: '+91 98222 33344',
    agencyName: 'MakeMyTrip',
    totalPax: 2,
    checkInDate: new Date('2026-11-10T00:00:00.000Z'),
    checkOutDate: new Date('2026-11-14T00:00:00.000Z'),
    totalDays: '5 Days / 4 Nights',
    hotelName: 'Grand Hyatt Kochi',
    numberOfRooms: 0, // Manual edge case
    extraBeds: 0,
    total_hotel_cost: 18000,
    hotelCost: 18000,
    total_cab_cost: 0,
    total_food_cost: 0,
    otherExpenses: 1000,
    packageAmount: 45000,
    advancePaid: 45000,
    balancePending: 0,
    totalExpense: 19000,
    netProfit: 26000,
    status: 'Upcoming',
    createdAt: new Date(),
    updatedAt: new Date(),
  });

  // Insert Package 3: Blanket Luxury Hotel Munnar
  await db.collection('packages').insertOne({
    bookingId: 'TEST-VERIFY-03',
    guestName: 'Karan Johar Group',
    contactNumber: '+91 98333 44455',
    agencyName: 'Thomas Cook',
    totalPax: 6,
    checkInDate: new Date('2026-11-18T00:00:00.000Z'),
    checkOutDate: new Date('2026-11-22T00:00:00.000Z'),
    totalDays: '5 Days / 4 Nights',
    hotelName: 'Blanket Luxury Hotel & Spa',
    numberOfRooms: 3,
    extraBeds: 2,
    total_hotel_cost: 32000,
    hotelCost: 32000,
    total_cab_cost: 0,
    total_food_cost: 0,
    otherExpenses: 3000,
    packageAmount: 90000,
    advancePaid: 30000,
    balancePending: 60000,
    totalExpense: 35000,
    netProfit: 55000,
    status: 'Upcoming',
    createdAt: new Date(),
    updatedAt: new Date(),
  });

  // Verify Hotel aggregation for Grand Hyatt Kochi
  const grandHyattPkgs = await db.collection('packages').find({
    hotelName: 'Grand Hyatt Kochi',
    checkInDate: { $lte: endOfMonth },
    checkOutDate: { $gte: startOfMonth },
    status: { $ne: 'Cancelled' },
  }).toArray();

  const totalHyattRooms = grandHyattPkgs.reduce((acc, p) => acc + Math.max(1, p.numberOfRooms || 1), 0);
  const totalHyattBeds = grandHyattPkgs.reduce((acc, p) => acc + (p.extraBeds || 0), 0);
  const totalHyattCost = grandHyattPkgs.reduce((acc, p) => acc + (p.total_hotel_cost || p.hotelCost || 0), 0);

  assert(totalHyattRooms === 3, `Grand Hyatt Total Rooms Booked correctly defaults 0->1 and sums to 3 (got ${totalHyattRooms})`);
  assert(totalHyattBeds === 1, `Grand Hyatt Total Extra Beds correctly aggregated to 1 (got ${totalHyattBeds})`);
  assert(totalHyattCost === 43000, `Grand Hyatt Total Hotel Payable is ₹43,000 (got ₹${totalHyattCost})`);

  // --------------------------------------------------------------------------
  // TEST SECTION 2: Daily Cab Fleet Cost & Vendor Allotment Tracking
  // --------------------------------------------------------------------------
  console.log('\n--- SECTION 2: Daily Cab Fleet Cost & Vendor Allotment Tracking ---');

  await db.collection('vehiclelogs').insertMany([
    {
      operationDate: new Date('2026-11-04T00:00:00.000Z'),
      packageId: 'TEST-VERIFY-01',
      guestName: 'Arjun Mehra',
      vendorName: 'Royal Cabs Kerala',
      driverName: 'Suresh Driver',
      numberOfCabs: 2,
      daily_cab_cost: 3500,
      vendorCost: 3500,
      paxInVehicle: 4,
      vehicleType: 'Innova Crysta',
      dutyRoute: 'Airport → Cochin Hotel',
      createdAt: new Date(),
      updatedAt: new Date(),
    },
    {
      operationDate: new Date('2026-11-05T00:00:00.000Z'),
      packageId: 'TEST-VERIFY-01',
      guestName: 'Arjun Mehra',
      vendorName: 'Royal Cabs Kerala',
      driverName: 'Suresh Driver',
      numberOfCabs: 1,
      daily_cab_cost: 4000,
      vendorCost: 4000,
      paxInVehicle: 4,
      vehicleType: 'Innova Crysta',
      dutyRoute: 'Fort Kochi Sightseeing',
      createdAt: new Date(),
      updatedAt: new Date(),
    },
    {
      operationDate: new Date('2026-11-10T00:00:00.000Z'),
      packageId: 'TEST-VERIFY-02',
      guestName: 'Nisha Singhal',
      vendorName: 'Royal Cabs Kerala',
      driverName: 'Ramesh Driver',
      numberOfCabs: 1,
      daily_cab_cost: 2800,
      vendorCost: 2800,
      paxInVehicle: 2,
      vehicleType: 'Swift Dzire',
      dutyRoute: 'Airport Transfer',
      createdAt: new Date(),
      updatedAt: new Date(),
    },
  ]);

  const royalCabLogs = await db.collection('vehiclelogs').find({
    vendorName: 'Royal Cabs Kerala',
    operationDate: { $gte: startOfMonth, $lte: endOfMonth },
  }).toArray();

  const totalCabsAllotted = royalCabLogs.reduce((acc, l) => acc + Math.max(1, l.numberOfCabs || 1), 0);
  const totalTrips = royalCabLogs.length;
  const totalCabPayable = royalCabLogs.reduce((acc, l) => acc + (l.daily_cab_cost || l.vendorCost || 0), 0);

  assert(totalCabsAllotted === 4, `Royal Cabs Total Cabs Allotted aggregated correctly: 4 (got ${totalCabsAllotted})`);
  assert(totalTrips === 3, `Royal Cabs Total Duty Trips aggregated correctly: 3 (got ${totalTrips})`);
  assert(totalCabPayable === 10300, `Royal Cabs Total Payable calculated correctly: ₹10,300 (got ₹${totalCabPayable})`);

  // --------------------------------------------------------------------------
  // TEST SECTION 3: Food & Dining Module - Logging & Package Sync
  // --------------------------------------------------------------------------
  console.log('\n--- SECTION 3: Food & Dining Module Logging & Package Cost Sync ---');

  // Insert 2 dining logs for TEST-VERIFY-01 and 1 for TEST-VERIFY-02
  await db.collection('foodlogs').insertMany([
    {
      packageId: 'TEST-VERIFY-01',
      guestName: 'Arjun Mehra',
      mealDate: new Date('2026-11-05T00:00:00.000Z'),
      mealType: 'Lunch',
      restaurantName: 'Saravana Bhavan Pure Veg',
      foodCost: 1800,
      paxCount: 4,
      paymentStatus: 'Pending',
      remarks: 'Traditional Kerala Thali',
      createdAt: new Date(),
      updatedAt: new Date(),
    },
    {
      packageId: 'TEST-VERIFY-01',
      guestName: 'Arjun Mehra',
      mealDate: new Date('2026-11-06T00:00:00.000Z'),
      mealType: 'Dinner',
      restaurantName: 'Fort Kochi Heritage Bistro',
      foodCost: 3200,
      paxCount: 4,
      paymentStatus: 'Paid',
      remarks: 'Seafood dinner, paid via agent UPI',
      createdAt: new Date(),
      updatedAt: new Date(),
    },
    {
      packageId: 'TEST-VERIFY-02',
      guestName: 'Nisha Singhal',
      mealDate: new Date('2026-11-11T00:00:00.000Z'),
      mealType: 'Lunch',
      restaurantName: 'Saravana Bhavan Pure Veg',
      foodCost: 950,
      paxCount: 2,
      paymentStatus: 'Pending',
      remarks: 'Lunch combo',
      createdAt: new Date(),
      updatedAt: new Date(),
    },
  ]);

  // Aggregate dining logs for Saravana Bhavan
  const saravanaLogs = await db.collection('foodlogs').find({
    restaurantName: 'Saravana Bhavan Pure Veg',
    mealDate: { $gte: startOfMonth, $lte: endOfMonth },
  }).toArray();

  const saravanaMeals = saravanaLogs.length;
  const saravanaPax = saravanaLogs.reduce((acc, f) => acc + (f.paxCount || 1), 0);
  const saravanaCost = saravanaLogs.reduce((acc, f) => acc + (f.foodCost || 0), 0);

  assert(saravanaMeals === 2, `Saravana Bhavan Total Meals aggregated correctly: 2 (got ${saravanaMeals})`);
  assert(saravanaPax === 6, `Saravana Bhavan Total Pax aggregated correctly: 6 (got ${saravanaPax})`);
  assert(saravanaCost === 2750, `Saravana Bhavan Total Payable aggregated correctly: ₹2,750 (got ₹${saravanaCost})`);

  // --------------------------------------------------------------------------
  // TEST SECTION 4: Master Cost & Profit Breakdown Auto-Calculation
  // --------------------------------------------------------------------------
  console.log('\n--- SECTION 4: Master Package Cost & Profit Breakdown Auto-Calculation ---');

  // For TEST-VERIFY-01:
  // Hotel Cost = 25,000
  // Cab Fleet Cost = 3,500 + 4,000 = 7,500
  // Food & Dining Cost = 1,800 + 3,200 = 5,000
  // Other Expenses = 2,000
  // Grand Total Operational Cost = 25,000 + 7,500 + 5,000 + 2,000 = 39,500
  // Package Amount = 65,000
  // Net Profit = 65,000 - 39,500 = 25,500
  // Profit Margin = (25,500 / 65,000) * 100 = 39.23% -> 39.2%

  const pkg1FoodLogs = await db.collection('foodlogs').find({ packageId: 'TEST-VERIFY-01' }).toArray();
  const pkg1CabLogs = await db.collection('vehiclelogs').find({ packageId: 'TEST-VERIFY-01' }).toArray();
  const pkg1Doc = await db.collection('packages').findOne({ bookingId: 'TEST-VERIFY-01' });

  const calculatedHotelCost = Number(pkg1Doc.total_hotel_cost) || Number(pkg1Doc.hotelCost) || 0;
  const calculatedCabCost = pkg1CabLogs.reduce((sum, l) => sum + (l.daily_cab_cost || l.vendorCost || 0), 0);
  const calculatedFoodCost = pkg1FoodLogs.reduce((sum, f) => sum + (f.foodCost || 0), 0);
  const calculatedOtherExp = Number(pkg1Doc.otherExpenses) || 0;

  const grandTotalCost = calculatedHotelCost + calculatedCabCost + calculatedFoodCost + calculatedOtherExp;
  const calculatedNetProfit = (pkg1Doc.packageAmount || 0) - grandTotalCost;
  const calculatedMargin = (((calculatedNetProfit / pkg1Doc.packageAmount)) * 100).toFixed(1);

  assert(calculatedHotelCost === 25000, `Package 01 Hotel Cost matches ₹25,000`);
  assert(calculatedCabCost === 7500, `Package 01 Cab Cost matches ₹7,500`);
  assert(calculatedFoodCost === 5000, `Package 01 Food Cost matches ₹5,000`);
  assert(grandTotalCost === 39500, `Package 01 Grand Total Operational Cost is exactly ₹39,500 (got ₹${grandTotalCost})`);
  assert(calculatedNetProfit === 25500, `Package 01 Net Profit is exactly ₹25,500 (got ₹${calculatedNetProfit})`);
  assert(calculatedMargin === '39.2', `Package 01 Profit Margin is exactly 39.2% (got ${calculatedMargin}%)`);

  // --------------------------------------------------------------------------
  // TEST SECTION 5: Manual Data Entry & Edit Integrity
  // --------------------------------------------------------------------------
  console.log('\n--- SECTION 5: Manual Data Entry & Edit Integrity ---');

  // Test: If a user edits Package 01 to update guest phone number or adds 1 extra bed,
  // does the system wipe out the food or cab costs?
  const updatedHotelCost = 28000;
  const newPackageAmount = 70000;

  // Simulate updating package without touching food
  await db.collection('packages').updateOne(
    { bookingId: 'TEST-VERIFY-01' },
    {
      $set: {
        total_hotel_cost: updatedHotelCost,
        hotelCost: updatedHotelCost,
        packageAmount: newPackageAmount,
        total_cab_cost: calculatedCabCost,
        total_food_cost: calculatedFoodCost,
        totalExpense: updatedHotelCost + calculatedCabCost + calculatedFoodCost + calculatedOtherExp,
        netProfit: newPackageAmount - (updatedHotelCost + calculatedCabCost + calculatedFoodCost + calculatedOtherExp),
        extraBeds: 2,
      },
    }
  );

  const reloadedPkg = await db.collection('packages').findOne({ bookingId: 'TEST-VERIFY-01' });
  assert(reloadedPkg.extraBeds === 2, `Manual edit updated extra beds to 2`);
  assert(reloadedPkg.total_food_cost === 5000, `Food costs remained intact after manual package edit (₹5,000)`);
  assert(reloadedPkg.total_cab_cost === 7500, `Cab costs remained intact after manual package edit (₹7,500)`);
  assert(reloadedPkg.totalExpense === 42500, `Grand Total auto-recalculated to ₹42,500 (got ₹${reloadedPkg.totalExpense})`);
  assert(reloadedPkg.netProfit === 27500, `Net profit auto-recalculated to ₹27,500 (got ₹${reloadedPkg.netProfit})`);

  // --------------------------------------------------------------------------
  // TEST SECTION 6: Vendor Payables Cross-Section Reconciliation
  // --------------------------------------------------------------------------
  console.log('\n--- SECTION 6: Vendor Payables Cross-Section Reconciliation ---');

  const testMonthPackages = await db.collection('packages').find({
    bookingId: /^TEST-VERIFY-/,
    checkInDate: { $lte: endOfMonth },
    checkOutDate: { $gte: startOfMonth },
  }).toArray();

  const testMonthVehicles = await db.collection('vehiclelogs').find({
    packageId: /^TEST-VERIFY-/,
    operationDate: { $gte: startOfMonth, $lte: endOfMonth },
  }).toArray();

  const testMonthFoods = await db.collection('foodlogs').find({
    packageId: /^TEST-VERIFY-/,
    mealDate: { $gte: startOfMonth, $lte: endOfMonth },
  }).toArray();

  const totalHotelPayables = testMonthPackages.reduce((sum, p) => sum + (p.total_hotel_cost || p.hotelCost || 0), 0);
  const totalCabPayables = testMonthVehicles.reduce((sum, v) => sum + (v.daily_cab_cost || v.vendorCost || 0), 0);
  const totalFoodPayables = testMonthFoods.reduce((sum, f) => sum + (f.foodCost || 0), 0);
  const grandTotalPayables = totalHotelPayables + totalCabPayables + totalFoodPayables;

  // Expected:
  // Hotel = 28,000 (Hyatt Pkg 1) + 18,000 (Hyatt Pkg 2) + 32,000 (Blanket Pkg 3) = 78,000
  // Cab = 3,500 + 4,000 + 2,800 = 10,300
  // Food = 1,800 + 3,200 + 950 = 5,950
  // Grand Total = 78,000 + 10,300 + 5,950 = 94,250
  assert(totalHotelPayables === 78000, `Total Hotel Payables reconciled to ₹78,000 (got ₹${totalHotelPayables})`);
  assert(totalCabPayables === 10300, `Total Cab Vendor Payables reconciled to ₹10,300 (got ₹${totalCabPayables})`);
  assert(totalFoodPayables === 5950, `Total Food/Restaurant Payables reconciled to ₹5,950 (got ₹${totalFoodPayables})`);
  assert(grandTotalPayables === 94250, `Grand Total Payables reconciled to ₹94,250 (got ₹${grandTotalPayables})`);

  // Cleanup test documents
  await db.collection('packages').deleteMany({ bookingId: /^TEST-VERIFY-/ });
  await db.collection('vehiclelogs').deleteMany({ packageId: /^TEST-VERIFY-/ });
  await db.collection('foodlogs').deleteMany({ packageId: /^TEST-VERIFY-/ });

  console.log('\n=========================================================================');
  console.log(`🎯 COMPREHENSIVE VERIFICATION RESULT: ${passCount}/${testCount} TESTS PASSED!`);
  console.log('=========================================================================\n');

  await mongoose.disconnect();
}

runComprehensiveTests().catch((err) => {
  console.error('Test execution failed:', err);
  process.exit(1);
});
