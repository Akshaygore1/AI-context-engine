import { createApp } from "./app.js";
import { database, seedDatabase } from "./db/database.js";
import { config } from "./config.js";

seedDatabase();
const server = createApp().listen(config.port, () => console.info(`Context engine listening on http://localhost:${config.port}`));

const shutdown = () => server.close(() => { database.close(); process.exit(0); });
process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);
