import { createApp } from "./app.js";
import { env } from "./lib/env.js";

createApp().listen(env.port, () => {
  console.log(`TrustLayer API listening on ${env.port}`);
});
