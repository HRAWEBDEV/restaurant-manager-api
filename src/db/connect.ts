import { SQL } from "bun";
import type { EmptyRelations } from "drizzle-orm";
import { drizzle, type BunSQLQueryResultHKT } from "drizzle-orm/bun-sql";
import type { PgAsyncTransaction } from "drizzle-orm/pg-core";

if (!process.env.DATABASE_URL!) {
  throw new Error("DATABASE_URL is not defined");
}

const client = new SQL(process.env.DATABASE_URL!);
const db = drizzle({
  client,
  connection: {
    max: 20,
  },
});

async function testConnection() {
  await db.execute("SELECT 1");
}

async function closeConnection() {
  await client.end();
}

type DBExecuter =
  PgAsyncTransaction<BunSQLQueryResultHKT, EmptyRelations> | typeof db;

export type { DBExecuter };
export { db, closeConnection, testConnection };
