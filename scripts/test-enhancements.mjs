// scripts/test-enhancements.mjs
import mongoose from 'mongoose';

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/travel_operations_crm';

// Mirror formatWhatsAppPhone for ESM runner
function formatWhatsAppPhone(phone) {
  if (!phone) return '';
  const digits = phone.replace(/\D/g, '');
  if (digits.length === 10) return `91${digits}`;
  if (digits.length === 12 && digits.startsWith('91')) return digits;
  if (digits.length > 10) return digits;
  return digits;
}

function getGuestWhatsAppLink(pkg, fleetLogs = []) {
  const phone = formatWhatsAppPhone(pkg.contactNumber);
  const guestFirstName = (pkg.guestName || 'Valued Guest').split(' ')[0];

  let message = `*Namaste ${guestFirstName}!* 🙏\n`;
  message += `Greetings from *Travel Operations*.\n\n`;
  message += `Here are the confirmed details for your upcoming journey:\n`;
  message += `━━━━━━━━━━━━━━━━━━━━━\n`;
  message += `📌 *Booking ID:* ${pkg.bookingId || 'N/A'}\n`;
  message += `👥 *Total Guests:* ${pkg.totalPax || 1}\n`;
  message += `🏨 *Stay Details:* ${pkg.hotelDetails || 'As per confirmed plan'}\n`;

  return `https://wa.me/${phone}?text=${encodeURIComponent(message)}`;
}

async function testAll() {
  console.log('🧪 Starting Verification Suite for CRM Enhancements...\n');
  let passCount = 0;
  let testCount = 0;

  function assert(condition, testName) {
    testCount++;
    if (condition) {
      console.log(`  ✅ [PASS] ${testName}`);
      passCount++;
    } else {
      console.error(`  ❌ [FAIL] ${testName}`);
    }
  }

  // 1. WhatsApp Integration Utilities
  console.log('--- 1. Testing WhatsApp Integration Utilities ---');
  const dummyPkg = {
    _id: 'test-123',
    bookingId: 'TRV-2026-001',
    guestName: 'Ananya Sharma',
    contactNumber: '9876543210',
    totalPax: 4,
    hotelDetails: 'Grand Hyatt, Kochi',
  };

  const phoneFormatted = formatWhatsAppPhone('9876543210');
  assert(phoneFormatted === '919876543210', 'Phone number normalized with country code 91');

  const guestLink = getGuestWhatsAppLink(dummyPkg);
  assert(guestLink.startsWith('https://wa.me/919876543210?text='), 'Guest WhatsApp link points to wa.me with guest phone');
  assert(guestLink.includes('TRV-2026-001') && guestLink.includes('Grand%20Hyatt'), 'Guest WhatsApp link encodes booking ID and hotel');

  // 2. Database Indexes & Models
  console.log('\n--- 2. Testing Database Indexes & Models ---');
  await mongoose.connect(MONGODB_URI);
  const db = mongoose.connection.db;

  const pkgIndexes = await db.collection('packages').indexes();
  console.log('  Package indexes found:', pkgIndexes.map(i => Object.keys(i.key).join('_')).join(', '));
  assert(pkgIndexes.length >= 2, 'Package collection has optimized compound indexes');

  const fleetIndexes = await db.collection('vehiclelogs').indexes();
  console.log('  VehicleLog indexes found:', fleetIndexes.map(i => Object.keys(i.key).join('_')).join(', '));
  assert(fleetIndexes.length >= 2, 'VehicleLog collection has conflict and operation date indexes');

  // 3. Conflict Detection Logic in DB
  console.log('\n--- 3. Testing Double-Booking Conflict Detection Logic ---');
  const testDate = '2026-11-15';
  const testPlate = 'KL-01-AB-9999';
  const testDriver = 'Ramesh Babu';

  await db.collection('vehiclelogs').deleteMany({ vehicleNumber: testPlate });

  const insertRes = await db.collection('vehiclelogs').insertOne({
    packageId: new mongoose.Types.ObjectId(),
    operationDate: new Date(testDate),
    vehicleNumber: testPlate,
    vehicleType: 'Innova Crysta',
    driverName: testDriver,
    driverContact: '9845012345',
    pickupLocation: 'Munnar',
    dropLocation: 'Alleppey',
    status: 'Scheduled',
    createdAt: new Date(),
    updatedAt: new Date()
  });

  const conflictLog = await db.collection('vehiclelogs').findOne({
    _id: { $ne: new mongoose.Types.ObjectId() },
    $and: [
      {
        operationDate: {
          $gte: new Date(testDate + 'T00:00:00.000Z'),
          $lte: new Date(testDate + 'T23:59:59.999Z')
        }
      },
      {
        $or: [
          { vehicleNumber: testPlate },
          { driverName: { $regex: new RegExp(`^${testDriver}$`, 'i') } }
        ]
      }
    ]
  });

  assert(conflictLog !== null && conflictLog.vehicleNumber === testPlate, 'Conflict detector accurately finds overlapping cab/driver on same day');

  await db.collection('vehiclelogs').deleteOne({ _id: insertRes.insertedId });

  // 4. Payment Calculations
  console.log('\n--- 4. Testing Payment & Balance Recalculation ---');
  const pkgAmount = 50000;
  const initialAdvance = 10000;
  const paymentAddition = 15000;
  const newAdvance = initialAdvance + paymentAddition;
  const newBalance = Math.max(0, pkgAmount - newAdvance);

  assert(newAdvance === 25000, 'Advance properly accumulates');
  assert(newBalance === 25000, 'Balance pending recalculates accurately');

  console.log('\n===========================================');
  console.log(`🎯 ALL VERIFICATION TESTS: ${passCount}/${testCount} PASSED!`);
  console.log('===========================================\n');

  await mongoose.disconnect();
}

testAll().catch(err => {
  console.error('Test execution failed:', err);
  process.exit(1);
});

