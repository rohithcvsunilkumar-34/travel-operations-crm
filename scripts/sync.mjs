// scripts/sync.mjs
import mongoose from 'mongoose';
import fs from 'fs';
import path from 'path';

// Automatically load .env.local if present
try {
  const envPath = path.resolve(process.cwd(), '.env.local');
  if (fs.existsSync(envPath)) {
    const envContent = fs.readFileSync(envPath, 'utf8');
    for (const line of envContent.split('\n')) {
      const trimmed = line.trim();
      if (trimmed && !trimmed.startsWith('#') && trimmed.includes('=')) {
        const [key, ...values] = trimmed.split('=');
        const val = values.join('=').trim().replace(/^['"]|['"]$/g, '');
        if (!process.env[key.trim()]) {
          process.env[key.trim()] = val;
        }
      }
    }
  }
} catch {
  // ignore
}

const LOCAL_URI = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/travel_operations_crm';
const ATLAS_URI = process.env.MONGODB_ATLAS_URI;

async function runSync() {
  const mode = process.argv[2] || 'status'; // 'status', 'push', or 'pull'

  if (!ATLAS_URI) {
    console.error('\n❌ MONGODB_ATLAS_URI is not set in your .env.local file.');
    console.log('👉 Open .env.local and add your MongoDB Atlas connection string:');
    console.log('   MONGODB_ATLAS_URI=mongodb+srv://<user>:<password>@cluster0.xxxx.mongodb.net/travel_operations_crm?retryWrites=true&w=majority\n');
    process.exit(1);
  }

  console.log(`\n==================================================`);
  console.log(`🔍 HYBRID MONGODB VERIFICATION & SYNC TOOL`);
  console.log(`==================================================`);
  console.log(`💻 Local Target : ${LOCAL_URI}`);
  console.log(`☁️  Cloud Target : ${ATLAS_URI.replace(/:([^@]+)@/, ':****@')}`);
  console.log(`--------------------------------------------------`);

  console.log('⏳ Connecting to Local and Cloud databases...');
  const localConn = await mongoose.createConnection(LOCAL_URI, {
    bufferCommands: false,
    serverSelectionTimeoutMS: 5000,
  }).asPromise();

  const atlasConn = await mongoose.createConnection(ATLAS_URI, {
    bufferCommands: false,
    serverSelectionTimeoutMS: 5000,
  }).asPromise();

  console.log('✅ Both connections established successfully!\n');

  const collections = ['packages', 'vehiclelogs', 'dailytasks'];

  if (mode === 'status') {
    console.log('📊 Side-by-Side Data Comparison:');
    console.log('--------------------------------------------------');
    let allInSync = true;

    for (const col of collections) {
      const localDocs = await localConn.collection(col).find({}, { projection: { _id: 1, guestName: 1, taskText: 1 } }).toArray();
      const cloudDocs = await atlasConn.collection(col).find({}, { projection: { _id: 1, guestName: 1, taskText: 1 } }).toArray();

      const localIds = new Set(localDocs.map((d) => d._id.toString()));
      const cloudIds = new Set(cloudDocs.map((d) => d._id.toString()));

      const match = localDocs.length === cloudDocs.length && [...localIds].every((id) => cloudIds.has(id));
      if (!match) allInSync = false;

      const statusIcon = match ? '✅ IDENTICAL' : '⚠️ DIFFERENCE';
      console.log(` • Collection: ${col.toUpperCase()}`);
      console.log(`   - Local count : ${localDocs.length}`);
      console.log(`   - Cloud count : ${cloudDocs.length}`);
      console.log(`   - Status      : ${statusIcon}`);

      if (!match) {
        const missingInCloud = localDocs.filter((d) => !cloudIds.has(d._id.toString()));
        const missingInLocal = cloudDocs.filter((d) => !localIds.has(d._id.toString()));
        if (missingInCloud.length > 0) {
          console.log(`   👉 ${missingInCloud.length} record(s) on Local but NOT in Cloud yet.`);
        }
        if (missingInLocal.length > 0) {
          console.log(`   👉 ${missingInLocal.length} record(s) on Cloud but NOT in Local yet.`);
        }
      }
      console.log('');
    }

    console.log('--------------------------------------------------');
    if (allInSync) {
      console.log('🎉 RESULT: LOCAL AND CLOUD DATABASES ARE 100% IN SYNC!');
    } else {
      console.log('ℹ️  Tip: Run "npm run sync:up" to push local changes to Cloud,');
      console.log('         or run "npm run sync:down" to pull cloud data to Local.');
    }
    console.log('==================================================\n');
  } else if (mode === 'push') {
    console.log('🚀 Pushing all data from LOCAL -> CLOUD (Atlas)...');
    for (const col of collections) {
      const localDocs = await localConn.collection(col).find().toArray();
      let synced = 0;
      for (const doc of localDocs) {
        await atlasConn.collection(col).updateOne({ _id: doc._id }, { $set: doc }, { upsert: true });
        synced++;
      }
      console.log(` • ${col.padEnd(14)}: Synced ${synced} documents to Atlas.`);
    }
    console.log('\n🎉 Local data successfully mirrored to Cloud Atlas!');
  } else if (mode === 'pull') {
    console.log('📥 Pulling all data from CLOUD (Atlas) -> LOCAL...');
    for (const col of collections) {
      const cloudDocs = await atlasConn.collection(col).find().toArray();
      let synced = 0;
      for (const doc of cloudDocs) {
        await localConn.collection(col).updateOne({ _id: doc._id }, { $set: doc }, { upsert: true });
        synced++;
      }
      console.log(` • ${col.padEnd(14)}: Restored ${synced} documents to Local MongoDB.`);
    }
    console.log('\n🎉 Cloud data successfully restored to Local MongoDB!');
  }

  await localConn.close();
  await atlasConn.close();
  process.exit(0);
}

runSync().catch((err) => {
  console.error('\n❌ Verification failed:', err.message);
  process.exit(1);
});
