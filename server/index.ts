import { createApp } from "./app.js";
import { database, seedDatabase } from "./db/database.js";
import { config } from "./config.js";

seedDatabase();
const server = createApp().listen(config.port, () => console.info(`Context engine listening on http://localhost:${config.port}`));

let shuttingDown = false;
const shutdown = () => {
  if (shuttingDown) return;
  shuttingDown = true;
  const forceExit = setTimeout(() => { database.close(); process.exit(1); }, 5_000);
  forceExit.unref();
  server.close(() => { clearTimeout(forceExit); database.close(); process.exit(0); });
};
process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);
