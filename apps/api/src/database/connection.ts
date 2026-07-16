import { DatabaseSync } from "node:sqlite";

export function openDatabase(databaseUrl = process.env.DATABASE_URL ?? "file:./data/awardblock.sqlite") {
  const filename = databaseUrl.replace(/^file:/, "");
  return new DatabaseSync(filename);
}
