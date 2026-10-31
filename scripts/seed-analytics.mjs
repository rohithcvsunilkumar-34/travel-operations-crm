// scripts/seed-analytics.mjs
import mongoose from 'mongoose';

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/travel_operations_crm';

const HOTELS = [
  { name: 'Grand Hyatt Kochi', location: 'Bolgatty, Kochi', avgCostPerRoom: 6500 },
  { name: 'The Khyber Himalayan Resort', location: 'Gulmarg, Kashmir', avgCostPerRoom: 12000 },
  { name: 'Kumarakom Lake Resort', location: 'Kumarakom, Kerala', avgCostPerRoom: 9500 },
  { name: 'Taj Lake Palace', location: 'Udaipur, Rajasthan', avgCostPerRoom: 18000 },
  { name: 'Wangnoo Luxury Houseboat', location: 'Dal Lake, Srinagar', avgCostPerRoom: 5500 },
  { name: 'Radisson Collection Resort', location: 'Srinagar, Kashmir', avgCostPerRoom: 7500 },
  { name: 'Blanket Luxury Hotel & Spa', location: 'Munnar, Kerala', avgCostPerRoom: 5000 },
  { name: 'Evolve Back Kabini', location: 'Kabini, Karnataka', avgCostPerRoom: 14000 },
];

const VENDORS = [
  'Himalayan Wheels Transport',
  'Valley Fleet Services',
  'Royal Kerala Tour Cabs',
  'Malabar Transport Logistics',
  'In-House Premium Fleet',
];

const VEHICLE_TYPES = [
  'Innova Crysta',
  'Innova',
  'Ertiga',
  'Swift Dzire',
  'Tempo Traveller',
  'Force Urbania',
];

const DRIVERS = [
  { name: 'Ghulam Rasool', phone: '+91 97971 23456' },
  { name: 'Mohd. Rafiq', phone: '+91 94190 67890' },
  { name: 'Bashir Ahmed', phone: '+91 96222 34567' },
  { name: 'Suresh Kumar', phone: '+91 98450 12345' },
  { name: 'Manoj Pillai', phone: '+91 94471 99887' },
  { name: 'Farooq Lone', phone: '+91 97970 88776' },
  { name: 'Pradeep Nair', phone: '+91 98472 33445' },
  { name: 'Abdul Majid', phone: '+91 94199 55443' },
];

const GUEST_NAMES = [
  'Rahul Sharma & Family',
  'Ananya Deshmukh',
  'Dr. Sandeep Kulkarni',
  'Pooja & Rohan Mehra',
  'Vikramaditya Singhania',
  'Neha & Amit Bansal',
  'Kavita & Suresh Menon',
  'Deepak Chopra & Group',
  'Sneha Bhattacharya',
  'Sunil Narang',
  'Aarti & Gaurav Kapoor',
  'Harish Varma',
  'Priyanka & Vivek Nair',
  'Rajeshwari Iyer & Family',
  'Manish Chawla',
  'Divya & Siddharth Patel',
  'Col. Arvind Rathore',
  'Ritu & Kunal Saxena',
  'Dr. Shalini Mukhopadhyay',
  'Tarun & Meenakshi Joshi',
];

const AGENCIES = [
  'MakeMyTrip B2B',
  'Thomas Cook India',
  'Direct Guest',
  'Yatra Corporate',
  'Direct Website',
  'SOTC Holidays',
];

const RESTAURANTS = [
  'Saravana Bhavan Pure Veg',
  'Spice Garden Multi-Cuisine Munnar',
  'Paragon Restaurant & Cafe',
  'Mughal Darbar Traditional Wazwan',
  'Dal Lake Floating Garden Cafe',
  'Fort Kochi Heritage Bistro',
  'Udaivilas Dining Hall',
  'Highland Deck Resort Dining',
];

const MEAL_TYPES = ['Breakfast', 'Lunch', 'Dinner', 'Snacks'];

