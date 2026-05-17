import { z } from "zod";
import { router, publicProcedure } from "../trpc.js";
import { createRoomStore } from "../rooms/roomStore.js";
import type { WsHub } from "../wsHub.js";

const seatIdSchema = z.enum(["north", "east", "south", "west"]);

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
}) {
  const { roomStore, wsHub } = input;

  return router({
    listRooms: publicProcedure.query(() => {
      return roomStore.listRooms();
    }),

    createRoom: publicProcedure
      .input(
        z.object({
          displayName: z.string().optional()
        })
      )
      .mutation(({ input }) => {
        return roomStore.createRoom(input);
      }),

    joinRoom: publicProcedure
      .input(
        z.object({
          code: z.string(),
          displayName: z.string().optional()
        })
      )
      .mutation(({ input }) => {
        return roomStore.joinRoom(input);
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
