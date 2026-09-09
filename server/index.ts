import { createApp } from "./app.js";
import { config } from "./config.js";

createApp().listen(config.port, () =>
  console.info(`Context engine listening on http://localhost:${config.port}`),
);
