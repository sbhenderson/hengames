import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterEach, describe, expect, test, vi } from "vitest";
import { createHttpServer } from "./index.js";
import { createRoomStore } from "./rooms/roomStore.js";

const tempDirs: string[] = [];

afterEach(async () => {
  vi.restoreAllMocks();
  await Promise.all(tempDirs.map((dir) => rm(dir, { recursive: true, force: true })));
  tempDirs.length = 0;
});

describe("server hosting", () => {
  test("serves health checks and the built web app from one HTTP server", async () => {
    const staticAssetsDir = await mkdtemp(path.join(tmpdir(), "hengames-web-"));
    tempDirs.push(staticAssetsDir);
    await writeFile(path.join(staticAssetsDir, "index.html"), "<!doctype html><div id=\"root\">hengames</div>");

    const server = createHttpServer({ staticAssetsDir });
    await new Promise<void>((resolve) => server.listen(0, resolve));

    try {
      const address = server.address();
      if (!address || typeof address === "string") {
        throw new Error("Expected server to listen on a random TCP port");
      }
      const baseUrl = `http://127.0.0.1:${address.port}`;

      const health = await fetch(`${baseUrl}/health`);
      expect(health.status).toBe(200);
      await expect(health.json()).resolves.toEqual({ ok: true });

      const appRoute = await fetch(`${baseUrl}/rooms/ABC123`);
      expect(appRoute.status).toBe(200);
      await expect(appRoute.text()).resolves.toContain("hengames");
    } finally {
      await new Promise<void>((resolve, reject) => {
        server.close((error) => (error ? reject(error) : resolve()));
      });
    }
  });

  test("schedules inactive room cleanup and clears it when the server closes", () => {
    const roomStore = createRoomStore();
    const closeInactiveRoomsSpy = vi.spyOn(roomStore, "closeInactiveRooms");
    const unrefSpy = vi.fn();
    const interval = { unref: unrefSpy } as unknown as NodeJS.Timeout;
    const setIntervalSpy = vi.spyOn(global, "setInterval").mockReturnValue(interval);
    const clearIntervalSpy = vi.spyOn(global, "clearInterval").mockImplementation(() => undefined);

    const server = createHttpServer({ staticAssetsDir: "missing-static-assets", roomStore });

    expect(setIntervalSpy).toHaveBeenCalledTimes(1);
    expect(setIntervalSpy.mock.calls[0]?.[1]).toBe(60_000);
    expect(unrefSpy).toHaveBeenCalledTimes(1);

    const cleanup = setIntervalSpy.mock.calls[0]?.[0];
    if (typeof cleanup !== "function") {
      throw new Error("Expected cleanup interval callback to be a function");
    }
    cleanup();

    expect(closeInactiveRoomsSpy).toHaveBeenCalledTimes(1);

    server.emit("close");

    expect(clearIntervalSpy).toHaveBeenCalledWith(interval);
  });
});
