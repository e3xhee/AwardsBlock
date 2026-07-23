import { mkdirSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { DatabaseSync } from "node:sqlite";
import { fileURLToPath } from "node:url";

const defaultMigrationPath = join(
  dirname(fileURLToPath(import.meta.url)),
  "../../migrations/001_initial_schema.sql"
);

type TableColumnRow = {
  name: string;
};

export function openDatabase(databaseUrl = process.env.DATABASE_URL ?? "file:./data/awardblock.sqlite") {
  const filename = databaseUrl.replace(/^file:/, "");

  if (filename !== ":memory:") {
    mkdirSync(dirname(filename), { recursive: true });
  }

  const database = new DatabaseSync(filename);
  database.exec("PRAGMA foreign_keys = ON");
  return database;
}

export function initializeDatabase(
  database: DatabaseSync,
  migrationPath = defaultMigrationPath
): void {
  database.exec("PRAGMA foreign_keys = ON");
  database.exec(readFileSync(migrationPath, "utf8"));
  ensureProjectSubmitterWallet(database);
}

function ensureProjectSubmitterWallet(database: DatabaseSync): void {
  const projectColumns = database
    .prepare("PRAGMA table_info(projects)")
    .all() as TableColumnRow[];
  const hasSubmitterWallet = projectColumns.some((column) => column.name === "submitter_wallet");

  if (hasSubmitterWallet) {
    return;
  }

  database.exec("ALTER TABLE projects ADD COLUMN submitter_wallet TEXT NOT NULL DEFAULT ''");
  database.exec(`
    UPDATE projects
    SET submitter_wallet = COALESCE(
      (SELECT events.organizer_wallet FROM events WHERE events.id = projects.event_id),
      ''
    )
    WHERE submitter_wallet = ''
  `);
}