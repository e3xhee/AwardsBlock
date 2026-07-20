import { initializeDatabase, openDatabase } from "./connection.js";
import { seedDemoData } from "./demoSeed.js";

const database = openDatabase();

try {
  initializeDatabase(database);
  const seed = seedDemoData(database);

  console.log("AwardBlock demo data seeded");
  console.log(`Home: http://localhost:5173/`);
  console.log(`Event: http://localhost:5173/events/${seed.eventId}`);
  console.log(`Project: http://localhost:5173/projects/${seed.projectId}`);
  console.log(`Award: http://localhost:5173/awards/${seed.awardId}`);
  console.log(`Claim invite: http://localhost:5173/claim/${seed.claimInviteToken}`);
  console.log(`Profile: http://localhost:5173/profile/${seed.claimedWallet}`);
} finally {
  database.close();
}
