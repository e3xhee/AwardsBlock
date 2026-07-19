import { createApp } from "./app.js";
import { initializeDatabase, openDatabase } from "./database/connection.js";

const port = Number(process.env.API_PORT ?? 4000);
const database = openDatabase();

initializeDatabase(database);

const app = createApp({ database });

app.listen(port, () => {
  console.log(`AwardBlock API listening on port ${port}`);
});
