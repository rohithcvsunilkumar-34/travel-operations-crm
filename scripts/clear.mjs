// scripts/clear.mjs
import mongoose from 'mongoose';

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/travel_operations_crm';

async function clearDatabase() {
  try {
    console.log('Connecting to MongoDB:', MONGODB_URI);
    await mongoose.connect(MONGODB_URI);
    await mongoose.connection.db.dropDatabase();
    console.log('✅ Database travel_operations_crm has been cleared completely!');
  } catch (error) {
    console.error('Error clearing database:', error.message);
  } finally {
    await mongoose.disconnect();
    process.exit(0);
  }
}

clearDatabase();

