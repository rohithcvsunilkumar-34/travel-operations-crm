// scripts/seed.mjs
import mongoose from 'mongoose';

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/travel_operations_crm';

async function seed() {
  console.log('Connecting to MongoDB:', MONGODB_URI);
  await mongoose.connect(MONGODB_URI);
  console.log('Connected!');

  const db = mongoose.connection.db;

  const today = new Date();
  const formatISO = (d) => d.toISOString().slice(0, 10);

  const dMinus2 = new Date(today);
  dMinus2.setDate(today.getDate() - 2);

  const dMinus1 = new Date(today);
  dMinus1.setDate(today.getDate() - 1);

  const dPlus1 = new Date(today);
  dPlus1.setDate(today.getDate() + 1);

  const dPlus3 = new Date(today);
  dPlus3.setDate(today.getDate() + 3);

  const dPlus4 = new Date(today);
  dPlus4.setDate(today.getDate() + 4);

  const dPlus7 = new Date(today);
  dPlus7.setDate(today.getDate() + 7);

  console.log('Seeding Sample Packages...');
  const packagesCol = db.collection('packages');
  await packagesCol.deleteMany({});

  const samplePackages = [
    {
      bookingId: 'TRV-1001',
      guestName: 'Rahul Sharma & Family',
      contactNumber: '+91 98201 12345',
      agencyName: 'MakeMyTrip B2B',
      totalPax: 4,
      checkInDate: today,
      checkOutDate: dPlus4,
      totalDays: '5 Days / 4 Nights',
      hotelDetails: 'The Lalit Grand Palace (2N) + Wangnoo Houseboat (2N)',
      packageAmount: 85000,
      advancePaid: 45000,
      balancePending: 40000,
      status: 'Ongoing',
      dailyLogs: [
        {
          dayNumber: 1,
          date: today,
          placesVisited: 'Srinagar Airport Pickup, Mughal Gardens (Nishat & Shalimar)',
          hotelStayed: 'The Lalit Grand Palace',
          dailyRemarks: 'Flight 6E-204 landed on time at 11:20 AM. Shikara ride done at sunset.',
        },
        {
          dayNumber: 2,
          date: dPlus1,
          placesVisited: 'Gulmarg Day Trip, Phase 1 & 2 Gondola Ride',
          hotelStayed: 'The Lalit Grand Palace',
          dailyRemarks: 'Gondola tickets booked for 10:30 AM slot. Warm coats arranged.',
        },
        {
          dayNumber: 3,
          date: new Date(today.getTime() + 2 * 24 * 60 * 60 * 1000),
          placesVisited: 'Pahalgam Valley, Betaab Valley & Aru Valley',
          hotelStayed: 'Wangnoo Luxury Houseboat',
          dailyRemarks: 'Check out from Lalit at 8:30 AM. Transfer to Houseboat Dal Lake.',
        },
        {
          dayNumber: 4,
          date: new Date(today.getTime() + 3 * 24 * 60 * 60 * 1000),
          placesVisited: 'Doodhpathri Meadows & Local Handicraft Shopping',
          hotelStayed: 'Wangnoo Luxury Houseboat',
          dailyRemarks: 'Pashmina showroom visit requested by lead guest.',
        },
        {
          dayNumber: 5,
          date: dPlus4,
          placesVisited: 'Shikara Ride & Srinagar Airport Drop',
          hotelStayed: 'Checkout',
          dailyRemarks: 'Flight SG-813 at 3:45 PM. Airport drop at 1:15 PM.',
        },
      ],
      createdAt: new Date(),
      updatedAt: new Date(),
    },
    {
      bookingId: 'TRV-1002',
      guestName: 'Ananya Deshmukh',
      contactNumber: '+91 94220 54321',
      agencyName: 'Direct Booking',
      totalPax: 2,
      checkInDate: today,
      checkOutDate: dPlus3,
      totalDays: '4 Days / 3 Nights',
      hotelDetails: 'Khyber Himalayan Resort & Spa',
      packageAmount: 62000,
      advancePaid: 62000,
      balancePending: 0,
      status: 'Ongoing',
      dailyLogs: [
        {
          dayNumber: 1,
          date: today,
          placesVisited: 'Airport Transfer directly to Gulmarg',
          hotelStayed: 'Khyber Resort',
          dailyRemarks: 'Honeymoon inclusion: Cake & room flower decoration arranged.',
        },
        {
          dayNumber: 2,
          date: dPlus1,
          placesVisited: 'Gulmarg Snow Activities & Spa session',
          hotelStayed: 'Khyber Resort',
          dailyRemarks: 'ATV ride booked with local union vendor.',
        },
      ],
      createdAt: new Date(),
      updatedAt: new Date(),
    },
    {
      bookingId: 'TRV-1003',
      guestName: 'Vikram Mehta (Corporate Group)',
      contactNumber: '+91 98110 99887',
      agencyName: 'Thomas Cook Corporate',
      totalPax: 12,
      checkInDate: dPlus1,
      checkOutDate: dPlus7,
      totalDays: '7 Days / 6 Nights',
      hotelDetails: 'Vivanta Dal View (3N) + Pine N Peak Pahalgam (3N)',
      packageAmount: 290000,
      advancePaid: 150000,
      balancePending: 140000,
      status: 'Upcoming',
      dailyLogs: [],
      createdAt: new Date(),
      updatedAt: new Date(),
    },
    {
      bookingId: 'TRV-1004',
      guestName: 'Dr. Sandeep Kulkarni',
      contactNumber: '+91 98500 11223',
      agencyName: 'Direct',
      totalPax: 3,
      checkInDate: dMinus2,
      checkOutDate: dPlus1,
      totalDays: '4 Days / 3 Nights',
      hotelDetails: 'Radisson Collection Srinagar',
      packageAmount: 48000,
      advancePaid: 48000,
      balancePending: 0,
      status: 'Ongoing',
      dailyLogs: [],
      createdAt: new Date(),
      updatedAt: new Date(),
    },
  ];

  await packagesCol.insertMany(samplePackages);
  console.log(`Seeded ${samplePackages.length} packages!`);

  console.log('Seeding Sample Vehicle Logs...');
  const vehiclesCol = db.collection('vehiclelogs');
  await vehiclesCol.deleteMany({});

  const sampleVehicles = [
    {
      operationDate: today,
      packageId: 'TRV-1001',
      guestName: 'Rahul Sharma & Family',
      paxInVehicle: 4,
      vehicleType: 'Innova Crysta',
      vehicleNumber: 'JK01AJ4455',
      vendorName: 'Himalayan Wheels Transport',
      driverName: 'Ghulam Rasool',
      driverPhone: '+91 97971 23456',
      dutyRoute: 'Airport Pickup → Nishat & Shalimar Gardens → Hotel Lalit Grand Palace',
      remarks: 'Driver reported at airport 30 mins prior with name placard.',
      createdAt: new Date(),
      updatedAt: new Date(),
    },
    {
      operationDate: today,
      packageId: 'TRV-1002',
      guestName: 'Ananya Deshmukh',
      paxInVehicle: 2,
      vehicleType: 'Innova',
      vehicleNumber: 'JK01AH8821',
      vendorName: 'Valley Fleet Services',
      driverName: 'Mohd. Rafiq',
      driverPhone: '+91 94190 67890',
      dutyRoute: 'Srinagar Airport → Gulmarg Direct Drop to Khyber',
      remarks: 'Snow chains loaded in boot for Tangmarg-Gulmarg climb.',
      createdAt: new Date(),
      updatedAt: new Date(),
    },
    {
      operationDate: today,
      packageId: 'TRV-1004',
      guestName: 'Dr. Sandeep Kulkarni',
      paxInVehicle: 3,
      vehicleType: 'Etios',
      vehicleNumber: 'JK01AE1199',
      vendorName: 'Self Owned Fleet',
      driverName: 'Bashir Ahmed',
      driverPhone: '+91 96222 34567',
      dutyRoute: 'Sonamarg Day Trip: Thajiwas Glacier & Zero Point',
      remarks: 'Packed breakfast picked from hotel. All guests wearing warm clothing.',
      createdAt: new Date(),
      updatedAt: new Date(),
    },
  ];

  await vehiclesCol.insertMany(sampleVehicles);
  console.log(`Seeded ${sampleVehicles.length} vehicle logs!`);

  console.log('Seeding Daily Operational Tasks...');
  const tasksCol = db.collection('dailytasks');
  await tasksCol.deleteMany({});

  const sampleTasks = [
    {
      taskDate: today,
      taskText: 'Verify Phase 2 Gondola tickets for TRV-1001 (Rahul Sharma)',
      completed: true,
      createdAt: new Date(),
    },
    {
      taskDate: today,
      taskText: 'Reconfirm Houseboat dinner preference (Vegetarian) for Dal Lake arrival',
      completed: true,
      createdAt: new Date(),
    },
    {
      taskDate: today,
      taskText: 'Brief driver Bashir for Sonamarg union cab transfer at Zero Point checkpoint',
      completed: false,
      createdAt: new Date(),
    },
    {
      taskDate: today,
      taskText: 'Collect balance ₹40,000 from TRV-1001 via UPI/Bank transfer before Day 3 checkout',
      completed: false,
      createdAt: new Date(),
    },
  ];

  await tasksCol.insertMany(sampleTasks);
  console.log(`Seeded ${sampleTasks.length} daily operational tasks!`);

  await mongoose.disconnect();
  console.log('Database seeding finished successfully!');
}

seed().catch((err) => {
  console.error('Seed error:', err);
  process.exit(1);
});

