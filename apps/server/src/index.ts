import http from "node:http";
import cors from "cors";
import express from "express";
import { createExpressMiddleware } from "@trpc/server/adapters/express";
import { createRoomStore } from "./rooms/roomStore";
import { createAppRouter } from "./routers/appRouter";
import { createWsHub } from "./wsHub";

const app = express();
const server = http.createServer(app);
const roomStore = createRoomStore();
const wsHub = createWsHub(server);
const appRouter = createAppRouter({ roomStore, wsHub });

app.use(cors({ origin: true }));
app.use(
  "/trpc",
  createExpressMiddleware({
    router: appRouter,
    createContext: ({ req }) => ({
      participantToken: req.headers.authorization?.replace(/^Bearer\s+/i, "")
    })
  })
);

app.get("/health", (_req, res) => {
  res.json({ ok: true });
});

const port = Number(process.env.PORT ?? 3000);

server.listen(port, () => {
  console.log(`hengames server listening on http://localhost:${port}`);
});

export type { AppRouter } from "./routers/appRouter";
