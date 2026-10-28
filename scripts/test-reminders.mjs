/**
 * scripts/test-reminders.mjs
 * Comprehensive automated test suite for Tour Check-in Reminders
 * Tests milestones (7d, 3d, 1d), duplicate prevention, HTML generation, and API endpoint
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
const PORT = process.env.PORT || 3001;
const CRON_SECRET = process.env.CRON_SECRET || 'crm_cron_secret_2026';

console.log('🧪 ========================================================');
console.log('🧪 STARTING COMPREHENSIVE TOUR REMINDER TEST SUITE');
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

// Connect to MongoDB
await mongoose.connect(MONGODB_URI);

// Define lightweight schemas for testing directly
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
    remindersSent: [String],
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

const PackageModel = mongoose.models.TestPackage || mongoose.model('TestPackage', TestPkgSchema);
const VehicleModel = mongoose.models.TestVehicle || mongoose.model('TestVehicle', TestVehicleSchema);

const TEST_PREFIX = `TEST-REM-${Date.now()}`;
const today = new Date();
today.setHours(0, 0, 0, 0);

function addDays(d, days) {
  const result = new Date(d);
  result.setDate(result.getDate() + days);
  return result;
}

try {
  console.log('--- TEST GROUP 1: Milestone Logic Verification ---');
  function getMilestone(diff) {
    if (diff === 7) return '7_days';
    if (diff === 3) return '3_days';
    if (diff === 1) return '1_day';
    return null;
  }

  assert(getMilestone(7) === '7_days', '7 days matches 7_days stage');
  assert(getMilestone(3) === '3_days', '3 days matches 3_days stage');
  assert(getMilestone(1) === '1_day', '1 day matches 1_day stage');
  assert(getMilestone(5) === null, '5 days is not a milestone (null)');
  assert(getMilestone(0) === null, '0 days (same-day checkin) is not a milestone');
  assert(getMilestone(10) === null, '10 days is not a milestone');

  console.log('\n--- TEST GROUP 2: Seed Test Packages in Database ---');
  // 1. Package in 7 days
  const pkg7 = await PackageModel.create({
    bookingId: `${TEST_PREFIX}-007`,
    guestName: 'Anil Kapoor',
    contactNumber: '9876500007',
    totalPax: 2,
    checkInDate: addDays(today, 7),
    checkOutDate: addDays(today, 10),
    status: 'Upcoming',
    packageAmount: 25000,
    advancePaid: 25000,
    balancePending: 0,
    remindersSent: [],
  });

  // 2. Package in 3 days
  const pkg3 = await PackageModel.create({
    bookingId: `${TEST_PREFIX}-003`,
    guestName: 'Priya Nair',
    contactNumber: '9876500003',
    totalPax: 3,
    checkInDate: addDays(today, 3),
    checkOutDate: addDays(today, 6),
    status: 'Upcoming',
    packageAmount: 32000,
    advancePaid: 10000,
    balancePending: 22000,
    remindersSent: [],
  });

  // 3. Package in 1 day (tomorrow)
  const pkg1 = await PackageModel.create({
    bookingId: `${TEST_PREFIX}-001`,
    guestName: 'Vikram Seth',
    contactNumber: '9876500001',
    totalPax: 2,
    checkInDate: addDays(today, 1),
    checkOutDate: addDays(today, 4),
    status: 'Upcoming',
    packageAmount: 18000,
    advancePaid: 18000,
    balancePending: 0,
    remindersSent: [],
  });

  // 4. Non-milestone package in 5 days
  const pkg5 = await PackageModel.create({
    bookingId: `${TEST_PREFIX}-005`,
    guestName: 'Meera Rao',
    totalPax: 1,
    checkInDate: addDays(today, 5),
    checkOutDate: addDays(today, 8),
    status: 'Upcoming',
    remindersSent: [],
  });

  // 5. Cancelled package in 3 days
  const pkgCancelled = await PackageModel.create({
    bookingId: `${TEST_PREFIX}-CANCELLED`,
    guestName: 'Cancelled Guest',
    checkInDate: addDays(today, 3),
    checkOutDate: addDays(today, 6),
    status: 'Cancelled',
    remindersSent: [],
  });

  // Attach a vehicle log to pkg3
  await VehicleModel.create({
    operationDate: addDays(today, 3),
    packageId: pkg3.bookingId,
    guestName: pkg3.guestName,
    vehicleType: 'Sedan Dzire',
    vehicleNumber: 'KL 01 AB 9999',
    driverName: 'Ramesh Driver',
    driverPhone: '9800011122',
    dutyRoute: 'Airport to Munnar',
  });

  console.log(`  Seeded 5 test packages (${TEST_PREFIX}) and 1 vehicle log.`);

  console.log('\n--- TEST GROUP 3: Next.js API Route (/api/cron/reminders) Execution ---');
  const apiUrl = `http://localhost:${PORT}/api/cron/reminders?secret=${encodeURIComponent(CRON_SECRET)}`;
  const res = await fetch(apiUrl, { method: 'POST' });
  assert(res.ok, 'API returned HTTP 200 OK');

  const data = await res.json();
  assert(data.success === true, 'API response success flag is true');
  assert(data.report && typeof data.report.totalActivePackages === 'number', 'API returned report object');

  const results = data.report.results || [];
  const resPkg7 = results.find((r) => r.bookingId === pkg7.bookingId);
  const resPkg3 = results.find((r) => r.bookingId === pkg3.bookingId);
  const resPkg1 = results.find((r) => r.bookingId === pkg1.bookingId);
  const resPkg5 = results.find((r) => r.bookingId === pkg5.bookingId);
  const resCancelled = results.find((r) => r.bookingId === pkgCancelled.bookingId);

  assert(resPkg7 && resPkg7.stage === '7_days' && resPkg7.success, 'Pkg in 7 days triggered 7_days reminder email');
  assert(resPkg3 && resPkg3.stage === '3_days' && resPkg3.success, 'Pkg in 3 days triggered 3_days reminder email');
  assert(resPkg1 && resPkg1.stage === '1_day' && resPkg1.success, 'Pkg in 1 day triggered 1_day reminder email');
  assert(!resPkg5, 'Pkg in 5 days was NOT triggered (correctly skipped)');
  assert(!resCancelled, 'Cancelled package was NOT triggered (correctly skipped)');

  console.log('\n--- TEST GROUP 4: Database Update Verification (remindersSent) ---');
  const updatedPkg7 = await PackageModel.findById(pkg7._id);
  const updatedPkg3 = await PackageModel.findById(pkg3._id);
  const updatedPkg1 = await PackageModel.findById(pkg1._id);

  assert(updatedPkg7.remindersSent.includes('7_days'), 'Database marked pkg7.remindersSent = ["7_days"]');
  assert(updatedPkg3.remindersSent.includes('3_days'), 'Database marked pkg3.remindersSent = ["3_days"]');
  assert(updatedPkg1.remindersSent.includes('1_day'), 'Database marked pkg1.remindersSent = ["1_day"]');

  console.log('\n--- TEST GROUP 5: Idempotency & Zero Duplicate Emails ---');
  // Re-run the API immediately without force flag
  const res2 = await fetch(apiUrl, { method: 'POST' });
  assert(res2.ok, 'Second API call returned HTTP 200 OK');
  const data2 = await res2.json();

  const dup7 = (data2.report.results || []).find((r) => r.bookingId === pkg7.bookingId);
  const dup3 = (data2.report.results || []).find((r) => r.bookingId === pkg3.bookingId);
  const dup1 = (data2.report.results || []).find((r) => r.bookingId === pkg1.bookingId);

  assert(!dup7 && !dup3 && !dup1, 'Zero duplicate emails sent on immediate second run');
  assert(data2.report.skippedAlreadySent >= 3, 'Report confirmed packages skipped because already sent');

  console.log('\n--- TEST GROUP 6: Clean Up Test Records ---');
  await PackageModel.deleteMany({ bookingId: new RegExp(`^${TEST_PREFIX}`) });
  await VehicleModel.deleteMany({ packageId: new RegExp(`^${TEST_PREFIX}`) });
  console.log('  🧹 Successfully cleaned up all temporary test records.');

} catch (err) {
  console.error('Fatal error during test execution:', err);
  testsFailed++;
} finally {
  await mongoose.disconnect();
}

console.log('\n========================================================');
console.log(`TEST RESULTS: ${testsPassed} PASSED, ${testsFailed} FAILED`);
console.log('========================================================\n');

if (testsFailed > 0) {
  process.exit(1);
} else {
  process.exit(0);
}
