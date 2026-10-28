// scripts/backup.mjs
import mongoose from 'mongoose';
import fs from 'fs';
import path from 'path';

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/travel_operations_crm';
const BACKUP_DIR = path.resolve(process.cwd(), 'backups');

async function runBackup() {
  const startTime = Date.now();
  console.log('🔄 Starting TravelOps CRM Database Backup...');
  console.log(`🔌 Target MongoDB: ${MONGODB_URI}`);

  try {
    await mongoose.connect(MONGODB_URI);
    const db = mongoose.connection.db;

    if (!fs.existsSync(BACKUP_DIR)) {
      fs.mkdirSync(BACKUP_DIR, { recursive: true });
    }

    const collections = await db.listCollections().toArray();
    const backupData = {
      meta: {
        exportedAt: new Date().toISOString(),
        databaseName: db.databaseName,
        totalCollections: collections.length,
        collections: {},
      },
      data: {},
    };

    let totalDocs = 0;

    for (const col of collections) {
      const name = col.name;
      // Skip system indexes/collections
      if (name.startsWith('system.')) continue;

      const collection = db.collection(name);
      const docs = await collection.find({}).toArray();
      backupData.data[name] = docs;
      backupData.meta.collections[name] = docs.length;
      totalDocs += docs.length;

      console.log(`  📦 Backed up collection [${name}]: ${docs.length} documents`);
    }

    // Format timestamp: YYYY-MM-DD-HHmm
    const now = new Date();
    const pad = (n) => String(n).padStart(2, '0');
    const timestamp = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}-${pad(now.getHours())}${pad(now.getMinutes())}`;
    const filename = `backup-${timestamp}.json`;
    const targetPath = path.join(BACKUP_DIR, filename);

    fs.writeFileSync(targetPath, JSON.stringify(backupData, null, 2), 'utf-8');
    const sizeKB = (fs.statSync(targetPath).size / 1024).toFixed(2);

    const elapsed = ((Date.now() - startTime) / 1000).toFixed(2);
    console.log('\n===========================================');
    console.log('✅ BACKUP COMPLETED SUCCESSFULLY');
    console.log(`📁 File: backups/${filename} (${sizeKB} KB)`);
    console.log(`📊 Total Documents Saved: ${totalDocs}`);
    console.log(`⏱️  Elapsed Time: ${elapsed}s`);
    console.log('===========================================\n');
  } catch (err) {
    console.error('❌ Database Backup Failed:', err.message);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
  }
}

runBackup();

