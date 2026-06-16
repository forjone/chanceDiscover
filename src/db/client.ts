import { createClient, type Client } from "@libsql/client";
import { SCHEMA_STATEMENTS, MIGRATIONS } from "./schema";

// Singleton libSQL client. Works with a local file (default) or remote Turso.
let _client: Client | null = null;
let _ready: Promise<void> | null = null;

function buildClient(): Client {
  const url = process.env.DATABASE_URL || "file:./data/miner.db";
  const authToken = process.env.DATABASE_AUTH_TOKEN || undefined;
  return createClient({ url, authToken });
}

export function db(): Client {
  if (!_client) _client = buildClient();
  return _client;
}

// Bootstraps the schema once per process. Safe to call before every query.
export async function ensureSchema(): Promise<void> {
  if (!_ready) {
    _ready = (async () => {
      const client = db();
      for (const stmt of SCHEMA_STATEMENTS) {
        await client.execute(stmt);
      }
      // Apply additive migrations; ignore "duplicate column" on migrated DBs.
      for (const stmt of MIGRATIONS) {
        try {
          await client.execute(stmt);
        } catch (err) {
          if (!/duplicate column/i.test(String((err as Error).message))) throw err;
        }
      }
    })();
  }
  return _ready;
}

// Convenience: run a query after guaranteeing the schema exists.
export async function query(
  sql: string,
  args: (string | number | null)[] = []
) {
  await ensureSchema();
  return db().execute({ sql, args });
}
