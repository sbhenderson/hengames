import { z } from "zod";
import { GAME_CATALOG, type GameId } from "@hengames/shared";
import { router, publicProcedure } from "../trpc.js";
import { createRoomStore } from "../rooms/roomStore.js";
import type { ProfileStore } from "../profiles/profileStore.js";
import type { SoloStore } from "../solo/soloStore.js";
import type { WsHub } from "../wsHub.js";

const seatIdSchema = z.enum(["north", "east", "south", "west"]);
const roomOptionsSchema = z.object({
  deckCount: z.number().int().min(2).max(8)
});
const avatarSchema = z.object({
  emoji: z.string().min(1),
  color: z.string().regex(/^#[0-9a-fA-F]{6}$/)
});

const gameIdSchema = z.enum(
  GAME_CATALOG.map((game) => game.id) as [GameId, ...GameId[]]
);

const soloActionSchema = z.discriminatedUnion("type", [
  z.object({ type: z.literal("play"), cardId: z.string() }),
  z.object({ type: z.literal("draw") })
]);

const actionSchema = z.discriminatedUnion("type", [
  z.object({ type: z.literal("draw") }),
  z.object({
    type: z.literal("meld"),
    cardIds: z.array(z.string()).min(1),
    targetMeldId: z.string().optional()
  }),
  z.object({
    type: z.literal("discard"),
    cardId: z.string()
  })
]);

export function createAppRouter(input: {
  roomStore: ReturnType<typeof createRoomStore>;
  wsHub: WsHub;
  profileStore: ProfileStore;
  soloStore: SoloStore;
}) {
  const { roomStore, wsHub, profileStore, soloStore } = input;

  return router({
    listGames: publicProcedure.query(() => {
      return GAME_CATALOG.map((game) => ({ ...game }));
    }),

    ensureProfile: publicProcedure
      .input(
        z.object({
          profileToken: z.string().optional(),
          displayName: z.string().optional(),
          avatar: avatarSchema.optional()
        })
      )
      .mutation(({ input: request }) => {
        return profileStore.ensureProfile({
          token: request.profileToken,
          displayName: request.displayName,
          avatar: request.avatar
        });
      }),

    getProfile: publicProcedure
      .input(z.object({ profileToken: z.string() }))
      .query(({ input: request }) => {
        return profileStore.getProfile(request.profileToken);
      }),

    updateProfile: publicProcedure
      .input(
        z.object({
          profileToken: z.string(),
          displayName: z.string().optional(),
          avatar: avatarSchema.optional()
        })
      )
      .mutation(({ input: request }) => {
        return profileStore.updateProfile({
          token: request.profileToken,
          displayName: request.displayName,
          avatar: request.avatar
        });
      }),

    listHighScores: publicProcedure
      .input(z.object({ gameId: gameIdSchema, limit: z.number().int().min(1).max(50).optional() }))
      .query(({ input: request }) => {
        return profileStore.listHighScores(request);
      }),

    startSoloGame: publicProcedure
      .input(z.object({ gameId: gameIdSchema, profileToken: z.string() }))
      .mutation(({ input: request }) => {
        return soloStore.startGame(request);
      }),

    getSoloGame: publicProcedure
      .input(z.object({ sessionId: z.string(), profileToken: z.string() }))
      .query(({ input: request }) => {
        return soloStore.getSession(request);
      }),

    soloAction: publicProcedure
      .input(
        z.object({
          sessionId: z.string(),
          profileToken: z.string(),
          action: soloActionSchema
        })
      )
      .mutation(({ input: request }) => {
        return soloStore.applyAction(request);
      }),

    collectSoloPoints: publicProcedure
      .input(z.object({ sessionId: z.string(), profileToken: z.string() }))
      .mutation(({ input: request }) => {
        return soloStore.collect(request);
      }),

    listRooms: publicProcedure.query(() => {
      return roomStore.listRooms();
    }),

    createRoom: publicProcedure
      .input(
        z.object({
          displayName: z.string().optional(),
          avatar: avatarSchema.optional(),
          options: roomOptionsSchema.partial().optional()
        })
      )
      .mutation(({ input }) => {
        return roomStore.createRoom(input);
      }),

    joinRoom: publicProcedure
      .input(
        z.object({
          code: z.string(),
          displayName: z.string().optional(),
          avatar: avatarSchema.optional()
        })
      )
      .mutation(({ input }) => {
        const joined = roomStore.joinRoom(input);
        wsHub.broadcastRoom(input.code, roomStore);
        return joined;
      }),

    updateAvatar: publicProcedure
      .input(
        z.object({
          code: z.string(),
          participantToken: z.string(),
          avatar: avatarSchema
        })
      )
      .mutation(({ input }) => {
        const snapshot = roomStore.updateAvatar({
          code: input.code,
          token: input.participantToken,
          avatar: input.avatar
        });
        wsHub.broadcastRoom(input.code, roomStore);
        return snapshot;
      }),

    getRoom: publicProcedure
      .input(
        z.object({
          code: z.string(),
          participantToken: z.string().optional()
        })
      )
      .query(({ input, ctx }) => {
        const token = input.participantToken ?? ctx.participantToken;
        return roomStore.getSnapshot({ code: input.code, token });
      }),

    chooseSeat: publicProcedure
      .input(
        z.object({
          code: z.string(),
          seatId: seatIdSchema,
          participantToken: z.string()
        })
      )
      .mutation(({ input }) => {
        const snapshot = roomStore.chooseSeat({
          code: input.code,
          token: input.participantToken,
          seatId: input.seatId
        });
        wsHub.broadcastRoom(input.code, roomStore);
        return snapshot;
      }),

    setReady: publicProcedure
      .input(
        z.object({
          code: z.string(),
          ready: z.boolean(),
          participantToken: z.string()
        })
      )
      .mutation(({ input }) => {
        const snapshot = roomStore.setReady({
          code: input.code,
          token: input.participantToken,
          ready: input.ready
        });
        wsHub.broadcastRoom(input.code, roomStore);
        return snapshot;
      }),

    resetLobby: publicProcedure
      .input(
        z.object({
          code: z.string(),
          participantToken: z.string()
        })
      )
      .mutation(({ input }) => {
        const snapshot = roomStore.resetLobby(input);
        wsHub.broadcastRoom(input.code, roomStore);
        return snapshot;
      }),

    kickParticipant: publicProcedure
      .input(
        z.object({
          code: z.string(),
          participantToken: z.string(),
          targetParticipantId: z.string()
        })
      )
      .mutation(({ input }) => {
        const snapshot = roomStore.kickParticipant(input);
        wsHub.broadcastRoom(input.code, roomStore);
        return snapshot;
      }),

    startGame: publicProcedure
      .input(
        z.object({
          code: z.string(),
          participantToken: z.string()
        })
      )
      .mutation(({ input }) => {
        const snapshot = roomStore.startGame({
          code: input.code,
          token: input.participantToken
        });
        wsHub.broadcastRoom(input.code, roomStore);
        return snapshot;
      }),

    gameAction: publicProcedure
      .input(
        z.object({
          code: z.string(),
          action: actionSchema,
          participantToken: z.string()
        })
      )
      .mutation(({ input }) => {
        const snapshot = roomStore.applyGameAction({
          code: input.code,
          token: input.participantToken,
          action: input.action
        });
        wsHub.broadcastRoom(input.code, roomStore);
        return snapshot;
      })
  });
}

export type AppRouter = ReturnType<typeof createAppRouter>;
