import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";

// Detect if running in Cloudflare Workers environment
const isCloudflareWorker =
  typeof globalThis !== "undefined" && "Cloudflare" in globalThis;

// Database instance for Node.js environment
let dbInstance: ReturnType<typeof drizzle> | null = null;

export function db() {
  try {
    const databaseUrl = process.env.DATABASE_URL;
    console.log("db(): attempting to get database connection", { 
      hasDatabaseUrl: !!databaseUrl,
      isCloudflareWorker 
    });
    
    if (!databaseUrl) {
      console.error("db(): DATABASE_URL is not set");
      throw new Error("DATABASE_URL is not set");
    }

    // In Cloudflare Workers, create new connection each time
    if (isCloudflareWorker) {
      console.log("db(): creating new connection for Cloudflare Workers");
      // Workers environment uses minimal configuration
      const client = postgres(databaseUrl, {
        prepare: false,
        max: 1, // Limit to 1 connection in Workers
        idle_timeout: 10, // Shorter timeout for Workers
        connect_timeout: 5,
      });

      const drizzleInstance = drizzle(client);
      console.log("db(): Cloudflare Workers connection created successfully");
      return drizzleInstance;
    }

    // In Node.js environment, use singleton pattern
    if (dbInstance) {
      console.log("db(): returning existing Node.js database instance");
      return dbInstance;
    }

    console.log("db(): creating new Node.js database connection");
    // Node.js environment with connection pool configuration
    const client = postgres(databaseUrl, {
      prepare: false,
      max: 10, // Maximum connections in pool
      idle_timeout: 30, // Idle connection timeout (seconds)
      connect_timeout: 10, // Connection timeout (seconds)
    });
    dbInstance = drizzle({ client });
    
    console.log("db(): Node.js database connection created successfully");
    return dbInstance;
  } catch (e) {
    console.error("db(): failed to create database connection:", e);
    console.error("db(): error details", {
      errorMessage: e instanceof Error ? e.message : 'Unknown error',
      errorStack: e instanceof Error ? e.stack : 'No stack trace'
    });
    throw e;
  }
}
