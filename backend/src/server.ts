import { createServer } from "node:http";

import { app } from "./app";
import { env } from "./config/env";
import { prisma } from "./config/prisma";

const server = createServer(app);

server.listen(env.PORT, () => {
  console.log(`AssetFlow API listening on http://localhost:${env.PORT}`);
});

async function shutdown(signal: string) {
  console.log(`${signal} received; shutting down`);
  server.close(async (error) => {
    await prisma.$disconnect();
    if (error) {
      console.error(error);
      process.exit(1);
    }
    process.exit(0);
  });
}

process.on("SIGTERM", () => void shutdown("SIGTERM"));
process.on("SIGINT", () => void shutdown("SIGINT"));
