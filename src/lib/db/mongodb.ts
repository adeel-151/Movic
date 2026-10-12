import { MongoClient, Db, ServerApiVersion } from 'mongodb';

declare global {
  // eslint-disable-next-line no-var
  var _mongoClientPromise: Promise<MongoClient> | undefined;
}

const uri = process.env.MONGODB_URI;
const dbName = process.env.MONGODB_DB || 'movic';

/**
 * Safely masks credentials in MongoDB connection string for structured logging
 */
export function maskMongoUri(rawUri?: string): string {
  if (!rawUri) return 'undefined';
  return rawUri.replace(/\/\/[^:]+:[^@]+@/, '//***:***@');
}

let clientPromise: Promise<MongoClient> | null = null;

if (uri) {
  const options = {
    serverApi: {
      version: ServerApiVersion.v1,
      strict: true,
      deprecationErrors: true,
    },
    maxPoolSize: 10,
    serverSelectionTimeoutMS: 5000,
    connectTimeoutMS: 10000,
  };

  if (process.env.NODE_ENV === 'development') {
    // In development mode, use a global variable so connection is preserved across HMR
    if (!globalThis._mongoClientPromise) {
      const client = new MongoClient(uri, options);
      globalThis._mongoClientPromise = client.connect();
    }
    clientPromise = globalThis._mongoClientPromise;
  } else {
    // In serverless / production mode, cache client promise at module level
    const client = new MongoClient(uri, options);
    clientPromise = client.connect();
  }
}

/**
 * Retrieves the cached MongoClient promise or null if MONGODB_URI is unconfigured
 */
export async function getMongoClient(): Promise<MongoClient | null> {
  if (!uri || !clientPromise) {
    return null;
  }
  try {
    const client = await clientPromise;
    return client;
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    console.error('[MongoDB Connection Error] Failed to connect to MongoDB Atlas:', message);
    return null;
  }
}

/**
 * Retrieves the connected Db instance or null if unconfigured/unreachable
 */
export async function getMongoDb(): Promise<Db | null> {
  const client = await getMongoClient();
  if (!client) {
    return null;
  }
  try {
    return client.db(dbName);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    console.error('[MongoDB Db Error] Failed to obtain database instance:', message);
    return null;
  }
}

/**
 * Health-check helper for diagnostics
 */
export async function verifyMongoConnectivity(): Promise<{ connected: boolean; error?: string }> {
  if (!uri) {
    return {
      connected: false,
      error: 'MONGODB_URI is not configured in environment variables. Configure MONGODB_URI in Vercel project settings.',
    };
  }
  try {
    const db = await getMongoDb();
    if (!db) {
      return { connected: false, error: 'Could not obtain database handle from MongoClient.' };
    }
    await db.command({ ping: 1 });
    return { connected: true };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    return { connected: false, error: message };
  }
}
