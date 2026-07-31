import http from "node:http";
import { existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import cors from "cors";
import express from "express";
import { createExpressMiddleware } from "@trpc/server/adapters/express";
import { createRoomStore } from "./rooms/roomStore.js";
import { createProfileStore } from "./profiles/profileStore.js";
import { createSoloStore } from "./solo/soloStore.js";
import { createAppRouter } from "./routers/appRouter.js";
import { createWsHub } from "./wsHub.js";

export type ServerOptions = {
  staticAssetsDir?: string;
  roomStore?: ReturnType<typeof createRoomStore>;
  profileStore?: ReturnType<typeof createProfileStore>;
  soloStore?: ReturnType<typeof createSoloStore>;
};

export function createHttpServer(options: ServerOptions = {}) {
  const app = express();
  const server = http.createServer(app);
  const roomStore = options.roomStore ?? createRoomStore();
  const profileStore = options.profileStore ?? createProfileStore();
  const soloStore = options.soloStore ?? createSoloStore({ profileStore });
  const wsHub = createWsHub(server);
  const appRouter = createAppRouter({ roomStore, wsHub, profileStore, soloStore });
  const cleanupInterval = setInterval(() => {
    roomStore.closeInactiveRooms({ activeCodes: wsHub.getActiveRoomCodes() });
    soloStore.closeInactiveSessions();
  }, 60_000);
  cleanupInterval.unref?.();
  server.on("close", () => {
    clearInterval(cleanupInterval);
  });

  app.use(cors({ origin: true }));
  app.use(
    "/trpc",
    createExpressMiddleware({
      router: appRouter,
      createContext: ({ req }) => ({
        participantToken: req.headers.authorization?.replace(/^Bearer\s+/i, ""),
      }),
    }),
  );

  app.get("/health", (_req, res) => {
    res.json({ ok: true });
  });

  const staticAssetsDir =
    options.staticAssetsDir ??
    process.env.STATIC_ASSETS_DIR ??
    fileURLToPath(new URL("./public", import.meta.url));
  const indexPath = path.join(staticAssetsDir, "index.html");
  if (existsSync(indexPath)) {
    app.use(express.static(staticAssetsDir));
    app.get(/.*/, (_req, res) => {
      res.sendFile(indexPath);
    });
  }

  return server;
}

const port = Number(process.env.PORT ?? 3000);
const isEntrypoint = process.argv[1]
  ? import.meta.url === pathToFileURL(process.argv[1]).href
  : false;

if (isEntrypoint) {
  const server = createHttpServer();
  const signals = ["SIGTERM", "SIGINT"];
  const shutdown = async (signal: string) => {
    console.log(`Got signal: ${signal}`);
    process.exit(0);
  };
  signals.forEach((signal) => {
    process.on(signal, shutdown);
  });
  server.listen(port, () => {
    console.log(`hengames server listening on http://localhost:${port}`);
  });
}

export type { AppRouter } from "./routers/appRouter.js";