async function seedAnalyticsData() {
  console.log('🔄 Connecting to MongoDB:', MONGODB_URI);
  await mongoose.connect(MONGODB_URI);
  const db = mongoose.connection.db;

  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth(); // 0-based

  console.log('🧹 Clearing previous sample data...');
  await db.collection('packages').deleteMany({});
  await db.collection('vehiclelogs').deleteMany({});
  await db.collection('foodlogs').deleteMany({});

  const samplePackages = [];
  const sampleVehicleLogs = [];
  const sampleFoodLogs = [];

  // Generate 20 diverse packages:
  // 13 in Current Month, 4 in Last Month, 3 in Next Month
  for (let i = 0; i < 20; i++) {
    const bookingNum = 1001 + i;
    const bookingId = `TRV-${bookingNum}`;
    const guestName = GUEST_NAMES[i];
    const agencyName = AGENCIES[i % AGENCIES.length];
    const hotelObj = HOTELS[i % HOTELS.length];
    const vendorName = VENDORS[i % VENDORS.length];
    const driver = DRIVERS[i % DRIVERS.length];
    const vehicleType = VEHICLE_TYPES[i % VEHICLE_TYPES.length];

    // Determine target month and dates
    let targetMonth = currentMonth;
    let dayOffset = 2 + (i % 25);
    if (i < 3) {
      targetMonth = currentMonth - 1; // past month
      dayOffset = 10 + i * 5;
    } else if (i >= 17) {
      targetMonth = currentMonth + 1; // next month
      dayOffset = 5 + (i - 17) * 6;
    }

    const checkIn = new Date(currentYear, targetMonth, dayOffset);
    const nights = 3 + (i % 4); // 3 to 6 nights
    const checkOut = new Date(currentYear, targetMonth, dayOffset + nights);

    const totalPax = 2 + (i % 6); // 2 to 7 pax
    const numberOfRooms = Math.max(1, Math.ceil(totalPax / 2)); // 1 to 4 rooms
    const extraBeds = totalPax % 2 === 1 ? 1 : (i % 3 === 0 ? 1 : 0); // 0, 1, or 2 extra beds
    const numberOfCabs = totalPax > 4 ? 2 : 1; // 1 or 2 cabs

    // Pricing & Financials
    const packageAmount = Math.round(numberOfRooms * nights * (hotelObj.avgCostPerRoom * 1.55) + 8000);
    const advancePaid = i % 4 === 0 ? packageAmount : Math.round(packageAmount * 0.6);
    const balancePending = Math.max(0, packageAmount - advancePaid);

    const hotelCost = Math.round(numberOfRooms * nights * hotelObj.avgCostPerRoom);
    const cabVendorCost = Math.round(nights * (numberOfCabs * 3200));

    // Generate 1-2 dining logs per package
    let packageFoodCost = 0;
    const mealsCount = 1 + (i % 2);
    for (let m = 0; m < mealsCount; m++) {
      const mealDate = new Date(checkIn);
      mealDate.setDate(checkIn.getDate() + m);
      const restaurantName = RESTAURANTS[(i + m) % RESTAURANTS.length];
      const mealType = MEAL_TYPES[(i + m * 2) % MEAL_TYPES.length];
      const mealCost = Math.round(totalPax * (350 + (m * 200) + (i % 4) * 80));
      packageFoodCost += mealCost;

      sampleFoodLogs.push({
        packageId: bookingId,
        guestName,
        mealDate,
        mealType,
        restaurantName,
        foodCost: mealCost,
        paxCount: totalPax,
        paymentStatus: i % 3 === 0 ? 'Paid' : 'Pending',
        remarks: `${mealType} for ${totalPax} pax at ${restaurantName}`,
        createdAt: new Date(),
        updatedAt: new Date(),
      });
    }

    const otherExpenses = Math.round(packageAmount * 0.04);
    const totalExpense = hotelCost + cabVendorCost + packageFoodCost + otherExpenses;
    const netProfit = packageAmount - totalExpense;

    let status = 'Upcoming';
    if (checkOut < now) {
      status = 'Completed';
    } else if (checkIn <= now && checkOut >= now) {
      status = 'Ongoing';
    }

    const hotelDetails = `${hotelObj.name} (${numberOfRooms} Room${numberOfRooms > 1 ? 's' : ''}${extraBeds > 0 ? `, ${extraBeds} Extra Bed` : ''}) • ${hotelObj.location}`;

    // Package document
    samplePackages.push({
      bookingId,
      guestName,
      contactNumber: `+91 98${Math.floor(10000000 + Math.random() * 90000000)}`,
      agencyName,
      totalPax,
      checkInDate: checkIn,
      checkOutDate: checkOut,
      totalDays: `${nights + 1} Days / ${nights} Nights`,
      hotelDetails,
      hotelName: hotelObj.name,
      numberOfRooms,
      extraBeds,
      hotelAllocations: [
        {
          hotelName: hotelObj.name,
          location: hotelObj.location,
          roomType: i % 2 === 0 ? 'Deluxe Valley View' : 'Executive Lake Suite',
          numberOfRooms,
          extraBeds,
          cost: hotelCost,
        },
      ],
      packageAmount,
      advancePaid,
      balancePending,
      total_hotel_cost: hotelCost,
      total_cab_cost: cabVendorCost,
      total_food_cost: packageFoodCost,
      hotelCost,
      cabVendorCost,
      otherExpenses,
      totalExpense,
      netProfit,
      status,
      dailyLogs: [
        {
          dayNumber: 1,
          date: checkIn,
          placesVisited: 'Airport Welcome Pickup & Scenic Transfer',
          hotelStayed: hotelObj.name,
          dailyRemarks: 'Check-in smooth, welcome drinks served.',
        },
      ],
      createdAt: new Date(Date.now() - (20 - i) * 86400000 * 2),
      updatedAt: new Date(),
    });

    // Create 1-2 vehicle logs per package on key operational dates
    for (let c = 0; c < Math.min(2, nights); c++) {
      const opDate = new Date(checkIn);
      opDate.setDate(checkIn.getDate() + c);
      const dayCost = Math.round(cabVendorCost / nights);

      sampleVehicleLogs.push({
        operationDate: opDate,
        packageId: bookingId,
        guestName,
        paxInVehicle: totalPax,
        vehicleType,
        vehicleNumber: `KL-07-${String.fromCharCode(65 + (i % 26))}${String.fromCharCode(65 + ((i + 2) % 26))}-${1000 + i * 37 + c}`,
        vendorName,
        numberOfCabs,
        daily_cab_cost: dayCost,
        vendorCost: dayCost,
        driverName: driver.name,
        driverPhone: driver.phone,
        dutyRoute: c === 0 ? 'Airport / Station Pickup → Hotel Transfer' : 'Full Day Guided Sightseeing & Excursion',
        remarks: `${numberOfCabs} Cab(s) assigned via ${vendorName}. Clean & sanitized.`,
        createdAt: new Date(),
        updatedAt: new Date(),
      });
    }
  }

  await db.collection('packages').insertMany(samplePackages);
  console.log(`✅ Seeded ${samplePackages.length} rich travel packages!`);

  await db.collection('vehiclelogs').insertMany(sampleVehicleLogs);
  console.log(`✅ Seeded ${sampleVehicleLogs.length} detailed cab vendor duty logs!`);

  await db.collection('foodlogs').insertMany(sampleFoodLogs);
  console.log(`✅ Seeded ${sampleFoodLogs.length} detailed dining & food expense logs!`);

  console.log('\n===========================================');
  console.log('🎉 DUMMY DATA SEEDING COMPLETE!');
  console.log(`📦 Packages: ${samplePackages.length}`);
  console.log(`🚖 Cab Logs: ${sampleVehicleLogs.length}`);
  console.log(`🍽️ Food Logs: ${sampleFoodLogs.length}`);
  console.log('===========================================\n');

  await mongoose.disconnect();
}

seedAnalyticsData().catch((err) => {
  console.error('Seed error:', err);
  process.exit(1);
});

