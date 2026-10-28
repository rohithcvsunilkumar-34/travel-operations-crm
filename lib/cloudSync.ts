import mongoose from 'mongoose';

const ATLAS_URI = process.env.MONGODB_ATLAS_URI;

interface AtlasCache {
  conn: mongoose.Connection | null;
  promise: Promise<mongoose.Connection> | null;
}

declare global {
  // eslint-disable-next-line no-var
  var atlasCache: AtlasCache | undefined;
}

const cached: AtlasCache = global.atlasCache ?? { conn: null, promise: null };
global.atlasCache = cached;

export async function getAtlasConnection(): Promise<mongoose.Connection | null> {
  if (!ATLAS_URI) return null;
  if (cached.conn && cached.conn.readyState === 1) return cached.conn;

  if (!cached.promise) {
    cached.promise = mongoose
      .createConnection(ATLAS_URI, {
        bufferCommands: false,
        serverSelectionTimeoutMS: 5000,
      })
      .asPromise()
      .then((conn) => {
        cached.conn = conn;
        return conn;
      })
      .catch((err) => {
        cached.promise = null;
        console.warn('⚠️ MongoDB Atlas not reachable (offline or invalid URI):', err.message);
        return null as unknown as mongoose.Connection;
      });
  }

  const conn = await cached.promise;
  if (!conn || conn.readyState !== 1) {
    cached.promise = null;
    return null;
  }
  return conn;
}

/**
 * Non-blocking dual-write sync to MongoDB Atlas.
 * If internet is disconnected or Atlas URI is not configured, it fails gracefully
 * so local operations continue with 100% reliability.
 */
export async function syncToCloud(
  collectionName: 'packages' | 'vehiclelogs' | 'dailytasks',
  operation: 'insert' | 'update' | 'delete',
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  data: any
) {
  if (!ATLAS_URI) return;

  try {
    const atlas = await getAtlasConnection();
    if (!atlas) return;

    const col = atlas.collection(collectionName);

    if (operation === 'insert') {
      const doc = { ...data };
      if (doc._id && typeof doc._id === 'string') {
        doc._id = new mongoose.Types.ObjectId(doc._id);
      }
      await col.updateOne({ _id: doc._id }, { $set: doc }, { upsert: true });
    } else if (operation === 'update') {
      const { _id, ...updateFields } = data;
      const objectId = typeof _id === 'string' ? new mongoose.Types.ObjectId(_id) : _id;
      await col.updateOne({ _id: objectId }, { $set: updateFields });
    } else if (operation === 'delete') {
      const objectId = typeof data === 'string' ? new mongoose.Types.ObjectId(data) : data._id;
      await col.deleteOne({ _id: objectId });
    }
  } catch (err) {
    console.warn(`[CloudSync] Warning: Failed to sync ${operation} on ${collectionName}:`, (err as Error).message);
  }
}

