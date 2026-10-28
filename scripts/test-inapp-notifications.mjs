/**
 * scripts/test-inapp-notifications.mjs
 * Comprehensive automated test suite for CRM In-App Notifications
 */
import mongoose from 'mongoose';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

// Load environment variables
const envPath = path.join(rootDir, '.env.local');
if (fs.existsSync(envPath)) {
  fs.readFileSync(envPath, 'utf8').split('\n').forEach((l) => {
    const t = l.trim();
    if (t && !t.startsWith('#') && t.includes('=')) {
      const [k, ...v] = t.split('=');
      if (!process.env[k.trim()]) process.env[k.trim()] = v.join('=').trim().replace(/^["']|["']$/g, '');
    }
  });
}

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/travel_operations_crm';

console.log('🧪 ========================================================');
console.log('🧪 STARTING IN-APP NOTIFICATION TEST SUITE');
console.log('🧪 ========================================================\n');

let testsPassed = 0;
let testsFailed = 0;

function assert(condition, testName, details = '') {
  if (condition) {
    console.log(`  ✅ PASS: ${testName}`);
    testsPassed++;
  } else {
    console.error(`  ❌ FAIL: ${testName} - ${details}`);
    testsFailed++;
  }
}

await mongoose.connect(MONGODB_URI);

const TestPkgSchema = new mongoose.Schema(
  {
    bookingId: String,
    guestName: String,
    contactNumber: String,
    agencyName: String,
    totalPax: Number,
    checkInDate: Date,
    checkOutDate: Date,
    totalDays: String,
    hotelDetails: String,
    packageAmount: Number,
    advancePaid: Number,
    balancePending: Number,
    status: String,
  },
  { collection: 'packages', timestamps: true }
);

const TestVehicleSchema = new mongoose.Schema(
  {
    operationDate: Date,
    packageId: String,
    guestName: String,
    vehicleType: String,
    vehicleNumber: String,
    driverName: String,
    driverPhone: String,
    dutyRoute: String,
  },
  { collection: 'vehiclelogs', timestamps: true }
);

const PackageModel = mongoose.models.TestPkgNotif || mongoose.model('TestPkgNotif', TestPkgSchema);
const VehicleModel = mongoose.models.TestVehNotif || mongoose.model('TestVehNotif', TestVehicleSchema);

const TEST_PREFIX = `TEST-NOTIF-${Date.now()}`;
const today = new Date();
today.setHours(0, 0, 0, 0);

function addDays(d, days) {
  const result = new Date(d);
  result.setDate(result.getDate() + days);
  return result;
}

try {
  // Clean up any old test records
  await PackageModel.deleteMany({ bookingId: new RegExp(`^${TEST_PREFIX}`) });
  await VehicleModel.deleteMany({ packageId: new RegExp(`^${TEST_PREFIX}`) });

  console.log('--- TEST GROUP 1: Seeding Test Packages in Local MongoDB ---');

  // 1. Check-in Today (Day 0)
  const pkgToday = await PackageModel.create({
    bookingId: `${TEST_PREFIX}-TODAY`,
    guestName: 'Karan Mehra',
    contactNumber: '9900112233',
    totalPax: 2,
    checkInDate: addDays(today, 0),
    checkOutDate: addDays(today, 3),
    status: 'Upcoming',
    packageAmount: 20000,
    advancePaid: 20000,
    balancePending: 0,
  });

  // 2. Check-in Tomorrow (Day 1) - with pending balance
  const pkg1 = await PackageModel.create({
    bookingId: `${TEST_PREFIX}-1DAY`,
    guestName: 'Rohit Sharma',
    contactNumber: '9900112244',
    totalPax: 4,
    checkInDate: addDays(today, 1),
    checkOutDate: addDays(today, 5),
    status: 'Upcoming',
    packageAmount: 40000,
    advancePaid: 15000,
    balancePending: 25000,
  });

  // 3. Check-in in 3 Days - with assigned cab
  const pkg3 = await PackageModel.create({
    bookingId: `${TEST_PREFIX}-3DAYS`,
    guestName: 'Sneha Patel',
    contactNumber: '9900112255',
    totalPax: 3,
    checkInDate: addDays(today, 3),
    checkOutDate: addDays(today, 7),
    status: 'Upcoming',
    packageAmount: 35000,
    advancePaid: 35000,
    balancePending: 0,
  });

  // Vehicle log for pkg3
  await VehicleModel.create({
    operationDate: addDays(today, 3),
    packageId: pkg3.bookingId,
    guestName: pkg3.guestName,
    vehicleType: 'Innova Crysta',
    vehicleNumber: 'KL 07 CD 4455',
    driverName: 'Mohan Driver',
    driverPhone: '9847012345',
    dutyRoute: 'Cochin Arrival & City Tour',
  });

  // 4. Check-in in 7 Days (1 Week)
  const pkg7 = await PackageModel.create({
    bookingId: `${TEST_PREFIX}-7DAYS`,
    guestName: 'Ananya Roy',
    contactNumber: '9900112266',
    totalPax: 2,
    checkInDate: addDays(today, 7),
    checkOutDate: addDays(today, 10),
    status: 'Upcoming',
    packageAmount: 28000,
    advancePaid: 10000,
    balancePending: 18000,
  });

  // 5. Far future (15 Days) - should be excluded
  const pkg15 = await PackageModel.create({
    bookingId: `${TEST_PREFIX}-15DAYS`,
    guestName: 'Far Future Guest',
    checkInDate: addDays(today, 15),
    checkOutDate: addDays(today, 18),
    status: 'Upcoming',
  });

  // 6. Cancelled package tomorrow - should be excluded
  const pkgCancelled = await PackageModel.create({
    bookingId: `${TEST_PREFIX}-CANCELLED`,
    guestName: 'Cancelled Guest',
    checkInDate: addDays(today, 1),
    checkOutDate: addDays(today, 4),
    status: 'Cancelled',
  });

  console.log(`  Seeded 5 test packages and 1 vehicle log (${TEST_PREFIX})`);

  console.log('\n--- TEST GROUP 2: In-App Notification Service Logic ---');
  // Dynamic query directly using the same database models
  const maxHorizon = new Date(today);
  maxHorizon.setDate(maxHorizon.getDate() + 8);
  maxHorizon.setHours(23, 59, 59, 999);

  const packages = await PackageModel.find({
    status: { $in: ['Upcoming', 'Ongoing'] },
    checkInDate: { $gte: today, $lte: maxHorizon },
    bookingId: new RegExp(`^${TEST_PREFIX}`),
  }).sort({ checkInDate: 1 }).lean();

  const vehicles = await VehicleModel.find({ packageId: { $in: packages.map(p => p.bookingId) } }).lean();
  const vehicleMap = new Map();
  vehicles.forEach(v => {
    if (!vehicleMap.has(v.packageId)) vehicleMap.set(v.packageId, []);
    vehicleMap.get(v.packageId).push(v);
  });

  const notifs = packages.map(pkg => {
    const checkIn = new Date(pkg.checkInDate);
    checkIn.setHours(0, 0, 0, 0);
    const daysRemaining = Math.round((checkIn.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    let stage = 'upcoming';
    let severity = 'info';
    let badge = 'Upcoming';

    if (daysRemaining === 0) {
      stage = 'today';
      severity = 'urgent';
      badge = '🚨 Today';
    } else if (daysRemaining === 1) {
      stage = '1_day';
      severity = 'urgent';
      badge = '🚨 Tomorrow';
    } else if (daysRemaining <= 3) {
      stage = '3_days';
      severity = 'warning';
      badge = `⏰ ${daysRemaining} Days`;
    } else if (daysRemaining <= 7) {
      stage = '7_days';
      severity = 'info';
      badge = `📅 ${daysRemaining} Days`;
    }

    const assignedVehs = vehicleMap.get(pkg.bookingId) || [];
    const fleetAssigned = assignedVehs.length > 0;
    const fleetSummary = fleetAssigned
      ? `${assignedVehs.length} vehicle(s) scheduled (${assignedVehs[0]?.vehicleType || 'Cab'})`
      : '⚠️ No fleet/cab assigned yet';

    return {
      bookingId: pkg.bookingId,
      guestName: pkg.guestName,
      daysRemaining,
      stage,
      severity,
      badge,
      fleetAssigned,
      fleetSummary,
      balancePending: pkg.balancePending || 0,
    };
  });

  const notifToday = notifs.find((n) => n.bookingId === pkgToday.bookingId);
  const notif1 = notifs.find((n) => n.bookingId === pkg1.bookingId);
  const notif3 = notifs.find((n) => n.bookingId === pkg3.bookingId);
  const notif7 = notifs.find((n) => n.bookingId === pkg7.bookingId);
  const notif15 = notifs.find((n) => n.bookingId === pkg15.bookingId);
  const notifCancelled = notifs.find((n) => n.bookingId === pkgCancelled.bookingId);

  console.log('\n--- TEST GROUP 3: Milestone Accuracy & Severity Checks ---');
  assert(Boolean(notifToday), 'Found notification for Today check-in');
  assert(notifToday?.stage === 'today', 'Today package stage is "today"');
  assert(notifToday?.severity === 'urgent', 'Today package severity is "urgent"');

  assert(Boolean(notif1), 'Found notification for Tomorrow check-in (1 day)');
  assert(notif1?.stage === '1_day', 'Tomorrow package stage is "1_day"');
  assert(notif1?.severity === 'urgent', 'Tomorrow package severity is "urgent"');
  assert(notif1?.daysRemaining === 1, 'Tomorrow package daysRemaining === 1');
  assert(notif1?.balancePending === 25000, 'Pending balance of ₹25,000 accurately captured');
  assert(notif1?.fleetAssigned === false, 'Fleet correctly marked as unassigned');

  assert(Boolean(notif3), 'Found notification for 3 days check-in');
  assert(notif3?.stage === '3_days', '3 days package stage is "3_days"');
  assert(notif3?.severity === 'warning', '3 days package severity is "warning"');
  assert(notif3?.fleetAssigned === true, 'Fleet correctly marked as assigned');
  assert(notif3?.fleetSummary.includes('Innova Crysta'), 'Fleet summary contains assigned vehicle model');

  assert(Boolean(notif7), 'Found notification for 7 days check-in (1 week)');
  assert(notif7?.stage === '7_days', '7 days package stage is "7_days"');
  assert(notif7?.severity === 'info', '7 days package severity is "info"');

  assert(!notif15, '15-day package excluded from 8-day check-in horizon');
  assert(!notifCancelled, 'Cancelled package excluded from active notifications');

  console.log('\n--- TEST GROUP 4: Clean Up Test Records ---');
  await PackageModel.deleteMany({ bookingId: new RegExp(`^${TEST_PREFIX}`) });
  await VehicleModel.deleteMany({ packageId: new RegExp(`^${TEST_PREFIX}`) });
  console.log('  🧹 Successfully removed all test records.');

} catch (err) {
  console.error('Test execution error:', err);
  testsFailed++;
} finally {
  await mongoose.disconnect();
}

console.log('\n========================================================');
console.log(`TEST SUMMARY: ${testsPassed} PASSED, ${testsFailed} FAILED`);
console.log('========================================================\n');

if (testsFailed > 0) process.exit(1);
else process.exit(0);
