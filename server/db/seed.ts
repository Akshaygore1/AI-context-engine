import { database, seedDatabase } from "./database.js";

seedDatabase();
console.log("Seeded demo data for user_101.");
database.close();
