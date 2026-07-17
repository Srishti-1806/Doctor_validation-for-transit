import { MongoClient, type Db } from "mongodb";

const DB_NAME = "transit_disability";

type MemoryDoc = Record<string, unknown>;
type MemoryCollection = {
  estimatedDocumentCount(): Promise<number>;
  insertMany(docs: MemoryDoc[]): Promise<{ insertedCount: number }>;
  createIndex(index: Record<string, 1>, options?: { unique?: boolean }): Promise<void>;
  findOne(filter: MemoryDoc, options?: { projection?: Record<string, 0 | 1> }): Promise<MemoryDoc | null>;
  insertOne(doc: MemoryDoc): Promise<{ insertedId: string }>;
};

type MemoryDb = {
  collection(name: string): MemoryCollection;
};

const memoryStore = new Map<string, MemoryDoc[]>();

// Cache the client across invocations to avoid connection storms.
let clientPromise: Promise<MongoClient> | null = null;

function createMemoryCollection(name: string): MemoryCollection {
  const docs = memoryStore.get(name) ?? [];
  if (!memoryStore.has(name)) {
    memoryStore.set(name, docs);
  }

  return {
    async estimatedDocumentCount() {
      return docs.length;
    },
    async insertMany(newDocs) {
      docs.push(...newDocs);
      return { insertedCount: newDocs.length };
    },
    async createIndex() {
      return undefined;
    },
    async findOne(filter) {
      return (
        docs.find((doc) => Object.entries(filter).every(([key, value]) => doc[key] === value)) ?? null
      );
    },
    async insertOne(doc) {
      docs.push(doc);
      return { insertedId: `${name}-${docs.length}` };
    },
  };
}

function createMemoryDb(): MemoryDb {
  return {
    collection(name: string) {
      return createMemoryCollection(name);
    },
  };
}

export function getMongoClient(): Promise<MongoClient> {
  if (!clientPromise) {
    const uri = process.env.MONGODB_URI;
    if (!uri) {
      throw new Error("MONGODB_URI is not configured");
    }
    const client = new MongoClient(uri);
    clientPromise = client.connect().catch((err) => {
      clientPromise = null;
      throw err;
    });
  }
  return clientPromise;
}

export async function getDb(): Promise<Db | MemoryDb> {
  if (!process.env.MONGODB_URI) {
    return createMemoryDb();
  }

  try {
    const client = await getMongoClient();
    return client.db(DB_NAME);
  } catch (error) {
    console.warn("MongoDB unavailable, using in-memory fallback", error);
    return createMemoryDb();
  }
}
