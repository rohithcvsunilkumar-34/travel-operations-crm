import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import { getAtlasConnection } from '@/lib/cloudSync';
import Package from '@/models/Package';
import VehicleLog from '@/models/VehicleLog';
import DailyTask from '@/models/DailyTask';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const isConfigured = Boolean(process.env.MONGODB_ATLAS_URI);
    if (!isConfigured) {
      return NextResponse.json({
        configured: false,
        connected: false,
        message: 'MONGODB_ATLAS_URI not set in .env.local',
      });
    }

    const atlas = await getAtlasConnection();
    if (!atlas) {
      return NextResponse.json({
        configured: true,
        connected: false,
        message: 'Could not connect to MongoDB Atlas (check internet or credentials)',
      });
    }

    const [cloudPkgs, cloudVehs, cloudTasks] = await Promise.all([
      atlas.collection('packages').countDocuments(),
      atlas.collection('vehiclelogs').countDocuments(),
      atlas.collection('dailytasks').countDocuments(),
    ]);

    return NextResponse.json({
      configured: true,
      connected: true,
      cloudCounts: {
        packages: cloudPkgs,
        vehicles: cloudVehs,
        tasks: cloudTasks,
      },
    });
  } catch (error) {
    return NextResponse.json(
      { configured: true, connected: false, error: (error as Error).message },
      { status: 500 }
    );
  }
}

// Push all local data to Cloud or pull from Cloud
export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));
    const direction = body.direction || 'push'; // 'push' (local -> cloud) or 'pull' (cloud -> local)

    await connectDB();
    const atlas = await getAtlasConnection();
    if (!atlas) {
      return NextResponse.json(
        { error: 'MongoDB Atlas is not reachable. Check MONGODB_ATLAS_URI and internet.' },
        { status: 400 }
      );
    }

    if (direction === 'push') {
      // Local -> Cloud
      const [localPkgs, localVehs, localTasks] = await Promise.all([
        Package.find().lean(),
        VehicleLog.find().lean(),
        DailyTask.find().lean(),
      ]);

      for (const p of localPkgs) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        await atlas.collection('packages').updateOne({ _id: p._id as any }, { $set: p }, { upsert: true });
      }
      for (const v of localVehs) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        await atlas.collection('vehiclelogs').updateOne({ _id: v._id as any }, { $set: v }, { upsert: true });
      }
      for (const t of localTasks) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        await atlas.collection('dailytasks').updateOne({ _id: t._id as any }, { $set: t }, { upsert: true });
      }

      return NextResponse.json({
        success: true,
        direction: 'push',
        synced: {
          packages: localPkgs.length,
          vehicles: localVehs.length,
          tasks: localTasks.length,
        },
      });
    } else {
      // Cloud -> Local
      const [cloudPkgs, cloudVehs, cloudTasks] = await Promise.all([
        atlas.collection('packages').find().toArray(),
        atlas.collection('vehiclelogs').find().toArray(),
        atlas.collection('dailytasks').find().toArray(),
      ]);

      for (const p of cloudPkgs) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        await Package.updateOne({ _id: p._id as any }, { $set: p }, { upsert: true });
      }
      for (const v of cloudVehs) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        await VehicleLog.updateOne({ _id: v._id as any }, { $set: v }, { upsert: true });
      }
      for (const t of cloudTasks) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        await DailyTask.updateOne({ _id: t._id as any }, { $set: t }, { upsert: true });
      }

      return NextResponse.json({
        success: true,
        direction: 'pull',
        synced: {
          packages: cloudPkgs.length,
          vehicles: cloudVehs.length,
          tasks: cloudTasks.length,
        },
      });
    }
  } catch (error) {
    return NextResponse.json({ error: (error as Error).message }, { status: 500 });
  }
}
